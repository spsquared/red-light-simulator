// Copyright (C) 2024 Sampleprovider(sp)

// constants
override ray_precision: u32;
override vertex_allocation: u32;
override max_dda_steps: u32 = 128;
struct ComputeParams {
    @builtin(local_invocation_id) thread_id: vec3<u32>,
    @builtin(workgroup_id) workgroup_id: vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32
}

// buffer stuff
@group(0) @binding(0) var<storage, read> grid: array<u32>;
@group(0) @binding(1) var<storage, read_write> vertices: array<u32>;
@group(0) @binding(2) var<uniform> params: BufParams;
struct BufParams {
    grid_size: u32,
    wavelength: u32, // idk nanometers or something
    source: vec2<u32>,
    random_seed: vec4<f32>
}
fn writeVertex(i: u32, v: Vertex) {
    vertices[i * 2] = (clamp(u32(v.pos.y), 0, 65535) << 16) | clamp(u32(v.pos.x), 0, 65535);
    vertices[i * 2 + 1] = pack4x8unorm(v.color);
    // ADFASDFDSAF MOVE DECAY FUNCTION TO FRAGMENT SHADER WITHOUT INCREASING BUFFER SIZE???
    // vertices[i * 3 + 2] = pack2x16float(vec2<f32>(v.decayFactor, v.travelDistance));
}

// pixel data, hardcoded
const pixel_data: array<PixelData, 8> = array(
    PixelData(1.000293, 0.01, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 0.0), // air
    PixelData(2.45, 1.0, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 170.8), // concrete
    PixelData(1.4498, 0.02, array<f32, 6>(0.6961663, 0.4079426, 0.8974794, 0.0684043, 0.1162414, 9.896161), 0.1), // glass (fused silica)
    PixelData(1.4498, 0.2, array<f32, 6>(0.6961663, 0.4079426, 0.8974794, 0.0684043, 0.1162414, 9.896161), 0.1), // tinted (fused silica)
    PixelData(1.000293, 0.0, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 0.0), // white light
    PixelData(1.000293, 0.0, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 0.0), // yellow light
    PixelData(1.0, 1.0, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 0.0), // missing pixel
    PixelData(1.0, 1.0, array<f32, 6>(0.0, 0.0, 0.0, 0.0, 0.0, 0.0), 0.0), // brush remove
);
struct PixelData {
    refractive_index: f32,
    extinction_coeff: f32,
    sellmeier_coeff: array<f32, 6>,
    roughness: f32 // root mean square height (standard deviation of normal vector)
}

// other structures
struct Vertex {
    pos: vec2<f32>,
    color: vec4<f32>,
    decayFactor: f32,
    travelDistance: f32
}
struct Ray {
    pos: vec2<f32>,
    dir: vec2<f32>,
    intensity: f32
}

// utilities and stuff
var<private> grid_scale: f32;
var<private> rand_seed: vec2<f32>;
fn initRandom(invocation_id: u32, seed: vec4<f32>) {
    rand_seed = seed.xz;
    rand_seed = fract(rand_seed * cos(35.456 + f32(invocation_id) * seed.yw));
    rand_seed = fract(rand_seed * cos(41.235 + f32(invocation_id) * seed.xw));
}
fn random() -> f32 {
    rand_seed.x = fract(cos(dot(rand_seed, vec2<f32>(23.14077926, 232.61690225))) * 136.8168);
    rand_seed.y = fract(cos(dot(rand_seed, vec2<f32>(54.47856553, 345.84153136))) * 534.7645);
    return rand_seed.y;
}
@must_use
fn gridAt(pos: vec2<u32>) -> u32 {
    return (grid[((clamp(pos.y, 0u, params.grid_size) * params.grid_size) + clamp(pos.x, 0u, params.grid_size)) / 4u] >> ((pos.x % 4) * 8)) & 0xffu;
}
@must_use
fn gridAtPos(pos: vec2<f32>) -> u32 {
    return (grid[((clamp(u32(pos.y / grid_scale), 0u, params.grid_size) * params.grid_size) + clamp(u32(pos.x / grid_scale), 0u, params.grid_size)) / 4u] >> ((u32(pos.x / grid_scale) % 4) * 8)) & 0xffu;
}
var<private> refractive_indices: array<f32, 5>;
fn initRefractiveIndices() {
    let wavelength: f32 = f32(params.wavelength * params.wavelength);
    var pixel: PixelData;
    for (var i: u32 = 0; i < 5; i++) {
        pixel = pixel_data[i];
        if pixel.sellmeier_coeff[0] == 0 {
            refractive_indices[i] = pixel.refractive_index;
        } else {
            refractive_indices[i] = sqrt(1 + ((wavelength * pixel.sellmeier_coeff[0]) / (wavelength - pixel.sellmeier_coeff[3])) + ((wavelength * pixel.sellmeier_coeff[1]) / (wavelength - pixel.sellmeier_coeff[4])) + ((wavelength * pixel.sellmeier_coeff[2]) / (wavelength - pixel.sellmeier_coeff[5])));
        }
    }
}

// color stuff
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

