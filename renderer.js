// barbaric javascript
class LightRenderer {
    #CANVAS;
    #CTX;
    #ADAPTER;
    #GPU;
    #renderSettings = class LightRendererConfig {
        static precision = 10; // how many divisions of a degree should be made
        static accuracy = 5; // how many rays should be sent for each angle,
        static #resolution = canvasResolution; // resolution of compute pass
        static set resolution(r) {
            this.#resolution = Math.min(65534, Math.max(Math.floor(r / 2) * r, 2));
        }
        static get resolution() { return this.#resolution; }
    };
    #rendering = false;
    #ready = false;
    #vertexBufferLayout = {
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
    };
    #computeModule;
    #renderModule;
    #renderPipeline;

    constructor(canvas) {
        this.#CANVAS = canvas;
        this.#CTX = canvas.getContext('webgpu');
        let getGPU = async () => {
            this.#ADAPTER = await navigator.gpu?.requestAdapter();
            this.#GPU = await this.#ADAPTER?.requestDevice();
            if (this.#GPU == undefined) modal('<span style="color: red;">WebGPU not supported!<span>', '<span style="color: red;">Red Light Simulator needs WebGPU to run!<span>');
            const cformat = navigator.gpu.getPreferredCanvasFormat();
            this.#CTX.configure({
                device: this.#GPU,
                format: cformat
            });
            this.#renderModule = this.#GPU.createShaderModule({
                label: 'Light render shader',
                code: await (await fetch('./lineShader.wgsl')).text()
            });
            this.#renderPipeline = this.#GPU.createRenderPipeline({
                label: 'Light render pipeline',
                layout: 'auto',
                vertex: {
                    module: this.#renderModule,
                    entryPoint: 'vertex_main',
                    buffers: [this.#vertexBufferLayout]
                },
                fragment: {
                    module: this.#renderModule,
                    entryPoint: 'fragment_main',
                    targets: [
                        { format: cformat }
                    ]
                },
                primitive: {
                    topology: 'line-list'
                }
            })
            this.#ready = true;
        };
        getGPU();
    }

    async #simulateRays() {
        // workgroup group size
        // x value is not used in shader, used to do more passes
        // y and z are useless
        // workgroup size
        // x value is ray angle
        // y and z are useless again
        // probably shouldn't be allocating new buffers every frame but oh well lol
        const gridFlat = new Uint8ClampedArray(grid.reduce((f, l) => f.push(...l), []));
        const gridBuffer = this.#GPU.createBuffer({
            label: 'Grid buffer',
            size: gridFlat.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const settingsArr = new Uint16Array([gridSize, this.#renderSettings.precision, this.#renderSettings.accuracy, this.#renderSettings.resolution]);
        const settingsBuffer = this.#GPU.createBuffer({
            label: 'Settings buffer',
            size: settingsArr.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        this.#GPU.queue.writeBuffer(gridBuffer, 0, gridFlat);
        this.#GPU.queue.writeBuffer(settingsBuffer, 0, settingsArr);
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
    async #drawRays(vertices) {
        // move buffer allocation to constructor
        const vertexBuffer = this.#GPU.createBuffer({
            label: 'Light vertices',
            size: vertices.byteLength,
            usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST
        });
        const resolutionArr = new Float32Array([this.#renderSettings.resolution, 2 / this.#renderSettings.resolution, -this.#renderSettings.resolution / 2]);
        const resolutionBuffer = this.#GPU.createBuffer({
            label: 'Resolution buffer',
            size: resolutionArr.byteLength,
            usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
        });
        const bindGroup = this.#GPU.createBindGroup({
            label: 'Render bind group',
            layout: this.#renderPipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: vertexBuffer } },
                { binding: 1, resource: { buffer: resolutionBuffer } }
            ]
        })
        this.#GPU.queue.writeBuffer(vertexBuffer, 0, vertices);
        this.#GPU.queue.writeBuffer(resolutionBuffer, 0, resolutionArr);
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
        renderPass.setPipeline(this.#renderPipeline);
        renderPass.setVertexBuffer(0, vertexBuffer);
        renderPass.draw(vertices.byteLength / 8);
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
        this.#drawRays(vertices);
        // wait how do i know if the gpu is done
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