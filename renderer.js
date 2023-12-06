// barbaric javascript
class LightRenderer {
    #CANVAS;
    #CTX;
    #ADAPTER;
    #GPU;
    #renderSettings = class LightRendererConfig {
        // static #updateParentResolutionSettings;
        // static set updateParentResolutionSettings(cb) { this.#updateParentResolutionSettings = cb; }
        static precision = 10; // how many divisions of a degree should be made
        static accuracy = 5; // how many rays should be sent for each angle,
        static #resolution = canvasResolution; // resolution of compute pass
        static set resolution(r) {
            this.#resolution = Math.min(65534, Math.max(Math.floor(r / 2) * r, 2));
            // this.#updateParentResolutionSettings();
        }
        static get resolution() { return this.#resolution; }
        static vertexAllocation = 100;
    };
    #rendering = false;
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
            computeVertices: null,
            vertices: null,
            // renderConfig: null
        },
        bufferArrays: {
            grid: null,
            computeVertices: null,
            vertices: null,
            // renderConfig: null
        },
        computeBindGroupLayout: null,
        renderBindGroupLayout: null,
        computeBindGroup: null,
        renderBindGroup: null
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
            // make buffers (and ways to recreate them)
            this.#resources.bufferArrays.grid = new Uint8ClampedArray(this.#gridSize ** 2);
            this.#resources.bufferArrays.vertices = new BigUint64Array(360 * this.#renderSettings.vertexAllocation * this.#renderSettings.accuracy * this.#renderSettings.precision); // inefficient
            // this.#resources.bufferArrays.renderConfig = new Float32Array(3);
            // let updateRenderconfig = () => {
            //     this.#resources.bufferArrays.renderConfig.set([this.#renderSettings.resolution, 2 / this.#renderSettings.resolution, -this.#renderSettings.resolution / 2]);
            // };
            // this.#renderSettings.updateParentResolutionSettings = updateRenderconfig;
            // updateRenderconfig();
            // this.#resources.buffers.renderConfig = this.#GPU.createBuffer({
            //     label: 'Render config buffer',
            //     size: this.#resources.bufferArrays.renderConfig.byteLength,
            //     usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
            // });
            // create shader modules
            this.#resources.computeModule = this.#GPU.createShaderModule({
                label: 'Light compute shader',
                code: await (await fetch('./rayComputeShader.wgsl')).text()
            });
            this.#resources.renderModule = this.#GPU.createShaderModule({
                label: 'Light render shader',
                code: await (await fetch('./lineShader.wgsl')).text()
            });
            // bind buffers and create pipeline
            this.#createPipelines();
            this.#ready = true;
        };
        getGPU();
    }
    // REMEMBER TO REMOVE COPY_DST FLAG FROM VERTEX BUFFER
    #createPipelines() {
        // create buffers
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
                }
            ]
        });
        this.#resources.computeBindGroup = this.#GPU.createBindGroup({
            label: 'Render bind group',
            layout: this.#resources.computeBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.#resources.buffers.grid } },
                { binding: 1, resource: { buffer: this.#resources.buffers.vertices } }
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
                },
                // {
                //     binding: 1,
                //     visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
                //     buffer: {
                //         type: 'read-only-storage'
                //     }
                // }
            ]
        });
        this.#resources.renderBindGroup = this.#GPU.createBindGroup({
            label: 'Render bind group',
            layout: this.#resources.renderBindGroupLayout,
            entries: [
                { binding: 0, resource: { buffer: this.#resources.buffers.vertices } },
                // { binding: 1, resource: { buffer: this.#resources.buffers.renderConfig } }
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
                    gridSize: this.#gridSize
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
            }
        });
    }

    async #simulateRays() {
        // workgroup group size
        // x value is not used in shader, used to do more passes
        // y and z are useless
        // workgroup size
        // x value is ray angle
        // y and z are useless again
        // probably shouldn't be allocating new buffers every frame but oh well lol
        this.#resources.bufferArrays.grid.set(grid.reduce((f, l) => f.push(...l), []));
        this.#GPU.queue.writeBuffer(this.#resources.buffers.grid, 0, this.#resources.bufferArrays.grid);
        const encoder = this.#GPU.createCommandEncoder();
        const computePass = encoder.beginComputePass({
            // put stuff here
        });
        // do a compute pass, return buffer of vertices
        // 0, 0, is top left, (resolution, resolution) is bottom right
        // vertex stores position, color, intensity
        // use index buffer to chain vertices
        // return 64-bit int array (16 bit x, 16 bit y, 24 bit color (rgb), 8 bit intensity) (will limit max resolution of rays but who cares)
        this.#GPU.queue.submit([encoder.finish()]);
    }
    async #drawRays() {
        // move buffer allocation to constructor
        console.log(this.#resources.bufferArrays.vertices)
        this.#GPU.queue.writeBuffer(this.#resources.buffers.vertices, 0, this.#resources.bufferArrays.vertices);
        // this.#GPU.queue.writeBuffer(this.#resources.buffers.renderConfig, 0, this.#resources.bufferArrays.renderConfig);
        const encoder = this.#GPU.createCommandEncoder();
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
        renderPass.draw(this.#resources.bufferArrays.vertices.byteLength / 8);
        renderPass.end();
        this.#GPU.queue.submit([encoder.finish()]);
    }

    async render() {
        if (this.#rendering || !this.#ready) return false;
        this.#rendering = true;
        // const vertices = this.#simulateRays();
        const vertices = new Uint8Array(24); // same as 64-bit int array with length 3
        // vertex 1
        vertices[0] = 300 >> 8;
        vertices[1] = 300;  // x
        vertices[3] = 300 >> 8;
        vertices[3] = 300;  // y
        vertices[4] = 255;  // r
        vertices[5] = 0;    // g
        vertices[6] = 0;    // b
        vertices[7] = 255;  // a
        // vertex 2
        vertices[8] = 0 >> 8;
        vertices[9] = 0;    // x
        vertices[10] = 0 >> 8;
        vertices[11] = 0;   // y
        vertices[12] = 0;   // r
        vertices[13] = 255; // g
        vertices[14] = 0;   // b
        vertices[15] = 255; // a
        // vertex 3
        vertices[16] = 300 >> 8;
        vertices[17] = 300; // x
        vertices[18] = 0 >> 8;
        vertices[19] = 0;   // y
        vertices[20] = 0;   // r
        vertices[21] = 0;   // g
        vertices[22] = 255; // b
        vertices[23] = 255; // a
        const b = new BigInt64Array(vertices.buffer);
        this.#resources.bufferArrays.vertices.set(b);
        this.#drawRays();
        // wait how do i know if the gpu is done
        // this.#rendering = false;
    }

    get config() {
        return this.#renderSettings;
    }
    get rendering() {
        return this.#rendering;
    }
    get ready() {
        return this.#ready;
    }
}