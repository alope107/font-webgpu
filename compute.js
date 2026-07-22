import { global_invocation_index } from "./linear_indexing.js";
import { dotStruct, uniformsStruct } from "./structs.js";

export const computeShaderCode = /* wgsl */ `
${global_invocation_index}

${dotStruct.code}
${uniformsStruct.code}

@group(0) @binding(0) var<storage, read_write> dots : array<Dot>; 
@group(0) @binding(1) var<uniform> uniforms : Uniforms;

// TODO: better workgroup size UPDATE THE GLOBAL INDEX CALC IF CHANGED
@compute @workgroup_size(8, 8, 1) fn moveDots(
    @builtin(workgroup_id) workgroup_id : vec3<u32>,
    @builtin(local_invocation_index) local_invocation_index: u32,
    @builtin(num_workgroups) num_workgroups: vec3<u32>) {
        let id = global_invocation_index(workgroup_id, local_invocation_index, num_workgroups,
                                         8*8*1 /* CHANGE ME WHEN WORKGROUP SIZE CHANGES */);
        if(id >= arrayLength(&dots)) { return; }
        let gravFactor = 1000.;
        if (uniforms.pointerHeld > 0) {
            dots[id].velocity += (uniforms.pointerLoc - dots[id].position)/gravFactor * length(uniforms.pointerLoc-dots[id].position);
            dots[id].position += dots[id].velocity;
        }
        
    }
`;