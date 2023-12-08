// constants
override grid_size: u32; // WHY IS THERE SYNTAX ERROR
override ray_precision: u32;
override ray_accuracy: u32;
override vertex_allocation: u32;

// pixel constants, hardcoded
const PIXELDATA = array(
    vec4<f32>(1.0, 2.0, 3.0, 4.0),
    vec4<f32>(0.0, 0.0, 0.0, 0.0)
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
@group(0) @binding(1) var<storage, read> sources: array<vec3<u32>>;
@group(0) @binding(2) var<storage, read_write> vertices: array<Vertex>;
@group(0) @binding(3) var<uniform> wavelength: f32; 

@compute @workgroup_size(90, 1, 1) // oh great 360 > 256
fn compute_main(params: ComputeInput) {
    // thread id
    //  x - ray subdivision * pass number
    //  y - quadrant
    //  z - source index
    // workgroup id
    //  x - ray sector angle
    let vertex_start: u32 = vertex_allocation * (((360u * params.thread_id.z + params.workgroup_id.x + ((params.thread_id.y + 1u) * 90u)) * ray_accuracy * ray_precision) + params.thread_id.x);
    var vertex_index: u32 = 0u;
    let grid_scale: f32 = 65535.0 / f32(grid_size);
    var ray: vec3<f32> = vec3<f32>(
        f32(sources[params.workgroup_id.z].x) * grid_scale + grid_scale * 0.5,
        f32(sources[params.workgroup_id.z].y) * grid_scale + grid_scale * 0.5,
        (f32(params.workgroup_id.x + ((params.thread_id.y + 1u) * 90u)) + (f32(params.thread_id.x % ray_precision) / f32(ray_precision))) * 0.01745329251994329576923690768489
    );
    vertices[vertex_start + vertex_index].position = vec2<u32>(u32(ray.x), u32(ray.y));
    vertices[vertex_start + vertex_index].color = vec4<u32>(255u, 255u, 255u, 255u);
    vertex_index++;
    // inefficient but who cares
    vertices[vertex_start + vertex_index].position = vec2<u32>(u32(ray.x + cos(ray.z) * 2000.0), u32(ray.y + sin(ray.z) * 2000.0));
    vertices[vertex_start + vertex_index].color = vec4<u32>(0u, 255u, 0u, 255u);
}