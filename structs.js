// Want to recompute layouts?
// Go here! https://webgpufundamentals.org/webgpu/lessons/resources/wgsl-offset-computer.html

export const dotStruct = (() => { 
    const code = /* wgsl */`
        struct Dot {
            color: vec4f, // 16 bytes
            position: vec2f, // 8 bytes
            velocity: vec2f // 8 bytes
        }  // total 32 bytes
    `
    const byteCount = 32;
    const floatCount = byteCount / 4;
    const createEmptyArray = (dotCount) => {
        const data = new ArrayBuffer(byteCount * dotCount);
        return {
            data,
            views: {
                colorView: new Float32Array(data, 0),
                positionView: new Float32Array(data, 16),
                velocityView: new Float32Array(data, 24),
            },
            count: dotCount
        };
    };
    const createFilledArray = (dotData) => {
        console.log(dotData);
        const data = createEmptyArray(dotData.length);
        const {colorView, positionView, velocityView} = data.views;
        dotData.forEach(({color, position, velocity}, i) => {
            colorView.set(color, i*floatCount);
            positionView.set(position, i*floatCount);
            velocityView.set(velocity, i*floatCount)
        });
        return data;
    };
    return {
        code,
        byteCount,
        floatCount,
        createEmptyArray,
        createFilledArray
    };
})();

// Old structs for reference


// export const uniformsStruct = (() => { 
//     const code = /* wgsl */ `
//         struct Uniforms {
//             gravity: vec2f,  //8 bytes
//             pointerLoc: vec2f, // 8 bytes, location of pointer
//             pointerPressed: u32, // 4 bytes, was the pointer first pressed this frame?
//             pointerHeld: u32 // 4 bytes, is the pointer currently held down?
//         } // total 24 bytes
// `;
//     const byteCount = 24;
//     const u32Count = byteCount/4;
//     const floatCount = byteCount/4;
//     const createEmpty = () => {
//         const data = new ArrayBuffer(byteCount);
//         return {
//             data,
//             views: {
//                 gravityView: new Float32Array(data, 0),
//                 pointerLocView: new Float32Array(data, 8),
//                 pointerPressedView: new Uint32Array(data, 16),
//                 pointerHeldView: new Uint32Array(data, 20),
//             },
//             count: 1
//         };
//     };
//     return {
//         code,
//         byteCount,
//         u32Count,
//         floatCount,
//         createEmpty,
//         createFilled: ({gravity, pointerLoc, pointerPressed, pointerHeld}) => {
//             const uniform = createEmpty();
//             uniform.views.gravityView.set(gravity, 0);
//             uniform.views.pointerLocView.set(pointerLoc, 0);
//             uniform.views.pointerPressedView.set([pointerPressed], 0);
//             uniform.views.pointerHeldView.set([pointerHeld], 0);
//             return uniform;
//         }
//     };
// })();