// workgroup id
//  x - ray subdivision
//  y - quadrant
//  z - pass number
// thread id
//  x - ray angle in quadrant
@compute @workgroup_size(90, 1, 1)
fn compute_main(thread: ComputeParams) {
    grid_scale = 65535.0 / f32(params.grid_size);
    initRefractiveIndices();
    let vertex_start: u32 = vertex_allocation * ((((360u * thread.workgroup_id.z) + (thread.thread_id.x + thread.workgroup_id.y * 90u)) * ray_precision) + thread.workgroup_id.x);
    var vertex_index: u32 = 0u;
    let ray_start_angle: f32 = radians(f32(thread.thread_id.x + thread.workgroup_id.y * 90u) + (f32(thread.workgroup_id.x) / f32(ray_precision))) + 0.0001;
    var ray: Ray = Ray(
        vec2<f32>(vec2<f32>(params.source) * grid_scale + grid_scale * 0.5),
        vec2<f32>(cos(ray_start_angle), sin(ray_start_angle)),
        0.5
    );
    let color: vec4<f32> = wavelengthToColor(params.wavelength);
    // initRandom(thread.local_invocation_index, params.random_seed);
    var vertex: Vertex;
    // source point
    vertex.pos = ray.pos;
    vertex.color = vec4<f32>(color.xyz, color.w * ray.intensity);
    vertex.decayFactor = 0.0;
    vertex.travelDistance = 0.0;
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
    // simulation loop (does defining outside actually make it faster?)
    var dir_normals: vec2<f32> = sign(ray.dir);
    var grid_pos: vec2<f32> = ray.pos / grid_scale;
    var grid_step: vec2<f32>;
    var step_move: vec2<f32>;
    var col_normal: vec2<f32>;
    var last_col: vec2<f32> = ray.pos;
    var col_pix: u32;
    var last_pix: u32 = gridAt(vec2<u32>(u32(grid_pos.x), u32(grid_pos.y)));
    var total_dist: f32 = 0;
    for (var i: u32 = 0; i < max_dda_steps && vertex_index < vertex_allocation && ray.intensity > 0 && ray.pos.x >= 0.0 && ray.pos.x <= 65535.0 && ray.pos.y >= 0.0 && ray.pos.y <= 65535.0; i++) {
        // step to next grid edge
        grid_pos = ray.pos / grid_scale;
        grid_step = clamp(grid_pos + dir_normals, floor(grid_pos), ceil(grid_pos)) - grid_pos; // perp distance to nearest gridlines
        step_move.x = grid_step.y * ray.dir.x / ray.dir.y; // distance x to reach y gridline
        step_move.y = grid_step.x * ray.dir.y / ray.dir.x; // distance y to reach x gridline
        if abs(step_move.y) < abs(grid_step.y) {
            // x axis reached before y axis
            let step_dist: f32 = length(vec2<f32>(grid_step.x, step_move.y));
            col_pix = gridAt(vec2<u32>(u32(grid_pos.x + dir_normals.x), u32(grid_pos.y)));
            col_normal = vec2<f32>(-dir_normals.x, 0.0);
            ray.pos.x = ray.pos.x + grid_step.x * grid_scale + 0.01 * dir_normals.x;
            ray.pos.y = select(ray.pos.y + step_move.y * grid_scale + 0.01 * dir_normals.y, ray.pos.y, ray.dir.x == 0.0);
        } else {
            // y axis reached before x axis or edge case
            let step_dist: f32 = length(vec2<f32>(step_move.x, grid_step.y));
            col_pix = gridAt(vec2<u32>(u32(grid_pos.x), u32(grid_pos.y + dir_normals.y)));
            col_normal = vec2<f32>(0.0, -dir_normals.y);
            ray.pos.x = select(ray.pos.x + step_move.x * grid_scale + 0.01 * dir_normals.x, ray.pos.x, ray.dir.y == 0.0);
            ray.pos.y = ray.pos.y + grid_step.y * grid_scale + 0.01 * dir_normals.y;
        }
        // collision
        if col_pix != last_pix {
            // update light strength
            ray.intensity = ray.intensity * pow(1 - pixel_data[last_pix].extinction_coeff, distance(ray.pos, last_col) / grid_scale);
            // modify normal vector based on roughness value (which is the standard deviation of normal vectors)
            // inverse normal distribution
            // quantile function??
            let col_dot = dot(ray.dir, col_normal);
            // let index_ratio: f32 = refractive_indices[col_pix] / refractive_indices[last_pix];
            let index_ratio: f32 = refractive_indices[last_pix] / refractive_indices[col_pix];
            let k = 1.0 - (index_ratio * index_ratio * (1.0 - col_dot * col_dot));
            // random chance is borked, no partial reflections :(
            // let reflect_coeff_0 = pow((refractive_indices[last_pix] - refractive_indices[col_pix]) / (refractive_indices[last_pix] + refractive_indices[col_pix]), 2);
            // random() < reflect_coeff_0 + ((1 - reflect_coeff_0) * pow(1 - col_dot, 5))
            if k < 0 {
                // reflection
                ray.dir = ray.dir - (2 * col_normal * col_dot);
            } else {
                // refraction
                ray.dir = ray.dir * index_ratio - col_normal * (index_ratio * col_dot + sqrt(k));
                last_pix = col_pix;
            }
            dir_normals = sign(ray.dir);
            // modify values and place vertex
            last_col = ray.pos;
            vertex.pos = ray.pos;
            vertex.color = vec4<f32>(color.xyz, color.w * ray.intensity);
            writeVertex(vertex_start + vertex_index, vertex);
            vertex_index++;
        }
    }
    ray.intensity = ray.intensity * pow(1 - pixel_data[last_pix].extinction_coeff, distance(ray.pos, last_col) / grid_scale);
    vertex.pos = ray.pos;
    vertex.color = vec4<f32>(color.xyz, color.w * ray.intensity);
    // vertex.
    writeVertex(vertex_start + vertex_index, vertex);
    vertex_index++;
}