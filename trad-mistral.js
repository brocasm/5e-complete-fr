const fs = require('fs');
const path = require('path');
const { Mistral } = require('@mistralai/mistralai');
const cliProgress = require('cli-progress');
const dotenv = require('dotenv');
const yargs = require('yargs/yargs');
const { hideBin } = require('yargs/helpers');

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

// Configuration des paramètres de ligne de commande
const argv = yargs(hideBin(process.argv))
    .option('force-retrad', {
        alias: 'f',
        description: 'Forcer la retraduction des fichiers existants si non skip',
        type: 'boolean',
        default: false
    })
    .help()
    .alias('help', 'h').argv;

// Configuration
const packsDir = path.join(__dirname, 'packs'); // Dossier racine des packs
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY; // ⚠️ À remplacer
const MISTRAL_MODEL = 'mistral-small-latest'
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms
const force_retrad = argv.forceRetrad;



// Vérification des configurations
if (!fs.existsSync(packsDir)) {
    console.error(`Le dossier des packs n'existe pas : ${packsDir}`);
    process.exit(1);
}

if (!MISTRAL_API_KEY) {
    console.error('La clé API Mistral est manquante.');
    process.exit(1);
}

const CIBLE_DIR = "_source_to_trad"; // "_source" ou "_source_to_trad"

// Initialisation du client Mistral
const client = new Mistral({ apiKey: MISTRAL_API_KEY });

// Initialisation de la barre de progression
const progressBar = new cliProgress.SingleBar({
    format: '🚀 Progression | {bar} | {percentage}% | {value}/{total} fichiers | Erreurs: {errorCount} | Temps écoulé: {duration_formatted}',
    barCompleteChar: '\u2588',
    barIncompleteChar: '\u2591',
    hideCursor: true
});

// Redirection des logs vers un fichier
const logStream = fs.createWriteStream('translation.log', { flags: 'a' }); // 'a' pour append (ajouter au fichier)

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


const errorLogFile = path.join(__dirname, 'error_log.json');
let errorFiles = [];

function logError(filePath, errorMessage) {
    const errorEntry = {
        filePath: filePath,
        errorMessage: errorMessage,
        timestamp: new Date().toISOString()
    };

    errorFiles.push(errorEntry);

    // Écrire le tableau mis à jour dans le fichier JSON
    fs.writeFileSync(errorLogFile, JSON.stringify(errorFiles, null, 2), 'utf8');
}

// Fonction de traduction principale
async function translateText(text) {
    const prompt = [
        {
            role: 'system',
            content: 'Tu es un traducteur professionnel. Traduis exactement de l\'anglais au français en préservant:' +
                     '\n1. Les balises HTML et leur structure' +
                     '\n2. Le style technique du texte original' +
                     '\n3. Les termes spéciaux sans les traduire'
        },
        {
            role: 'user',
            content: `Traduis ce texte de jeu de rôle sans ajouter de commentaires:\n\n${text}`
        }
    ];

    try {
        const chatResponse = await client.chat.complete({
            model: MISTRAL_MODEL, // Modèle Mistral
            messages: prompt,
            temperature: 0.3, // Contrôle de la créativité
            max_tokens: 4000, // Limite de tokens
        });        
        console.debug(chatResponse.choices[0].message)
        return chatResponse.choices[0].message.content;
    } catch (error) {
        console.error('Erreur Mistral:', error.message);
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
                logError(filePath.replace('_source_to_trad', '_source'),"Pas de traduction effectuée");
            }
        } catch (error) {
            console.error(`❌ Erreur sur ${filePath}:`, error.message);
            logError(filePath,error.message)
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
        const sourceDir = path.join(packsDir, subDir, CIBLE_DIR);
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
        progressBar.increment({ errorCount: errorFiles.length }); // Mise à jour de la barre de progression
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