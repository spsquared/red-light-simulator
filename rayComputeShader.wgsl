// constants
override ray_precision: u32;
override vertex_allocation: u32;

// bindings for buffers
@group(0) @binding(0) var<storage, read> grid: array<u32>;
@group(0) @binding(1) var<storage, read_write> vertices: array<u32>;
@group(0) @binding(2) var<uniform> params: BufParams;

// buffer stuff
fn writeVertex(i: u32, v: Vertex) {
    vertices[i * 2] = (clamp(u32(v.pos.y), 0, 65535) << 16) | clamp(u32(v.pos.x), 0, 65535);
    vertices[i * 2 + 1] = pack4x8unorm(v.color);
}

// pixel constants, hardcoded
const PIXELDATA: array<PixelData, 2> = array(
    PixelData(1.000293, 0.01, 0.0, 0.0),
    PixelData(1.0, 1.0, 0.0, 170.8),
);

// struct stuff
struct ComputeParams {
    @builtin(local_invocation_id) thread_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32
}
struct BufParams {
    grid_size: u32,
    wavelength: u32, // idk nanometers or something
    source: vec2<u32>
}
struct Vertex {
    pos: vec2<f32>,
    color: vec4<f32>
}
struct Ray {
    pos: vec2<f32>,
    dir: vec2<f32>,
    intensity: f32
}
struct PixelData {
    refract_index: f32,
    extinction_coeff: f32,
    abbe_num: f32,
    roughness: f32 // root mean square height (standard deviation of normal vector)
}

// utilities and stuff
var<private> grid_scale: f32;
var<private> rand_seed : vec2<f32>;
fn init_rand(invocation_id : u32, seed : vec4<f32>) {
  rand_seed = seed.xz;
  rand_seed = fract(rand_seed * cos(35.456+f32(invocation_id) * seed.yw));
  rand_seed = fract(rand_seed * cos(41.235+f32(invocation_id) * seed.xw));
}
fn rand() -> f32 {
  rand_seed.x = fract(cos(dot(rand_seed, vec2<f32>(23.14077926, 232.61690225))) * 136.8168);
  rand_seed.y = fract(cos(dot(rand_seed, vec2<f32>(54.47856553, 345.84153136))) * 534.7645);
  return rand_seed.y;
}
// light stuff
@must_use
fn wavelengthToColor(l: u32) -> vec4<f32> {
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
                            if l <= 780u {
                                r = 1.0;
                            } else {
                                return vec4<f32>(0.0, 0.0, 0.0, 0.0);
                            }
                        } else {
                            // bug here
                            r = 1.0;
                            g = f32(645u - l) / 65.0;
                            // g = 1.0;
                        }
                    } else {
                        r = f32(l - 510u) / 70.0;
                        g = 1.0;
                    }
                } else {
                    g = 1.0;
                    b = f32(510u - l) / 20.0;
                }
            } else {
                g = f32(l - 440u) / 50.0;
                b = 1.0;
            }
        } else {
            r = f32(440u - l) / 60.0;
            b = 1.0;
            if l < 420u {
                a = f32(l - 380u) / 40.0;
                return vec4<f32>(r, g, b, pow(a, gamma));
            }
        }
        if l >= 420u {
            if l > 700u {
                if l <= 780u {
                    a = f32(780u - l) / 80.0;
                }
            } else {
                a = 1.0;
            }
            return vec4<f32>(r, g, b, pow(a, gamma));
        }
    }
    return vec4<f32>(0.0, 0.0, 0.0, 0.0);
}
@must_use
fn toSRGB(c: vec4<u32>) -> vec4<u32> {
    return vec4<u32>(u32(pow(f32(c.x), 1.0 / 2.2)), u32(pow(f32(c.y), 1.0 / 2.2)), u32(pow(f32(c.z), 1.0 / 2.2)), c.w);
}
@must_use
fn gridAt(pos: vec2<u32>) -> u32 {
    return grid[clamp(pos.y * params.grid_size, 0u, params.grid_size) + clamp(pos.x, 0u, params.grid_size)];
}
@must_use
fn gridAtPos(pos: vec2<f32>) -> u32 {
    return grid[(clamp(u32(pos.y / grid_scale), 0u, params.grid_size) * params.grid_size) + clamp(u32(pos.x / grid_scale), 0u, params.grid_size)];
}

