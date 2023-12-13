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
    vertices[i * 2] = ((u32(clamp(v.pos.y, 0, 65535)) & 0xffffu) << 16) | (u32(clamp(v.pos.x, 0, 65535)) & 0xffffu);
    vertices[i * 2 + 1] = ((v.color.w & 0xffu) << 24) | ((v.color.z & 0xffu) << 16) | ((v.color.y & 0xffu) << 8) | (v.color.x & 0xffu);
}
fn writeVertexUnsafe(i: u32, v: Vertex) {
    vertices[i * 2] = (u32(v.pos.y) << 16) | u32(v.pos.x);
    vertices[i * 2 + 1] = (v.color.w << 24) | (v.color.z << 16) | (v.color.y << 8) | v.color.x;
}

// utilities and stuff
// just dont use this one
@must_use
fn clampAlongDir(vector: vec2<f32>, constraint: vec2<f32>, x_min: f32, x_max: f32, y_min: f32, y_max: f32) -> vec2<f32> {
    var retvec = vec2<f32>(vector);
    if constraint.x == 0.0 {
        retvec.y = clamp(vector.y, y_min, y_max);
    } else {
        let m = constraint.y / constraint.x;
        let c_x = clamp(vector.x, x_min, x_max);
        retvec.y = vector.y + m * (c_x - vector.x);
        let c_y = clamp(retvec.y, y_min, y_max);
        retvec.x = c_x + (c_y - retvec.y) / m;
        retvec.y = c_y;
    }
    return retvec;
}
// light stuff
@must_use
fn wavelengthToColor(l: u32) -> vec4<u32> {
    var gamma: f32 = 0.8;
    var r: f32 = 0.0;
    var g: f32 = 0.0;
    var b: f32 = 0.0;
    var a: f32 = 0.0;
    if l >= 380u {
        if l >= 440u {
            if l >= 490u {
                if l >= 510u {
                    if l >= 580u {
                        if l >= 645u {
                            if l >= 781u {
                                r = 1.0;
                            } else {
                                return vec4<u32>(0u, 0u, 0u, 0u);
                            }
                        } else {
                            r = 1.0;
                            g = f32(l - 645u) / -65.0;
                        }
                    } else {
                        r = f32(l - 510u) / 70.0;
                        g = 1.0;
                    }
                } else {
                    g = 1.0;
                    b = f32(l - 510u) / -20.0;
                }
            } else {
                g = f32(l - 440u) / 50.0;
                b = 1.0;
            }
        } else {
            r = f32(l - 440u) / -60.0;
            b = 1.0;
            if l < 420u {
                a = 0.3 + f32(l - 380u) * 0.0175; // 0.7 / 40
                return vec4<u32>(u32(255 * r), u32(255 * g), u32(255 * b), u32(pow(a, gamma)));
            }
        }
        if l >= 420u {
            if l >= 701 {
                if l < 781 {
                    a = 0.3 + f32(780u - l) * 0.00875; // 0.7 / 80
                }
            } else {
                a = 1.0;
            }
            return vec4<u32>(u32(255 * r), u32(255 * g), u32(255 * b), u32(pow(a, gamma)));
        }
    }
    return vec4<u32>(0u, 0u, 0u, 0u);
}

// workgroup id
//  x - ray subdivision
//  y - quadrant
//  z - pass number
// thread id
//  x - ray angle in quadrant
@compute @workgroup_size(90, 1, 1)
fn compute_main(thread: ComputeInput) {
    // ?????
    // https://www.w3.org/TR/WGSL/#reflect-builtin
    // https://www.w3.org/TR/WGSL/#refract-builtin
    // 
    let vertex_start: u32 = vertex_allocation * ((((360u * thread.workgroup_id.z) + (thread.thread_id.x + thread.workgroup_id.y * 90u)) * ray_precision) + thread.workgroup_id.x);
    var vertex_index: u32 = 0u;
    let grid_scale: f32 = 65535.0 / f32(params.grid_size);
    let ray_start_angle = radians(f32(thread.thread_id.x + thread.workgroup_id.y * 90u) + (f32(thread.workgroup_id.x) / f32(ray_precision)));
    var ray: Ray = Ray(
        vec2<f32>(vec2<f32>(params.source) * grid_scale + grid_scale * 0.5),
        vec2<f32>(cos(ray_start_angle), sin(ray_start_angle))
    );
    var vertex: Vertex;
    vertex.pos = clampAlongDir(ray.pos, ray.dir, 0.0, 65535.0, 0.0, 65535.0);
    vertex.pos = ray.pos;
    vertex.color = vec4<u32>(0u, 0u, 255u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = ray.pos + ray.dir * 10000;
    vertex.color = vec4<u32>(255u, 0u, 0u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = ray.pos + vec2<f32>(ray.dir.x * 20000, round(ray.dir.y) * 10000);
    vertex.color = vec4<u32>(0u, 255u, 0u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    vertex.pos = ray.pos + ray.dir * 25000;
    vertex.color = vec4<u32>(0u, 255u, 255u, 255u);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    // collision calculations
    // use another compute shader to generate list of lines with normal vectors
    // cull back-facing lines (where cross product with normal is positive)
    // idk clamping stuff and vector math (use math to calculate intersections?)
}