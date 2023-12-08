struct Vertex {
    // probably will cause problems?
    @location(0) position: vec2<u32>,
    @location(1) color: vec4<u32>
}
struct FragVertex {
    @builtin(position) clip_position: vec4<f32>,
    @location(0) color: vec4<f32>
}

// bindings for buffers
@group(0) @binding(0) var<storage, read> vertices: array<Vertex>; // idk

@vertex
fn vertex_main(vertex: Vertex) -> FragVertex {
    var out: FragVertex;
    out.clip_position = vec4<f32>((f32(vertex.position.x) / 32768.0) - 1.0, (f32(vertex.position.y) / -32768.0) + 1.0, 0.0, 1.0);
    out.color = vec4<f32>(f32(vertex.color.x) / 255.0, f32(vertex.color.y) / 255.0, f32(vertex.color.z) / 255.0, f32(vertex.color.w) / 255.0);
    return out;
}

@fragment
fn fragment_main(in: FragVertex) -> @location(0) vec4<f32> {
    return in.color;
}