// constants
override grid_size: u32; // WHY IS THERE SYNTAX ERROR
override ray_precision: u32;
override ray_accuracy: u32;
override vertex_allocation: u32;

// pixel constants, hardcoded
const PIXELDATA = array(
    // pixels have refractive index, extinction coefficient, abbe number, and roughness (last one not physically accurate but good approximation for rough surfaces)
    vec4<f32>(1.0, 2.0, 3.0, 4.0),
    vec4<f32>(0.0, 0.0, 0.0, 0.0)
);

struct ComputeInput {
    @builtin(local_invocation_id) thread_id: vec3<u32>,
    @builtin(global_invocation_id) workgroup_id: vec3<u32>
}
struct Vertex {
    pos: vec2<f32>,
    color: vec4<u32>
}
struct Ray {
    pos: vec2<f32>,
    dir: vec2<f32>
}

// bindings for buffers
@group(0) @binding(0) var<storage, read> grid: array<u32>;
@group(0) @binding(1) var<storage, read> sources: array<u32>;
@group(0) @binding(2) var<storage, read_write> vertices: array<u32>;
@group(0) @binding(3) var<uniform> wavelength: f32; 

fn readSource(i: u32) -> vec2<f32> {
    return vec2<f32>(f32(sources[i] >> 16), f32(sources[i] & 0xffffu));
}
fn writeVertex(i: u32, v: Vertex) {
    vertices[i * 2] = ((u32(v.pos.x) & 0xffffu) << 16) | (u32(v.pos.y) & 0xffffu);
    vertices[i * 2 + 1] = ((v.color.x & 0xffu) << 24) | ((v.color.y & 0xffu) << 16) | ((v.color.z & 0xffu) << 8) | (v.color.w & 0xffu);
}

@compute @workgroup_size(90, 1, 1) // oh great 360 > 256
fn compute_main(params: ComputeInput) {
    // thread id
    //  x - ray subdivision * pass number
    //  y - quadrant
    //  z - source index
    // workgroup id
    //  x - ray sector angle
    let vertex_start: u32 = vertex_allocation * (((360u * params.thread_id.z + params.workgroup_id.x + (params.thread_id.y * 90u)) * ray_accuracy * ray_precision) + params.thread_id.x);
    var vertex_index: u32 = 0u;
    let grid_scale: f32 = 65535.0 / f32(grid_size);
    let ray_start_angle = (f32(params.workgroup_id.x + ((params.thread_id.y + 1u) * 90u)) + (f32(params.thread_id.x % ray_precision) / f32(ray_precision))) * 0.01745329251994329576923690768489;
    var ray: Ray = Ray(
        vec2<f32>(vec2<f32>(readSource(params.workgroup_id.z)) * grid_scale + grid_scale * 0.5),
        vec2<f32>(cos(ray_start_angle), sin(ray_start_angle))
    );
    var vertex: Vertex;
    vertex.pos = ray.pos;
    vertex.color = vec4<u32>(255u, 255u, 255u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = ray.pos + ray.dir * 10000;
    vertex.color = vec4<u32>(255u, 255u, 0u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = vec2<f32>(20000, 20000);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
}