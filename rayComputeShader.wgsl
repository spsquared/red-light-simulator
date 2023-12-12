// constants
override ray_precision: u32;
override vertex_allocation: u32;

// pixel constants, hardcoded
const PIXELDATA = array(
    // pixels have refractive index, extinction coefficient, abbe number, and roughness (last one not physically accurate but good approximation for rough surfaces)
    vec4<f32>(1.0, 2.0, 3.0, 4.0),
    vec4<f32>(0.0, 0.0, 0.0, 0.0)
);

struct ComputeInput {
    @builtin(local_invocation_id) thread_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>
}
struct ComputeParams {
    grid_size: u32,
    wavelength: u32, // idk nanometers or something
    source: vec2<u32>
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
@group(0) @binding(1) var<storage, read_write> vertices: array<u32>;
@group(0) @binding(2) var<uniform> params: ComputeParams; 

// buffer stuff
fn writeVertex(i: u32, v: Vertex) {
    vertices[i * 2] = ((u32(v.pos.y) & 0xffffu) << 16) | (u32(v.pos.x) & 0xffffu);
    vertices[i * 2 + 1] = ((v.color.w & 0xffu) << 24) | ((v.color.z & 0xffu) << 16) | ((v.color.y & 0xffu) << 8) | (v.color.x & 0xffu);
}
fn writeVertexUnsafe(i: u32, v: Vertex) {
    vertices[i * 2] = (u32(v.pos.y) << 16) | u32(v.pos.x);
    vertices[i * 2 + 1] = (v.color.w << 24) | (v.color.z << 16) | (v.color.y << 8) | v.color.x;
}

fn wavelengthToColor(l: u32) -> vec4<u32> {
    return vec4<u32>(0u, 0u, 0u, 0u);
// function wavelengthToRGB2(lambda) {
//     let gamma = 0.8, f = 0, r = 0, g = 0, b = 0;
//     if (lambda >= 380) {
//         if (lambda >= 440) {
//             if (lambda >= 490) {
//                 if (lambda >= 510) {
//                     if (lambda >= 580) {
//                         if (lambda >= 645) {
//                             if (lambda < 781) r = 1;
//                             else return [0, 0, 0];
//                         } else {
//                             r = 1
//                             g = -(lambda - 645) / 65;
//                         }
//                     } else {
//                         r = (lambda - 510) / 70;
//                         g = 1;
//                     }
//                 } else {
//                     g = 1;
//                     b = -(lambda - 510) / 20;
//                 }
//             } else {
//                 g = (lambda - 440) / 50;
//                 b = 1;
//             }
//         } else {
//             r = -(lambda - 440) / 60;
//             b = 1;
//             if (lambda < 420) {
//                 f = 0.3 + (lambda - 380) * 0.0175; // 0.7 / 40
//                 return [Math.round(255 * ((r * f) ** gamma)), Math.round(255 * ((g * f) ** gamma)), Math.round(255 * ((b * f) ** gamma))];
//             }
//         }
//         if (lambda >= 420) {
//             if (lambda >= 701) {
//                 if (lambda < 781) f = 0.3 + (780 - lambda) * 0.00875 // 0.7 / 80
//             } else {
//                 f = 1;
//             }
//             return [Math.round(255 * ((r * f) ** gamma)), Math.round(255 * ((g * f) ** gamma)), Math.round(255 * ((b * f) ** gamma))];
//         }
//     }
//     return [0, 0, 0];
// };
}

@compute @workgroup_size(90, 1, 1)
fn compute_main(thread: ComputeInput) {
    // workgroup id
    //  x - ray subdivision
    //  y - quadrant
    //  z - pass number
    // thread id
    //  x - ray angle in quadrant
    let vertex_start: u32 = vertex_allocation * ((((360u * thread.workgroup_id.z) + (thread.thread_id.x + thread.workgroup_id.y * 90u)) * ray_precision) + thread.workgroup_id.x);
    var vertex_index: u32 = 0u;
    let grid_scale: f32 = 65535.0 / f32(params.grid_size);
    let ray_start_angle = (f32(thread.thread_id.x + thread.workgroup_id.y * 90u) + (f32(thread.workgroup_id.x) / f32(ray_precision))) * 0.01745329251994329576923690768489;
    var ray: Ray = Ray(
        vec2<f32>(vec2<f32>(params.source) * grid_scale + grid_scale * 0.5),
        vec2<f32>(cos(ray_start_angle), sin(ray_start_angle))
    );
    var vertex: Vertex;
    vertex.pos = ray.pos;
    vertex.color = vec4<u32>(0u, 255u, 255u, 255u);
    writeVertexUnsafe(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = ray.pos + ray.dir * 10000;
    vertex.color = vec4<u32>(255u, 0u, 0u, 255u);
    writeVertexUnsafe(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = vec2<f32>(20000, 20000);
    writeVertexUnsafe(vertex_start + vertex_index, vertex);
    vertex_index++;
}