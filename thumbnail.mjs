import {basename} from 'path';
import {isImage, isVideo} from './utils.mjs';
import util from 'util';
const exec = util.promisify((await import('child_process')).exec);

export {generateThumbnail}

const THUMBNAIL_FILE_PREFIX = 'thumb_';
const THUMBNAIL_FILE_POSTFIX = '.jpg';

async function generateThumbnail(inputFilePath, destinationDirectory) {
    let inputFileName = basename(inputFilePath);
    // Can end up with thumbnail names like, '...xx.jpg.jpg'.
    // A bit ugly but simpler to handle.
    let thumbnailFilePath = 
        destinationDirectory + 
        '/' + 
        THUMBNAIL_FILE_PREFIX + 
        inputFileName + 
        THUMBNAIL_FILE_POSTFIX;
    if(isImage(inputFileName)) {
        // [0] to convert only the first frame of gifs
        await exec(`convert '${inputFilePath}[0]' -resize 100x100 '${thumbnailFilePath}'`);
    } else if(isVideo(inputFileName)) {
        await exec(`ffmpeg -nostdin -y -ss 4 -i '${inputFilePath}' -vf scale=w=120:h=120:force_original_aspect_ratio=decrease -frames:v 1 '${thumbnailFilePath}'`);
    } else {
        // TODO silently ignore or log instead?
        throw new Error(`Asked to create preview for file which is neither an image nor a video: ${previewFilename}`);
    }
    return thumbnailFilePath;
}