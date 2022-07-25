#!/usr/bin/env node
// Can have a # for shebang in js files : 
// https://github.com/tc39/proposal-hashbang

/*
Generate web pages allowing to easily browse directories of images and videos.

Give the path to a directory itself containing directories made of
medias (images/videos). It generates a web page allowing to browse and watch
the medias in all those directories from within a browser.

External dependencies : convert (imagemagick) a and ffmpeg.

Tested on linux. May no work on windows due to difference in path separator
(\ for windows, / for linux/URLs).
*/

import {readdir, mkdir, open} from 'fs/promises';
import {resolve, sep} from 'path';
import * as indexGenerator from './index-generator.mjs';

const OUTPUT_DIRECTORY_NAME = "generatedGallery";
const INDEX_FILE_NAME = "index.html";


if(process.argv.length < 3) {
    console.log("Missing arg : directory containing directories of media.");
    process.exit(1);
}
let parentDirectoryToProcess = process.argv.at(-1);
// Need absolute path so that name of the parent directory is available
// (wouldn't be the case with a path such as '.').
parentDirectoryToProcess = resolve(parentDirectoryToProcess);

const outputDirectory = parentDirectoryToProcess + sep + OUTPUT_DIRECTORY_NAME;
try {
    await mkdir(outputDirectory)
}catch(err) {
    if(err?.code != 'EEXIST') {
        console.error(`Couldn't create the output directory (${outputDirectory})`);
        process.exit(1);
    }
}
console.log("Generating gallery preview in " + outputDirectory);

// index will contain preview of all the directories
let indexFile;
try{
    let indexPath = outputDirectory + sep + INDEX_FILE_NAME;
    indexFile = await open(indexPath, 'w');
}catch(err) {
    console.error(`Couldn't create the gallery preview web page at indexPath. ${err}`);
    process.exit(1);
}

indexGenerator.writeHeader(indexFile, parentDirectoryToProcess);

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
    await indexGenerator.generateGalleryForDirectory(
        indexFile, 
        parentDirectoryToProcess, 
        inputGalleryName, 
        outputDirectory);
}

indexGenerator.writeFooter(indexFile);

indexFile.close();