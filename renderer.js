// dispatch webgpu
// x value is ray angle - probably in degrees and divided by some known constant fed to the gpu
// y value is useless in compute, its just there to send more rays in that direction
// z is actually useless
{
    // atrocities to get constants
    let getGPU = async () => {
        const adapter = await navigator.gpu?.requestAdapter();
        const GPU = await adapter?.requestDevice();
        Object.defineProperty(window, 'GPU', {
            configurable: false,
            enumerable: true,
            value: GPU,
            writable: false,
        });
    };
    getGPU();
}
let rendering = false;