// workgroup id
//  x - ray subdivision
//  y - quadrant
//  z - pass number
// thread id
//  x - ray angle in quadrant
@compute @workgroup_size(90, 1, 1)
fn compute_main(thread: ComputeParams) {
    // https://www.w3.org/TR/WGSL/#reflect-builtin
    // https://www.w3.org/TR/WGSL/#refract-builtin
    grid_scale = 65535.0 / f32(params.grid_size);
    let vertex_start: u32 = vertex_allocation * ((((360u * thread.workgroup_id.z) + (thread.thread_id.x + thread.workgroup_id.y * 90u)) * ray_precision) + thread.workgroup_id.x);
    var vertex_index: u32 = 0u;
    let ray_start_angle: f32 = radians(f32(thread.thread_id.x + thread.workgroup_id.y * 90u) + (f32(thread.workgroup_id.x) / f32(ray_precision)));
    var ray: Ray = Ray(
        vec2<f32>(vec2<f32>(params.source) * grid_scale + grid_scale * 0.5),
        vec2<f32>(cos(ray_start_angle), sin(ray_start_angle)),
        1.0
    );
    let color: vec4<f32> = wavelengthToColor(params.wavelength);
    init_rand(thread.local_invocation_index, color);
    var vertex: Vertex;
    // source point
    vertex.pos = ray.pos;
    vertex.color = vec4<f32>(color.xyz, 0.5);
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    // simulation loop (does defining outside actually make it faster?)
    var dir_normals: vec2<f32> = sign(ray.dir);
    var grid_pos: vec2<f32>;
    var grid_step: vec2<f32>;
    var step_move: vec2<f32>;
    var step_dist: f32;
    var col_normal: vec2<f32>;
    var col_pix: u32;
    var last_pix: u32;
    //  && ray.pos.x >= 0.0 && ray.pos.x <= 65535.0 && ray.pos.y >= 0.0 && ray.pos.y <= 65535.0
    for (var i: u32 = 1u; i < vertex_allocation && ray.intensity > 0; i++) {
        // step to next grid edge
        grid_pos = ray.pos / grid_scale;
        grid_step = clamp(grid_pos + dir_normals, floor(grid_pos), ceil(grid_pos)) - grid_pos; // perp distance to nearest gridlines
        step_move.y = grid_step.x * ray.dir.y / ray.dir.x; // distance y to reach x gridline
        if abs(step_move.y) < abs(grid_step.y) {
            // x axis reached before y axis
            step_dist = length(vec2<f32>(grid_step.x, step_move.y));
            col_pix = gridAt(vec2<u32>(u32(grid_pos.x + dir_normals.x), u32(grid_pos.y)));
            col_normal = vec2<f32>(-dir_normals.x, 0.0);
            ray.pos.x = ray.pos.x + grid_step.x * grid_scale + 0.01 * dir_normals.x;
            ray.pos.y = ray.pos.y + step_move.y * grid_scale + 0.01 * dir_normals.y;
        } else {
            // y axis reached before x axis or edge case
            step_move.x = grid_step.y * ray.dir.x / ray.dir.y; // distance x to reach y gridline
            step_dist = length(vec2<f32>(step_move.x, grid_step.y));
            col_pix = gridAt(vec2<u32>(u32(grid_pos.x), u32(grid_pos.y + dir_normals.y)));
            col_normal = vec2<f32>(0.0, -dir_normals.y);
            ray.pos.x = ray.pos.x + step_move.x * grid_scale + 0.01 * dir_normals.x;
            ray.pos.y = ray.pos.y + grid_step.y * grid_scale + 0.01 * dir_normals.y;
        }
        // test vertices
        vertex.pos = ray.pos;
        vertex.color = vec4<f32>(grid_pos.x / f32(params.grid_size), grid_pos.y / f32(params.grid_size), f32(i) / f32(vertex_allocation / 2), 0.5);
        writeVertex(vertex_start + vertex_index, vertex);
        vertex_index++;
        // um refraction?
        // do stuff based on distance
        // if pixel change stick vertex
    }
}