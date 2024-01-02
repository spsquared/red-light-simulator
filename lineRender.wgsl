struct VertexInput {
    @location(0) position: vec2<u32>,
    @location(1) color: vec4<u32>
    // decay factor and travel distance
}
struct VertexOutput {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>
    // decay factor and travel distance
}
struct FragInput {
    @builtin(position) position: vec4<f32>,
    @location(0) color: vec4<f32>
    // decay factor and travel distance
}

// bindings for buffers
@group(0) @binding(0) var<storage, read> vertices: array<VertexInput>;

@vertex
fn vertex_main(vertex: VertexInput) -> VertexOutput {
    var out: VertexOutput;
    if (vertex.color.w == 0u && vertex.position.x == 0u && vertex.position.y == 0u) {
        return out;
    }
    out.clip_position = vec4<f32>((f32(vertex.position.x) / 32768.0) - 1.0, (f32(vertex.position.y) / -32768.0) + 1.0, 0.0, 1.0);
    out.color = vec4<f32>(f32(vertex.color.x) / 255.0, f32(vertex.color.y) / 255.0, f32(vertex.color.z) / 255.0, f32(vertex.color.w) / 255.0);
    return out;
}

@fragment
fn fragment_main(in: FragInput) -> @location(0) vec4<f32> {
    // light decay function is here
    return in.color;
    // return vec4<f32>(in.color.xyz, in.color.w * exp(1 - in));
}

@fragment
fn composite_main(in: FragInput) -> @location(0) vec4<f32> {
    // asdfdsfsadfdsa sampling
    return vec4<f32>(in.position.x / 800.0, 1.0, in.position.y / 800.0, 1.0);
}