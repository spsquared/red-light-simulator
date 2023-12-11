// barbaric javascript
class LightRenderer {
    #CANVAS;
    #CTX;
    #ADAPTER;
    #GPU;
    #config = {
        precision: 4, // how many divisions of a degree should be made
        accuracy: 16, // how many rays should be sent for each angle
        vertexAllocation: 64, // how many vertices are allocated per ray (change to dynamic sizing with hard cap later?)
        maxSources: 8 // how many sources of light that can exist at a time
    };
    #ready = false;
    #resources = {
        computeModule: null,
        renderModule: null,
        computePipeline: null,
        renderPipeline: null,
        vertexBufferLayout: {
            arrayStride: 8,
            attributes: [
                {
                    shaderLocation: 0,
                    format: 'uint16x2',
                    offset: 0
                },
                {
                    shaderLocation: 1,
                    format: 'uint8x4',
                    offset: 4
                }
            ],
            stepMode: 'vertex'
        },
        buffers: {
            grid: null,
            sources: null,
            vertices: null,
        },
        bufferArrays: {
            grid: null,
            sources: null,
            vertices: null
        },
        computeBindGroupLayout: null,
        renderBindGroupLayout: null,
        computeBindGroup: null,
        renderBindGroup: null,
        computeWorkgroupSize: 0,
        vertexCount: 0
    };
    #gridSize = gridSize;

    constructor(canvas) {
        this.#CANVAS = canvas;
        this.#CTX = canvas.getContext('webgpu');
        let getGPU = async () => {
            this.#ADAPTER = await navigator.gpu?.requestAdapter();
            this.#GPU = await this.#ADAPTER?.requestDevice();
            if (this.#GPU == undefined) modal('<span style="color: red;">WebGPU not supported!<span>', '<span style="color: red;">Red Light Simulator needs WebGPU to run!<span>');
            this.#CTX.configure({
                device: this.#GPU,
                format: navigator.gpu.getPreferredCanvasFormat()
            });
            // create shader modules
            this.#resources.computeModule = this.#GPU.createShaderModule({
                label: 'Light compute shader',
                code: await (await fetch('./rayComputeShader.wgsl')).text()
            });
            this.#resources.renderModule = this.#GPU.createShaderModule({
                label: 'Light render shader',
                code: await (await fetch('./lineShader.wgsl')).text()
            });
            await this.#createPipelines();
            this.#ready = true;
        };
        getGPU();
    }

    async #createPipelines() {
        this.#resources.vertexCount = 360 * this.#config.maxSources * this.#config.vertexAllocation * this.#config.accuracy * this.#config.precision;
        // create buffers
        this.#resources.bufferArrays.grid = new Uint8ClampedArray(this.#gridSize ** 2);
        this.#resources.bufferArrays.sources = new Uint16Array(this.#config.maxSources * 2); // limited to max 64 sources
        this.#resources.bufferArrays.vertices = new BigUint64Array(this.#resources.vertexCount); // inefficient
        this.#resources.buffers.grid = this.#GPU.createBuffer({
            label: 'Grid buffer',
            size: this.#resources.bufferArrays.grid.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.#resources.buffers.sources = this.#GPU.createBuffer({
            label: 'Light source buffer',
            size: this.#resources.bufferArrays.sources.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.#resources.buffers.vertices = this.#GPU.createBuffer({
            label: 'Light vertices',
            size: this.#resources.bufferArrays.vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        });
        // bind buffers
        this.#resources.computeBindGroupLayout = this.#GPU.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage'
                    }
                },
                {
                    binding: 1,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'read-only-storage'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'storage'
                    }
                }
            ]
        });
        this.#resources.computeBindGroup = this.#GPU.createBindGroup({
            label: 'Render bind group',
            layout: this.#resources.computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.#resources.buffers.grid } },
                { binding: 1, resource: { buffer: this.#resources.buffers.sources } },
                { binding: 2, resource: { buffer: this.#resources.buffers.vertices } }
            ]
        });
        this.#resources.renderBindGroupLayout = this.#GPU.createBindGroupLayout({
            entries: [
                {
                    binding: 0,
                    visibility: GPUShaderStage.VERTEX,
                    buffer: {
                        type: 'read-only-storage'
                    }
                }
            ]
        });
        this.#resources.renderBindGroup = this.#GPU.createBindGroup({
            label: 'Render bind group',
            layout: this.#resources.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.#resources.buffers.vertices } },
            ]
        });
        // create pipelines
        this.#resources.computePipeline = this.#GPU.createComputePipeline({
            label: 'Light compute pipeline',
            layout: this.#GPU.createPipelineLayout({
                bindGroupLayouts: [this.#resources.computeBindGroupLayout]
            }),
            compute: {
                module: this.#resources.computeModule,
                entryPoint: 'compute_main',
                constants: {
                    grid_size: this.#gridSize,
                    ray_precision: this.#config.precision,
                    ray_accuracy: this.#config.accuracy,
                    vertex_allocation: this.#config.vertexAllocation
                }
            }
        });
        this.#resources.renderPipeline = this.#GPU.createRenderPipeline({
            label: 'Light render pipeline',
            layout: this.#GPU.createPipelineLayout({
                bindGroupLayouts: [this.#resources.renderBindGroupLayout]
            }),
            vertex: {
                module: this.#resources.renderModule,
                entryPoint: 'vertex_main',
                constants: {},
                buffers: [this.#resources.vertexBufferLayout]
            },
            fragment: {
                module: this.#resources.renderModule,
                entryPoint: 'fragment_main',
                targets: [
                    { format: navigator.gpu.getPreferredCanvasFormat() }
                ]
            },
            primitive: {
                topology: 'line-list'
            },
        });
        this.#resources.computeWorkgroupSize = this.#config.precision * this.#config.accuracy;
    }

    // multiple passes for differnet wavelengths
    async render() {
        if (!this.#ready) return false;
        this.#resources.bufferArrays.grid.set(grid.reduce((f, l) => { f.push(...l); return f; }, []));
        this.#resources.bufferArrays.sources.fill(0);
        this.#resources.bufferArrays.vertices.fill(BigInt(0));
        const lightSources = [10, 10];
        if (lightSources.length == 0) return;
        this.#resources.bufferArrays.sources.set(lightSources);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.grid, 0, this.#resources.bufferArrays.grid);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.sources, 0, this.#resources.bufferArrays.sources);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.vertices, 0, this.#resources.bufferArrays.vertices);
        let len = 16;
        const vertices = new Uint8Array(16 * len); // same as 64-bit int array with length 3
        for (let i = 0; i < len; i++) {
            let j = 16 * i;
            let fdijgjrgfhjukjfdkjfd = Math.round(i / (len - 1) * 65535);
            vertices[j + 0] = fdijgjrgfhjukjfdkjfd;
            vertices[j + 1] = fdijgjrgfhjukjfdkjfd >> 8;
            vertices[j + 2] = 10000;
            vertices[j + 3] = 10000 >> 8;
            vertices[j + 4] = 255;
            vertices[j + 7] = 255;
            vertices[j + 8] = 20000;
            vertices[j + 9] = 20000 >> 8;
            vertices[j + 10] = 5000;
            vertices[j + 11] = 5000 >> 8;
            vertices[j + 14] = 255;
            vertices[j + 15] = 255;
        }
        // console.log(vertices)
        const b = new BigInt64Array(vertices.buffer);
        this.#resources.bufferArrays.vertices.set(b);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.vertices, 0, this.#resources.bufferArrays.vertices);
        const encoder = this.#GPU.createCommandEncoder();
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.#resources.computePipeline);
        computePass.setBindGroup(0, this.#resources.computeBindGroup);
        computePass.dispatchWorkgroups(this.#resources.computeWorkgroupSize, 4, lightSources.length / 2);
        computePass.end();
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.#CTX.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    clearValue: { r: 0, g: 0, b: 0, a: 0 },
                    storeOp: 'store'
                }
            ]
        });
        renderPass.setPipeline(this.#resources.renderPipeline);
        renderPass.setBindGroup(0, this.#resources.renderBindGroup);
        renderPass.setVertexBuffer(0, this.#resources.buffers.vertices);
        renderPass.draw(this.#resources.vertexCount);
        renderPass.end();
        const buhbuffer = this.#GPU.createBuffer({
            label: 'useless buffer',
            size: this.#resources.bufferArrays.vertices.byteLength,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST
        });
        encoder.copyBufferToBuffer(this.#resources.buffers.vertices, 0, buhbuffer, 0, this.#resources.bufferArrays.vertices.byteLength);
        this.#GPU.queue.submit([encoder.finish()]);
        await buhbuffer.mapAsync(GPUMapMode.READ);
        const sadfdsafdsafdsafdsafdsafdsaf = new Uint8Array(buhbuffer.getMappedRange());
        console.log(sadfdsafdsafdsafdsafdsafdsaf);
        buhbuffer.destroy();
    }

    get config() {
        return this.#config;
    }
    get ready() {
        return this.#ready;
    }
}