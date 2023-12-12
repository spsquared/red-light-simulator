// barbaric javascript
class LightRenderer {
    #CANVAS;
    #CTX;
    #ADAPTER;
    #GPU;
    #config = {
        precision: 4, // how many divisions of a degree should be made
        accuracy: 4, // how many rays should be sent for each angle
        vertexAllocation: 64 // how many vertices are allocated per ray (change to dynamic sizing with hard cap later?)
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
            vertices: null,
            params: null
        },
        bufferArrays: {
            grid: null,
            vertices: null,
            params: null
        },
        computeBindGroupLayout: null,
        renderBindGroupLayout: null,
        computeBindGroup: null,
        renderBindGroup: null,
        computeWorkgroupSize: [0, 4, 0],
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
            this.compileShaders();
            this.#ready = true;
        };
        getGPU();
    }

    compileShaders() {
        if (this.#GPU == undefined) return;
        this.#gridSize = gridSize;
        this.#resources.computeWorkgroupSize = [this.#config.precision, 4, this.#config.accuracy];
        this.#resources.vertexCount = 360 * this.#config.vertexAllocation * this.#config.precision * this.#config.accuracy;
        // create buffers
        this.#resources.bufferArrays.grid = new Uint8ClampedArray(this.#gridSize ** 2);
        this.#resources.bufferArrays.vertices = new BigUint64Array(this.#resources.vertexCount); // inefficient
        this.#resources.bufferArrays.params = new Uint32Array(4);
        this.#resources.buffers.grid = this.#GPU.createBuffer({
            label: 'Grid buffer',
            size: this.#resources.bufferArrays.grid.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });
        this.#resources.buffers.vertices = this.#GPU.createBuffer({
            label: 'Light vertices',
            size: this.#resources.bufferArrays.vertices.byteLength,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        this.#resources.buffers.params = this.#GPU.createBuffer({
            label: 'Light params buffer',
            size: this.#resources.bufferArrays.params.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
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
                        type: 'storage'
                    }
                },
                {
                    binding: 2,
                    visibility: GPUShaderStage.COMPUTE,
                    buffer: {
                        type: 'uniform'
                    }
                }
            ]
        });
        this.#resources.computeBindGroup = this.#GPU.createBindGroup({
            label: 'Compute bind group',
            layout: this.#resources.computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.#resources.buffers.grid } },
                { binding: 1, resource: { buffer: this.#resources.buffers.vertices } },
                { binding: 2, resource: { buffer: this.#resources.buffers.params } }
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
                    ray_precision: this.#config.precision,
                    // ray_accuracy: this.#config.accuracy,
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
                topology: 'line-strip',
                stripIndexFormat: 'uint16'
            },
        });
    }

    async render() {
        if (!this.#ready) return false;
        this.#resources.bufferArrays.grid.set(grid.slice(0, this.#gridSize).reduce((f, r) => { f.push(...r.slice(0, this.#gridSize)); return f; }, []));
        this.#resources.bufferArrays.vertices.fill(BigInt(0));
        this.#resources.bufferArrays.params[0] = this.#gridSize;
        const lightSources = grid.slice(0, this.#gridSize).reduce((f, r, y) => {
            f.push(...r.slice(0, this.#gridSize).reduce((l, p, x) => {
                if (p == pixNum.LIGHT_RED) l.push([x, y]);
                return l;
            }, []));
            return f;
        }, []);
        for (let source of lightSources) {
            console.log(source);
            // run a compute/render pair - render is very fast for small amounts of vertices
            // store to texture or something...
            // also have to do multiple compute/render pairs for lights with multiple frequencies
        }
        this.#resources.bufferArrays.params[1] = 0;
        this.#resources.bufferArrays.params[2] = mXGrid;
        this.#resources.bufferArrays.params[3] = mYGrid;
        this.#GPU.queue.writeBuffer(this.#resources.buffers.grid, 0, this.#resources.bufferArrays.grid);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.vertices, 0, this.#resources.bufferArrays.vertices);
        this.#GPU.queue.writeBuffer(this.#resources.buffers.params, 0, this.#resources.bufferArrays.params);
        const encoder = this.#GPU.createCommandEncoder();
        const computePass = encoder.beginComputePass();
        computePass.setPipeline(this.#resources.computePipeline);
        computePass.setBindGroup(0, this.#resources.computeBindGroup);
        computePass.dispatchWorkgroups(...this.#resources.computeWorkgroupSize);
        computePass.end();
        const renderPass = encoder.beginRenderPass({
            colorAttachments: [
                {
                    view: this.#CTX.getCurrentTexture().createView(),
                    loadOp: 'clear',
                    storeOp: 'store',
                    clearValue: { r: 0, g: 0, b: 0, a: 0 }
                }
            ]
        });
        renderPass.setPipeline(this.#resources.renderPipeline);
        renderPass.setBindGroup(0, this.#resources.renderBindGroup);
        renderPass.setVertexBuffer(0, this.#resources.buffers.vertices);
        renderPass.draw(this.#resources.vertexCount);
        renderPass.end();
        this.#GPU.queue.submit([encoder.finish()]);
    }

    get config() {
        return this.#config;
    }
    get ready() {
        return this.#ready;
    }
}