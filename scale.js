//[x, y] position, {width, height} dimensions
export const toClip = (position, dimensions) => {
    return [
        (2 * position[0] / dimensions.width) - 1,
        (2 * position[1] / dimensions.height) - 1
    ];
};