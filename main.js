import { computeShaderCode } from "./compute.js";
import { renderShaderCode } from "./render.js";
import { startResizeObservation } from "./resize.js";

let pointerLoc = [0, 0];
let pointerHeldNow = false;
let pointerHeldLastFrame = false;


const main = async () => {
    const device = await (await navigator.gpu?.requestAdapter( {
        powerPreference: "high-performance",
    }))?.requestDevice();

    let renderTarget;
    if(device) {        
        renderTarget = document.body.appendChild(document.createElement("canvas"));
        renderTarget.id = "renderTarget";
    } else {
        let errorMessage = document.body.appendChild(document.createElement("span"));
        errorMessage.innerText = "No WebGPU support :( "
        console.error("No WebGPU support :(");
        return;
    }

    startResizeObservation(renderTarget, device.limits.maxTextureDimension2D);

    // These errors are automatically surfaced in the chrome terminal,
    // but need to be explicitly listened for on webkit
    device.addEventListener("uncapturederror", (e) => {
        console.error("Uncaptured error: ", e.error.message);
    });

    const renderFormat = navigator.gpu.getPreferredCanvasFormat();
    const ctx = renderTarget.getContext("webgpu");
    ctx.configure( {
        device,
        format: renderFormat
    });

    const computeModule = device.createShaderModule({
        label: "compute shader module",
        code:computeShaderCode
    });
    const moveDotsPipeline = device.createComputePipeline({
        label: "moveDots pipeline",
        layout: "auto",
        compute: {
            module: computeModule,
            entryPoint: "moveDots"
        }
    });

    const renderModule = device.createShaderModule({
        label: "render module",
        code: renderShaderCode
    });
    const renderPipeline = device.createRenderPipeline({
        label: "render pipeline",
        layout: "auto",
        vertex: {
            entryPoint: "drawDots",
            module: renderModule
        },
        fragment:{
            entryPoint: "solidColor",
            module: renderModule,
            targets: [{format: renderFormat}]
        },
        primitive: {
            topology: "point-list"
        }
    });
    const renderPassDescriptor = {
        label: "render pass descriptor",
        colorAttachments: [
            {
                clearValue: [0, 0, 0, 1],
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    };


    // Kept for reference
    // const circlePingBuffer = device.createBuffer({
    //     label: "circlePingBuffer",
    //     size: circles.data.byteLength,
    //     usage: GPUBufferUsage.STORAGE |
    //            GPUBufferUsage.COPY_DST |
    //         //    GPUBufferUsage.COPY_SRC | // used for debugging
    //            GPUBufferUsage.VERTEX
    // });



    
    // kept for reference
    // const sortPingToPongBindGroup = device.createBindGroup({
    //     label: "sortPingToPongBindGroup",
    //     layout: sortPipeline.getBindGroupLayout(0),
    //     entries: [
    //         {binding: 0, resource: circlePingBuffer},
    //         {binding: 1, resource: circlePongBuffer},
    //         {binding: 2, resource: uniformBuffer}
    //     ]
    // });




    // kept for reference
    // device.queue.writeBuffer(circlePingBuffer, 0, circles.data);


    renderTarget.addEventListener("pointermove", () => {
        // Rescale to clip space, the scaling used by the compute/vertex shaders
        pointerLoc = [(2 * event.clientX / renderTarget.width) - 1, -((2 * event.clientY / renderTarget.height) - 1)];
    });
    renderTarget.addEventListener('pointerdown', () => { pointerHeldNow = 1; });
    renderTarget.addEventListener('pointerup', () => { pointerHeldNow = 0; });
    renderTarget.addEventListener('pointeleave', () => { pointerHeldNow = 0; });
    renderTarget.addEventListener('pointercancel', () => { pointerHeldNow = 0; });


    let frameCount = 0;
    const render = async() => {
        const encoder = device.createCommandEncoder({label: "encoder"});

        let computePass = encoder.beginComputePass();
        computePass.setPipeline(moveDotsPipeline);
        // kept for reference
        // computePass.setBindGroup(0, sortPongToPingBindGroup);
        computePass.dispatchWorkgroups(1); // Later we will parallelize
        computePass.end();

        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(renderPipeline);
        // kept for reference
        // renderPass.setBindGroup(0,renderPingBindGroup);
        renderPass.draw(1, 3);
        renderPass.end();

        const commandBuffer = encoder.finish();
        device.queue.submit([commandBuffer]);
        frameCount++;
    };

    const animationFrame = async (timestamp) => {
        // uniform = uniformsStruct.createFilled({
        //     pointerLoc: pointerLoc,
        //     pointerHeld: pointerHeldNow,
        //     pointerPressed: !pointerHeldLastFrame && pointerHeldNow 
        // });
        pointerHeldLastFrame = pointerHeldNow;
        // device.queue.writeBuffer(uniformBuffer, 0, uniform.data);
        render();
        requestAnimationFrame(animationFrame);
    };
    requestAnimationFrame(animationFrame);
};

// const initializeAccelerometer = async (e) => {
//     document.getElementById("prompt").remove();
//     window.addEventListener("devicemotion", (event) => {
//         let accelInclG = event.accelerationIncludingGravity;
//         let accelWithoutG = event.acceleration;
//         if(accelInclG.x != null) {
//             accel.x = (accelInclG.x +accelWithoutG.x*EXTRA_SHAKE_POWER)*-1;
//             accel.y = (accelInclG.y +accelWithoutG.y*EXTRA_SHAKE_POWER)*-1;
//             accel.z = (accelInclG.z +accelWithoutG.z*EXTRA_SHAKE_POWER);
//         }
//     });
//     main();
// }

// Only need user input if on mobile so accelerometer can be accessed
// Otherwise just start immedately on desktop
// if(!window.matchMedia('(hover: hover)').matches && window.matchMedia('(pointer: coarse)').matches) {
//     let userPrompt = document.body.appendChild(document.createElement("h1"));
//     userPrompt.innerText = "Press me";
//     userPrompt.id="prompt";
//     userPrompt.addEventListener("pointerup", initializeAccelerometer);
// } else {
//     main();
// }

main();