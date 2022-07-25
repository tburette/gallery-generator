/*
Generates the main index web page containing a preview of the subdirectories.
*/
import {basename} from 'path';
import {readdir, mkdir} from 'fs/promises';
import {isImage, isVideo} from './utils.mjs';
import {generateThumbnail} from './thumbnail.mjs';

export {writeHeader, generateGalleryForDirectory}


async function writeHeader(indexFile, parentDirectoryToProcess) {
    await indexFile.write(`<h1>${basename(parentDirectoryToProcess)} Gallery</h1>\n`);
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
        let fullThumbnailDirectory = outputDirectory + '/' + inputGalleryName;
        let thumbnailFilePathRelativeToOutputDirectory;
        try {
            thumbnailFilePathRelativeToOutputDirectory = await generateThumbnail(fullpreviewFilePath, fullThumbnailDirectory);
        } catch (error) {
            console.error(`Couldn't generate thumbnail for ${fullpreviewFilePath}.`, error.message);
            // still generate the img in the page even if thumbnail generation
            // failed (will display a broken image symbol in the browser).
            thumbnailFilePathRelativeToOutputDirectory = '';
        }
            await indexFile.write(`<img src="${thumbnailFilePathRelativeToOutputDirectory}"></img>`)

    }
    await indexFile.write('<br><br>');
}