import { computeShaderCode } from "./compute.js";
import { randDots } from "./random.js";
import { extractPixels } from "./raster.js";
import { renderShaderCode } from "./render.js";
import { startResizeObservation } from "./resize.js";
import { dotStruct } from "./structs.js";

let pointerLoc = [0, 0];
let pointerHeldNow = false;
let pointerHeldLastFrame = false;

const DOT_COUNT = 100;


const main = async () => {
    const device = await (await navigator.gpu?.requestAdapter( {
        powerPreference: "high-performance",
    }))?.requestDevice();

    let renderTarget;
    let fontRasterizer;
    if(device) {        
        renderTarget = document.body.appendChild(document.createElement("canvas"));
        renderTarget.id = "renderTarget";

        fontRasterizer = document.body.appendChild(document.createElement("canvas"));
        fontRasterizer.id = "fontRasterizer";
    } else {
        let errorMessage = document.body.appendChild(document.createElement("span"));
        errorMessage.innerText = "No WebGPU support :( "
        console.error("No WebGPU support :(");
        return;
    }

    // TODO: resize the rasterizer canvas as well?
    startResizeObservation(renderTarget, device.limits.maxTextureDimension2D);


    // TODO: proper sizing
    fontRasterizer.width = 1035;//renderTarget.width;
    fontRasterizer.height = 646;//renderTarget.height;

    const fontCtx = fontRasterizer.getContext("2d");
    fontCtx.font = "48px serif";
    fontCtx.fillText("YAH", 40, 40);

    //console.log();


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
                clearValue: [0, 1, 0, 1],
                loadOp: "clear",
                storeOp: "store"
            }
        ]
    };

    const dots = dotStruct.createFilledArray(extractPixels(fontRasterizer, [1, 1, 1, 1]));


    // Kept for reference
    const dotBuffer = device.createBuffer({
        label: "dotBuffer",
        size: dots.data.byteLength,
        usage: GPUBufferUsage.STORAGE |
               GPUBufferUsage.COPY_DST |
            //    GPUBufferUsage.COPY_SRC | // used for debugging
               GPUBufferUsage.VERTEX
    });

    const computeBindGroup = device.createBindGroup({
        label: "computeBindGroup",
        layout: moveDotsPipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: dotBuffer},
        ]
    });

    const renderBindGroup = device.createBindGroup({
        label: "renderBindGroup",
        layout: renderPipeline.getBindGroupLayout(0),
        entries: [
            {binding: 0, resource: dotBuffer},
        ]
    });

    // kept for reference
    device.queue.writeBuffer(dotBuffer, 0, dots.data);

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
        computePass.setBindGroup(0, computeBindGroup);
        computePass.dispatchWorkgroups(dots.count);
        computePass.end();

        renderPassDescriptor.colorAttachments[0].view = ctx.getCurrentTexture().createView();
        const renderPass = encoder.beginRenderPass(renderPassDescriptor);
        renderPass.setPipeline(renderPipeline);
        renderPass.setBindGroup(0, renderBindGroup);
        renderPass.draw(1, dots.count);
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

main();

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

//main();

// const imageData = fontCtx.getImageData(0, 0, fontRasterizer.width, fontRasterizer.height);
// console.log(imageData);