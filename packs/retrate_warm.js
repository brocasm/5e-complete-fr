const fs = require('fs');
const path = require('path');

// Chemin vers le fichier de log
const logFilePath = path.join(__dirname, 'translation.log');

// Fonction pour parser le fichier de log
function parseLogFile(filePath) {
    // Lire le fichier de log
    const logContent = fs.readFileSync(filePath, 'utf-8');

    // Diviser le contenu en lignes
    const lines = logContent.split('\n');

    // Tableau pour stocker les noms de fichiers associés aux avertissements
    const warnedFiles = [];

    // Parcourir chaque ligne
    lines.forEach(line => {
        // Vérifier si la ligne contient un avertissement [WARN]
        if (line.includes('[WARN]')) {
            // Extraire le nom du fichier
            const fileNameMatch = line.match(/Pas de traduction pour (\w+\.json)/);
            if (fileNameMatch && fileNameMatch[1]) {
                warnedFiles.push(fileNameMatch[1]);
            }
        }
    });

    return warnedFiles;
}

function parseDirs(searchedFiles){
    const subDirs = fs.readdirSync(__dirname, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);
    
    const allFiles = [];    
    for (const subDir of subDirs) {
        const sourceDir = path.join(__dirname, subDir, '_source');        

        if (fs.existsSync(sourceDir)) {            

            const files = fs.readdirSync(sourceDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    sourcePath: path.join(sourceDir, file),
                    fileName: file
                }));

            allFiles.push(...files);
        }
    }    
    const foundFiles = allFiles.filter(file => searchedFiles.includes(file.fileName));
    

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
// Exécuter la fonction et afficher les résultats
const warnedFiles = parseLogFile(logFilePath);
parseDirs(warnedFiles);

