const fs = require('fs');
const path = require('path');
const { Mistral } = require('@mistralai/mistralai');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');

// Configuration
const packsDir = path.join(__dirname, ''); // Dossier racine des packs
const MISTRAL_API_KEY = 'jqIAeGgCFmNeXHfBc0JtIgjJNRTaxa1r'; // ⚠️ À remplacer
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms
const force_retrad = false; // ⚠️ Définir à `false` pour sauter les fichiers existants
const multi_thread_count = 3; // Nombre de threads simultanés

// État global
let fileQueue = []; // File des fichiers à traiter
let processedCount = 0; // Nombre de fichiers traités
let totalFiles = 0; // Nombre total de fichiers
let errors = []; // Journal des erreurs

// Formatage de la progression
function formatProgress() {
    const progress = (processedCount / totalFiles * 100).toFixed(1);
    return `[${processedCount.toString().padStart(4, ' ')}/${totalFiles}] ${progress}%`;
}

// Worker thread
if (!isMainThread) {
    const { filePath, targetDir } = workerData;

    (async () => {
        try {
            const targetFilePath = path.join(targetDir, path.basename(filePath));
            
            // Vérifier si le fichier de destination existe déjà
            if (!force_retrad && fs.existsSync(targetFilePath)) {
                parentPort.postMessage({ status: 'skipped', file: filePath });
                return;
            }

            const data = fs.readFileSync(filePath, 'utf8');
            const json = JSON.parse(data);

            if (json.system?.description?.value) {
                // Ajout d'un délai entre les requêtes
                await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));

                // Traduction du texte
                const client = new Mistral({ apiKey: MISTRAL_API_KEY });
                const chatResponse = await client.chat.complete({
                    model: 'mistral-small-latest',
                    messages: [{
                        role: 'system',
                        content: 'Tu es un traducteur professionnel. Traduis exactement de l\'anglais au français en préservant:' +
                                 '\n1. Les balises HTML et leur structure' +
                                 '\n2. Le style technique du texte original' +
                                 '\n3. Les termes spéciaux sans les traduire'
                    },
                    {
                        role: 'user',
                        content: `Traduis ce texte de jeu de rôle sans ajouter de commentaires:\n\n${json.system.description.value}`
                    }],
                    temperature: 0.3,
                    max_tokens: 4000
                });

                json.system.description.value = chatResponse.choices[0].message.content;
            }

            // Sauvegarde du fichier traduit
            fs.writeFileSync(targetFilePath, JSON.stringify(json, null, 2), 'utf8');
            parentPort.postMessage({ status: 'success', file: filePath });
        } catch (error) {
            parentPort.postMessage({ 
                status: 'error', 
                file: filePath, 
                message: error.message 
            });
        }
    })();
}

// Main thread
if (isMainThread) {
    (async () => {
        console.log('🚀 Démarrage de la traduction...');
        const startTime = Date.now();

        // Collecte de tous les fichiers à traiter
        const subDirs = fs.readdirSync(packsDir, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => path.join(packsDir, dirent.name, '_source'));

        for (const sourceDir of subDirs) {
            if (fs.existsSync(sourceDir)) {
                const targetDir = path.join(path.dirname(sourceDir), '_source_trad');
                if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

                fs.readdirSync(sourceDir)
                    .filter(file => file.endsWith('.json'))
                    .forEach(file => fileQueue.push({
                        sourcePath: path.join(sourceDir, file),
                        targetDir
                    }));
            }
        }

        totalFiles = fileQueue.length;
        console.log(`📂 Total de fichiers à traiter: ${totalFiles}`);
        console.log('⏳ Démarrage du traitement...\n');

        // Gestion de la pool de workers
        let activeWorkers = 0;
        let queueIndex = 0;

        const processQueue = () => {
            while (activeWorkers < multi_thread_count && queueIndex < fileQueue.length) {
                const { sourcePath, targetDir } = fileQueue[queueIndex++];
                activeWorkers++;

                const worker = new Worker(__filename, { 
                    workerData: { filePath: sourcePath, targetDir } 
                });

                worker.on('message', (msg) => {
                    processedCount++;
                    activeWorkers--;

                    // Mise à jour de la progression
                    process.stdout.write(`\r${formatProgress()} ` +
                        `- Actifs: ${activeWorkers} ` +
                        `- Erreurs: ${errors.length}   `);

                    if (msg.status === 'error') {
                        errors.push({ file: sourcePath, error: msg.message });
                        console.error("1: " + msg.message )
                    }

                    // Assigner un nouveau fichier au worker
                    processQueue();
                });

                worker.on('error', (e) => {
                    errors.push({ file: sourcePath, error: e.message });
                    console.error("2: " + msg.message )
                    activeWorkers--;
                    processQueue();
                });
            }

            // Si tous les fichiers sont traités
            if (processedCount === totalFiles) {
                const duration = ((Date.now() - startTime) / 1000).toFixed(1);
                console.log(`\n\n✅ Traduction terminée en ${duration}s`);
                console.log(`Erreurs: ${errors.length}`);
                
                if (errors.length > 0) {
                    fs.writeFileSync('errors.log', JSON.stringify(errors, null, 2));
                    console.log('📄 Journal des erreurs sauvegardé dans errors.log');
                }
            }
        };

        // Démarrer la pool de workers
        processQueue();
    })();
}