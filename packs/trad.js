const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Configuration
const packsDir = path.join(__dirname, ''); // Dossier racine des packs
const DEEPSEEK_API_KEY = 'sk-2ef5c1ac28f7420d8f44bd49f239cde8'; // ⚠️ À remplacer
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms

// Initialisation du client Deepseek
const openai = new OpenAI({
    baseURL: 'https://api.deepseek.com', // Point d'accès Deepseek
    apiKey: DEEPSEEK_API_KEY,
});

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
        const completion = await openai.chat.completions.create({
            messages: prompt,
            model: 'deepseek-chat', // Modèle Deepseek
            temperature: 0.3, // Contrôle de la créativité
            max_tokens: 4000, // Limite de tokens
        });

        return completion.choices[0].message.content;
    } catch (error) {
        console.error('Erreur Deepseek:', error.message);
        return text; // On conserve le texte original en cas d'erreur
    }
}

// Traitement d'un fichier JSON
async function processJsonFile(filePath, targetDir) {
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
                console.warn(`Avertissement: Pas de traduction pour ${path.basename(filePath)}`);
            }
        } catch (error) {
            console.error(`Erreur sur ${filePath}:`, error.message);
        }
    }

    // Sauvegarde du fichier
    const targetPath = path.join(targetDir, path.basename(filePath));
    fs.writeFileSync(targetPath, JSON.stringify(json, null, 2), 'utf8');
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
            console.log(`\nTraitement de ${subDir} (${files.length} fichiers)...`);

            for (const file of files) {
                if (path.extname(file) === '.json') {
                    const filePath = path.join(sourceDir, file);
                    await processJsonFile(filePath, targetDir);
                    console.log(`✓ ${file}`);
                }
            }
        }
    }
}

// Démarrage du script
(async () => {
    console.log('Démarrage de la traduction...');
    console.time('Traduction terminée en');
    
    try {
        await processAllSourceDirs();
        console.log('\nTous les fichiers ont été traités avec succès !');
    } catch (error) {
        console.error('\nErreur globale:', error);
    }
    
    console.timeEnd('Traduction terminée en');
})();