//{row, col} position, {width, height} dimensions
export const toClip = ({row, col},{width, height}) => {
    console.log(row, col);
    const clip = [
        //         ((2 * col/ height) - 1),
        // -((2 * row / width) - 1) + 1,

        ((2 * col/ width) - 1),
        1 -(2 * row / height),


    ];
    console.log(clip);
    return clip;
};