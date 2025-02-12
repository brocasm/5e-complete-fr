const Translator = require('./Translator');
const dotenv = require('dotenv');
const fs = require('fs').promises;
const path = require('path');

// Charger les variables d'environnement à partir du fichier .env
dotenv.config();

const apiKey = process.env.DEEPL_API_KEY; // Remplacez par votre clé API DeepL
const translator = new Translator(apiKey);
const REQUEST_DELAY = 500; // Délai entre les requêtes en ms

async function trad_value(textToTranslate) {
  try {
    const translatedText = await translator.translate(textToTranslate);
    return translatedText;
  } catch (error) {
    console.error('Translation error:', error, "textToTranslate:", textToTranslate);
    return false;
  }
}

const packsDir = path.join(__dirname, 'packs'); // Dossier racine des packs


// Fonction pour traiter un fichier JSON
async function processJsonFile(filePath) {     
  try {
    await new Promise(resolve => setTimeout(resolve, REQUEST_DELAY));

    // Lire le fichier JSON
    const data = await fs.readFile(filePath, 'utf8');
    let jsonData = JSON.parse(data);

    let bModified = false;

    // Parcourir les objets et convertir les unités et valeurs
    if (jsonData.system && jsonData.system.requirements) {
      console.log(`requirements =  ${jsonData.system.requirements}`);
      oritalText = jsonData.system.requirements
      jsonData.system.requirements = await trad_value(oritalText);
      console.log(`requirements ${oritalText} => ${jsonData.system.requirements}`);        
      bModified = true;
    }

    if (jsonData.magicitems && jsonData.magicitems.destroyFlavorText ) {
        oritalText = jsonData.magicitems.destroyFlavorText 
        jsonData.magicitems.destroyFlavorText = await trad_value(oritalText);
        console.log(`destroyFlavorText ${oritalText} => ${jsonData.system.requirements}`);        
        bModified = true;
      }


    // Écrire le fichier JSON modifié
    await fs.writeFile(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
    if (bModified) console.log(`Fichier ${filePath} mis à jour.`);
  } catch (err) {
    console.error(`Erreur lors du traitement du fichier ${filePath}: ${err}`);
  }
}

// Fonction pour traiter tous les fichiers JSON dans un répertoire
async function processDirectory(directoryPath) {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      if (path.extname(filePath) === '.json') {
        await processJsonFile(filePath);
      }
    }
  } catch (err) {
    console.error(`Erreur lors de la lecture du répertoire: ${err}`);
  }
}

const subdirs = ['5e-background-features', '5e-class-features','5e-racial-features'];

// Fonction principale pour traiter tous les sous-répertoires
async function processAllDirectories() {
  for (const subdir of subdirs) {
    const subdirPath = path.join(packsDir, subdir, '_source');
    await processDirectory(subdirPath);
  }
}

processAllDirectories().catch(err => {
  console.error(`Erreur globale: ${err}`);
});