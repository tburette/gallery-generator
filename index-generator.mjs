/*
Generates the main index web page containing a preview of the subdirectories.
*/
import {readdir, mkdir} from 'fs/promises';
import util from 'util';
const exec = util.promisify((await import('child_process')).exec);

export {writeHeader, generateGalleryForDirectory}

const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif']);
function isImage(filename) {
    return imageExtensions.has(filename.split('.').at(-1));
}

const videoExtensions = new Set(['webm', 'avi', 'x264', 'mp4', 'mkv']);
function isVideo(filename) {
    return videoExtensions.has(filename.split('.').at(-1));
}


async function writeHeader(indexFile, parentDirectoryToProcess) {
    await indexFile.write(`<h1>${parentDirectoryToProcess.split('/').at(-1)} Gallery</h1>\n`);
}

async function generateGalleryForDirectory(indexFile, parentDirectoryToProcess, inputGalleryName, outputDirectory) {
    let dirContent = (await readdir(parentDirectoryToProcess + '/' + inputGalleryName, {withFileTypes: true}))
        .filter(dirent=>dirent.isFile())
        .map(dirent=>dirent.name)
        .filter(name =>isImage(name) || isVideo(name));
    dirContent.sort((a, b)=>a.localeCompare(b, 'en', {numeric: true}));
    await indexFile.write(`${inputGalleryName} (${dirContent.length}) <br>`);
    const PREVIEW_COUNT = 4;
    let filesSelectedForPreview;
    if(dirContent.length <= PREVIEW_COUNT) {
        filesSelectedForPreview = dirContent;
    } else {
        // always take the first
        filesSelectedForPreview = dirContent.slice(0, 1);
        // then space out the remaining ones
        for(let i = 0;i<PREVIEW_COUNT-1;i++) {
            // take from the second image in the files to the last
            let index_to_take = Math.floor((dirContent.length-1)/(PREVIEW_COUNT-1)*(i+1));
            filesSelectedForPreview.push(dirContent[index_to_take]);
        }
    }

    try {
        await mkdir(outputDirectory + '/' + inputGalleryName);
    }catch(err) {
        if(err?.code != 'EEXIST') {
            throw err;
        }
    }

    for(var previewFilename of filesSelectedForPreview) {
        let fullpreviewFilePath = parentDirectoryToProcess + '/' + inputGalleryName + '/' + previewFilename;
        // to be used for IO operations
        let fullthumbnailFilePath = outputDirectory + '/' + inputGalleryName + '/' + 'thumb_' + previewFilename + '.jpg';
        // to be used in HTML
        let thumbnailFilePathRelativeToOutputDirectory = inputGalleryName + '/' + 'thumb_' + previewFilename + '.jpg'
        if(isImage(previewFilename)) {
            await exec(`convert '${fullpreviewFilePath}' -resize 100x100 '${fullthumbnailFilePath}'`);
        } else if(isVideo(previewFilename)) {
            await exec(`ffmpeg -nostdin -y -ss 4 -i '${fullpreviewFilePath}' -vf scale=w=120:h=120:force_original_aspect_ratio=decrease -frames:v 1 '${fullthumbnailFilePath}'`);
        } else {
            // TODO silently ignore or log instead?
            throw new Error(`Asked to create preview for file which is neither an image nor a video: ${previewFilename}`);
        }
        // BUG does not work if path given is relative. Must remove 'path + outoutDirectory' from fullthumbnailFilePath
        await indexFile.write(`<img src="${thumbnailFilePathRelativeToOutputDirectory}"></img>`)
    }
    await indexFile.write('<br><br>');
}