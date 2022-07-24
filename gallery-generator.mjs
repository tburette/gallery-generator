import {readdir, mkdir, open} from 'fs/promises';

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

async function generateGalleryForDirectory(indexFile, directory) {
    let dirContent = await readdir(path + '/' + directory);
    dirContent.sort((a, b)=>a.localeCompare(b, 'en', {numeric: true}));
    indexFile.write(`${directory} (${dirContent.length}) <br>`);
    const PREVIEW_COUNT = 4;
    let previewFiles;
    if(dirContent.length <= PREVIEW_COUNT) {
        previewFiles = dirContent;
    } else {
        //always take the first
        previewFiles = dirContent.slice(0, 1);
        for(let i = 0;i<PREVIEW_COUNT-1;i++) {
            // take from the second image in the files to the last
            let index_to_take = 1 + Math.floor(((dirContent.length-1)/PREVIEW_COUNT-1)*i);
            previewFiles.push(dirContent[index_to_take]);
        }
    }

    for(var file of previewFiles) {
        // must pick img for image type
        indexFile.write(`<img src="${path}/${directory}/${file}" width="80"></img>`)
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

for(let directory of directories) {
    if(directory == OUTPUT_DIRECTORY_NAME) continue;
    await generateGalleryForDirectory(indexFile, directory);
}

indexFile.close();