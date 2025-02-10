const fs = require('fs');
const path = require('path');
const { Mistral } = require('@mistralai/mistralai');

// Configuration
const packsDir = path.join(__dirname, ''); // Dossier racine des packs
const MISTRAL_API_KEY = 'jqIAeGgCFmNeXHfBc0JtIgjJNRTaxa1r';// ⚠️ À remplacer
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms
const force_retrad = true; // ⚠️ Définir à `false` pour sauter les fichiers existants

// Initialisation du client Mistral
const client = new Mistral({ apiKey: MISTRAL_API_KEY });

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
            model: 'mistral-small-latest', // Modèle Mistral
            messages: prompt,
            temperature: 0.3, // Contrôle de la créativité
            max_tokens: 4000, // Limite de tokens
        });

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

    for (const subDir of subDirs) {
        const sourceDir = path.join(packsDir, subDir, '_source');
        const targetDir = path.join(packsDir, subDir, '_source_trad');

        if (fs.existsSync(sourceDir)) {
            if (!fs.existsSync(targetDir)) {
                fs.mkdirSync(targetDir, { recursive: true });
            }

            const files = fs.readdirSync(sourceDir);
            console.log(`\n📁 Traitement de ${subDir} (${files.length} fichiers)...`);

            for (const file of files) {
                if (path.extname(file) === '.json') {
                    const filePath = path.join(sourceDir, file);
                    await processJsonFile(filePath, targetDir);
                }
            }
        }
    }
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
})();