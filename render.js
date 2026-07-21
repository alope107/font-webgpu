
export const renderShaderCode = /* wgsl */ `

// Kept for reference
// struct VertexOutput {
//     @builtin(position) position : vec4f,
//     @location(0) color : vec4f
// }

// @group(0) @binding(0) var<storage, read> circles : array<Circle>; 

@vertex fn drawDots(@builtin(vertex_index) vertexIdx : u32, 
                    @builtin(instance_index) instanceIdx : u32) -> @builtin(position) vec4f {
    return vec4f(0, 0, 1, 1);
}

@fragment fn solidColor(@builtin(position) pos : vec4f) -> @location(0) vec4f {
    return vec4f(1, 0, 0, 1);
}
`;