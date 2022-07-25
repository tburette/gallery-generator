#!/usr/bin/env node
// Can have a # for shebang in js files : 
// https://github.com/tc39/proposal-hashbang

/*
Generate web pages allowing to easily browse directories of images and videos.

Give the path to a directory itself containing directories made of medias
(images/videos). It generates a web page allowing to brows and watch the medias
in all those directories from within a browser.
*/

import {readdir, mkdir, open} from 'fs/promises';
import util from 'util';
const exec = util.promisify((await import('child_process')).exec);

const OUTPUT_DIRECTORY_NAME = "generatedGallery";
const INDEX_FILE_NAME = "index.html";


const imageExtensions = new Set(['png', 'jpg', 'jpeg', 'bmp', 'gif']);
function isImage(filename) {
    return imageExtensions.has(filename.split('.').at(-1));
}

const videoExtensions = new Set(['webm', 'avi', 'x264', 'mp4', 'mkv']);
function isVideo(filename) {
    return videoExtensions.has(filename.split('.').at(-1));
}

async function generateGalleryForDirectory(inputGalleryName, indexFile, outputDirectory) {
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



if(process.argv.length < 3) {
    console.log("Missing arg : directory containing directories of media.");
    process.exit(1);
}
let parentDirectoryToProcess = process.argv.at(-1);

const outputDirectory = parentDirectoryToProcess + '/' + OUTPUT_DIRECTORY_NAME;
try {
    await mkdir(outputDirectory)
}catch(err) {
    if(err.code != 'EEXIST') {
        console.error(`Couldn't create the outpout directory (${outputDirectory})`);
        process.exit(1);
    }
}
console.log("Gallery preview generated in " + outputDirectory);

// index will contain preview of all the directories
let indexFile;
try{
    let indexPath = outputDirectory + '/' + INDEX_FILE_NAME;
    indexFile = await open(indexPath, 'w');
}catch(err) {
    console.error(`Couldn't create the gallery preview web page at indexPath. ${err}`);
    process.exit(1);
}
await indexFile.write(`<h1>${parentDirectoryToProcess.split('/').at(-1)} Gallery</h1>\n`);

async function getDirectories(path) {
    let directories = (await readdir(path, {withFileTypes: true}))
    .filter(dirent=>dirent.isDirectory())
    .map(dirent=>dirent.name);
    return directories;
}

let directories;
try{
    directories = await getDirectories(parentDirectoryToProcess);
}catch(err) {
    console.error(`Couldn't read the directory (${parentDirectoryToProcess}). ${err}`);
    process.exit(1);
}

for(let inputGalleryName of directories) {
    if(inputGalleryName == OUTPUT_DIRECTORY_NAME) continue;
    await generateGalleryForDirectory(inputGalleryName, indexFile, outputDirectory);
}

indexFile.close();