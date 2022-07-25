import {extname} from 'path';

export {isImage, isVideo};

const imageExtensions = new Set(['.png', '.jpg', '.jpeg', '.bmp', '.gif']);
function isImage(filename) {
    return imageExtensions.has(extname(filename));
}

const videoExtensions = new Set(['.webm', '.avi', '.x264', '.mp4', '.mkv']);
function isVideo(filename) {
    return videoExtensions.has(extname(filename));
}