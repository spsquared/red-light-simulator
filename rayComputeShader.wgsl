// pixel constants, hardcoded
const PIXELDATA = array(
    vec4<f32>(1.0, 2.0, 3.0, 4.0)
);

// bindings for buffers

struct ComputeInput {
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(num_workgroups) num_workgroups: vec3<u32>
}
struct Vertex {
    // I WANT 8 BIT INTS BACK
    @location(0) position: vec2<u32>,
    @location(1) color: vec4<u32>
}

// compute shader here, idk read from buffers and write to another buffer that will be used as vertex buffer or something
// how does do variable lengths for rays??
@compute @workgroup_size(1, 1, 1)
fn compute_main(params: ComputeInput) {
    // idk return stuff i have no idea what im doing
}

// will have to do a bunch of bitwise operations to read and write buffers buh