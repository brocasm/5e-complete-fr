const fs = require('fs');
const path = require('path');

const errorLogFile = path.join(__dirname, 'error_log.json');
let errorFiles = [];

function parseDirs(foundFiles){
    
    // Copier les fichiers trouvés vers le nouveau dossier
    foundFiles.forEach(file => {
    const destinationPath = file.sourcePath.replace('_source', '_source_to_trad');

    // Créer le dossier de destination s'il n'existe pas
    const destinationDir = path.dirname(destinationPath);
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    fs.copyFileSync(file.sourcePath, destinationPath);
    console.log(`Copied ${file.sourcePath} to ${destinationPath}`);
    });


}


if (fs.existsSync(errorLogFile)) {
    const data = fs.readFileSync(errorLogFile, 'utf8');
    errorFiles = JSON.parse(data);
    console.log(errorFiles)
    //parseDirs(errorFiles);
}else{
    console.error("Pas de fichier ", errorLogFile)
}


