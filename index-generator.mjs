/*
Generates the main index web page containing a preview of the subdirectories.
*/
import {basename} from 'path';
import {readdir, mkdir} from 'fs/promises';
import {isImage, isVideo} from './utils.mjs';
import {generateThumbnail} from './thumbnail.mjs';

export {writeHeader, generateGalleryForDirectory, writeFooter};

const PREVIEW_FILES_COUNT = 4;

async function writeHeader(indexFile, parentDirectoryToProcess) {
    await indexFile.write(
        `<h1>${basename(parentDirectoryToProcess)} Gallery</h1>\n`);
}

async function getImagesAndVideoFiles(directory) {
    return (await readdir(directory, {withFileTypes: true}))
        .filter(dirent=>dirent.isFile())
        .map(dirent=>dirent.name)
        .filter(name =>isImage(name) || isVideo(name));
}

function selectPreviewFiles(dirContent) {
    let filesSelectedForPreview;
    if(dirContent.length <= PREVIEW_FILES_COUNT) {
        filesSelectedForPreview = dirContent;
    } else {
        // always take the first
        filesSelectedForPreview = dirContent.slice(0, 1);
        // then space out the remaining ones
        for(let i = 0;i<PREVIEW_FILES_COUNT-1;i++) {
            let index_to_take = 
                Math.floor((dirContent.length-1)/(PREVIEW_FILES_COUNT-1)*(i+1));
            filesSelectedForPreview.push(dirContent[index_to_take]);
        }
    }
    return filesSelectedForPreview;
}

async function generatePreviewForOneFile(
    indexFile,
    previewFilePath,
    thumbnailDestinationDirectory) {
    
    let thumbnailFilePathRelativeToOutputDirectory;
    try {
        thumbnailFilePathRelativeToOutputDirectory = 
            await generateThumbnail(
                previewFilePath,
                thumbnailDestinationDirectory);
    } catch (error) {
        console.error(
            `Couldn't generate thumbnail for ${previewFilePath}.`,
            error.message);
        // still generate the img in the page even if thumbnail generation
        // failed (will display a broken image symbol in the browser).
        thumbnailFilePathRelativeToOutputDirectory = '';
    }
        await indexFile.write(
            `<img src="${thumbnailFilePathRelativeToOutputDirectory}"></img>\n`);
}

async function generateGalleryForDirectory(
    indexFile, 
    parentDirectoryToProcess, 
    inputGalleryName, 
    outputDirectory) {
    
    let dirContent = await getImagesAndVideoFiles(
        parentDirectoryToProcess + '/' + inputGalleryName);
    // numeric sort so that '2.jpg' appears before '10.jpg'
    dirContent.sort((a, b)=>a.localeCompare(b, 'en', {numeric: true}));
    
    await indexFile.write(`${inputGalleryName} (${dirContent.length}) <br>\n`);
    
    let filesSelectedForPreview = selectPreviewFiles(dirContent);

    try {
        await mkdir(outputDirectory + '/' + inputGalleryName);
    }catch(err) {
        if(err?.code != 'EEXIST') {
            throw err;
        }
    }

    for(var previewFilename of filesSelectedForPreview) {
        let previewFilePath = 
            parentDirectoryToProcess +
            '/' + inputGalleryName +
            '/' + previewFilename;
        let thumbnailDestinationDirectory = 
            outputDirectory + '/' + inputGalleryName;
        
        await generatePreviewForOneFile(
            indexFile,
            previewFilePath,
            thumbnailDestinationDirectory);
    }
    await indexFile.write('<br><br>\n');
}

async function writeFooter(indexFile) {
    await indexFile.write(`<br>\nGenerated at ${new Date().toLocaleString()}\n`);
}