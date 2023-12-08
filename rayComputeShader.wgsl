// constants
override grid_size: u32; // WHY IS THERE SYNTAX ERROR
override ray_precision: u32;
override vertex_allocation: u32;

// pixel constants, hardcoded
const PIXELDATA = array(
    vec4<f32>(1.0, 2.0, 3.0, 4.0)
);

struct ComputeInput {
    @builtin(local_invocation_id) thread_id: vec3<u32>, // egregious
    @builtin(global_invocation_id) workgroup_id: vec3<u32>
}
struct Vertex {
    @location(0) position: vec2<u32>,
    @location(1) color: vec4<u32>
}

// bindings for buffers
@group(0) @binding(0) var<storage, read> grid: array<u32>;
@group(0) @binding(1) var<storage, read> sources: array<vec2<u32>>;
@group(0) @binding(2) var<storage, read_write> vertices: array<Vertex>;
// single ray mode - uniform buffer for mouse location?

@compute @workgroup_size(90, 4, 1) // not sure if necessary, is max dimension 256?
fn compute_main(params: ComputeInput) {
    // thread id
    //  x - ray subdivision
    //  y - pass number
    //  z - source index
    // workgroup id
    //  x - ray sector angle
    //  y - ray sector
    // angle is (workgroup_id.x * workgroup_id.y) + (thread_id.x / precision)
}