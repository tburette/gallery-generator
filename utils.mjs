import {extname} from 'path';

export {isImage, isVideo, pathToURLPath};

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif']);
function isImage(filename) {
    return imageExtensions.has(extname(filename));
}

const videoExtensions = new Set(['.webm', '.avi', '.x264', '.mp4', '.mkv']);
function isVideo(filename) {
    return videoExtensions.has(extname(filename));
}

/*
Convert filesystem paths to URL paths.

Useful on windows where a path cannot be used as is in a URL.
Eg.: gallery1\\image.jpg instead of gallery1/image.jpg
*/
function pathToURLPath(path) {
    return path.replace(/\\/g, '/');
}