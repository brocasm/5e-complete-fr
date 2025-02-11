import fs from 'fs';
import path from 'path';
import ollama from 'ollama'; // Module Ollama pour Node.js
import cliProgress from 'cli-progress';

// Configuration
const packsDir = path.join(process.cwd(), ''); // Dossier racine des packs
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms
const force_retrad = true; // ⚠️ Définir à `false` pour sauter les fichiers existants
const model_ollama = "deepseek-r1"

// Initialisation de la barre de progression
const progressBar = new cliProgress.SingleBar({
    format: '🚀 Progression | {bar} | {percentage}% | {value}/{total} fichiers | Temps écoulé: {duration_formatted}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});

// Redirection des logs vers un fichier
const logStream = fs.createWriteStream('translation.log', { flags: 'a' });

// Sauvegarder les méthodes originales de console
const originalConsoleLog = console.log;
const originalConsoleWarn = console.warn;
const originalConsoleError = console.error;

// Rediriger console.log, console.warn, et console.error vers le fichier
console.log = (...args) => {
    logStream.write(`[LOG] ${args.join(' ')}\n`);
};
console.warn = (...args) => {
    logStream.write(`[WARN] ${args.join(' ')}\n`);
};
console.error = (...args) => {
    logStream.write(`[ERROR] ${args.join(' ')}\n`);
};

// Fonction de traduction principale avec Ollama
async function translateText(text) {
    try {        
        const response = await ollama.generate({
            model: model_ollama, // Modèle à utiliser (doit être installé localement via Ollama)
            system: 'Tu es un traducteur professionnel. Traduis exactement de l\'anglais au français en préservant :' +
                    '\n1. Les balises HTML et leur structure.' +
                    '\n2. Le style technique du texte original.' +
                    '\n3. Les termes spéciaux sans les traduire.',
            prompt: `Traduis ce texte de jeu de rôle sans ajouter de commentaires :\n\n${text}`,
            stream: false // Désactiver le streaming pour une réponse complète
        });

        return response.response;
    } catch (error) {
        console.error('Erreur Ollama:', error.message);
        return text; // On conserve le texte original en cas d'erreur
    }
}

// Traitement d'un fichier JSON
async function processJsonFile(filePath, targetDir) {
    const targetFilePath = path.join(targetDir, path.basename(filePath));

    // Vérifier si le fichier de destination existe déjà
    if (!force_retrad && fs.existsSync(targetFilePath)) {
        console.log(`⏩ Fichier déjà traduit: ${path.basename(filePath)}`);
        return; // Skip ce fichier
    }

    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);

    if (json.system?.description?.value) {
        try {
            // Ajout d'un délai entre les requêtes
            await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));
            
            const originalText = json.system.description.value;
            json.system.description.value = await translateText(originalText);
            
            // Vérification basique du résultat
            if (originalText === json.system.description.value) {
                console.warn(`⚠️ Avertissement: Pas de traduction pour ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`❌ Erreur sur ${filePath}:`, error.message);
        }
    }

    // Sauvegarde du fichier
    fs.writeFileSync(targetFilePath, JSON.stringify(json, null, 2), 'utf8');
    console.log(`✅ Fichier traduit: ${path.basename(filePath)}`);
}

// Parcours des dossiers
async function processAllSourceDirs() {
    const subDirs = fs.readdirSync(packsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // Collecte de tous les fichiers
    const allFiles = [];
    for (const subDir of subDirs) {
        const sourceDir = path.join(packsDir, subDir, '_source');
        const targetDir = path.join(packsDir, subDir, '_source_trad');

        if (fs.existsSync(sourceDir)) {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const files = fs.readdirSync(sourceDir)
                .filter(file => file.endsWith('.json'))
                .map(file => ({
                    sourcePath: path.join(sourceDir, file),
                    targetDir
                }));

            allFiles.push(...files);
        }
    }

    // Démarrage de la barre de progression
    progressBar.start(allFiles.length, 0);

    // Traitement des fichiers
    for (const file of allFiles) {
        await processJsonFile(file.sourcePath, file.targetDir);
        progressBar.increment(); // Mise à jour de la barre de progression
    }

    // Arrêt de la barre de progression
    progressBar.stop();
}

// Démarrage du script
(async () => {
    console.log('🚀 Démarrage de la traduction...');
    console.time('⏱️ Traduction terminée en');
    
    try {
        await processAllSourceDirs();
        console.log('\n🎉 Tous les fichiers ont été traités avec succès !');
    } catch (error) {
        console.error('\n❌ Erreur globale:', error);
    }
    
    console.timeEnd('⏱️ Traduction terminée en');

    // Fermer le flux de log
    logStream.end();
})();