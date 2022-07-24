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
    let dirContent = await readdir(path + '/' + inputGalleryName);
    // todo : filter out non image/videos (and directories)
    dirContent.sort((a, b)=>a.localeCompare(b, 'en', {numeric: true}));
    indexFile.write(`${inputGalleryName} (${dirContent.length}) <br>`);
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
            let index_to_take = 1 + Math.floor(((dirContent.length-1)/PREVIEW_COUNT-1)*i);
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
        let fullpreviewFilePath = path + '/' + inputGalleryName + '/' + previewFilename;
        let fullthumbnailFilePath = outputDirectory + '/' + inputGalleryName + '/' + 'thumb_' + previewFilename + '.jpg';
        if(isImage(previewFilename)) {
            await exec(`convert '${fullpreviewFilePath}' -resize 100x100 '${fullthumbnailFilePath}'`);
        } else if(isVideo(previewFilename)) {
            await exec(`ffmpeg -nostdin -y -ss 4 -i '${fullpreviewFilePath}' -vf scale=w=120:h=120:force_original_aspect_ratio=decrease -frames:v 1 '${fullthumbnailFilePath}'`);
        } else {
            throw new Error(`Asked to create preview for file which is neither an image nor a video: ${previewFilename}`);
        }
        indexFile.write(`<img src="${fullthumbnailFilePath}"></img>`)
    }
    indexFile.write('<br><br>');
}

async function getDirectories(path) {
    let directories = (await readdir(path, {withFileTypes: true}))
    .filter(dirent=>dirent.isDirectory())
    .map(dirent=>dirent.name);
    return directories;
}

if(process.argv.length < 3) {
    console.log("Missing path argument.");
    process.exit(1);
}
let path = process.argv.at(-1);

let directories;
try{
    directories = await getDirectories(path);
}catch(err) {
    console.error(`Couldn't read the directory (${path}). ${err}`);
    process.exit(1);
}

const outputDirectory = path + '/' + OUTPUT_DIRECTORY_NAME;
try {
    await mkdir(outputDirectory)
}catch(err) {
    if(err.code != 'EEXIST') {
        console.error(`Couldn't create the outpout directory (${outputDirectory})`);
        process.exit(1);
    }
}

// index
let indexFile;
try{
    indexFile = await open(outputDirectory + '/' + INDEX_FILE_NAME, 'w');
}catch(err) {
    console.error(`Couldn't create the output directory : ${err}`);
    process.exit(1);
}

indexFile.write(`<h1>${path.split('/').at(-1)} Gallery</h1>\n`);

for(let inputGalleryName of directories) {
    if(inputGalleryName == OUTPUT_DIRECTORY_NAME) continue;
    await generateGalleryForDirectory(inputGalleryName, indexFile, outputDirectory);
}

indexFile.close();