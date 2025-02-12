const Translator = require('./Translator');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');


// Charger les variables d'environnement à partir du fichier .env
dotenv.config();


const apiKey = process.env.DEEPL_API_KEY; // Remplacez par votre clé API DeepL
const translator = new Translator(apiKey);

async function trad_value(textToTranslate) {
    try {
      const translatedText = await translator.translate(textToTranslate);
      return translatedText;
    } catch (error) {
      console.error('Translation error:', error), "textToTranslate: ", textToTranslate;
      return false;
    }
  }


const packsDir = path.join(__dirname, 'packs'); // Dossier racine des packs
const spellsDir = path.join(packsDir,'5e-spells', "_source");

// Fonction pour convertir des pieds en mètres
function feetToMeters(feet) {    
    return parseInt(Math.round(feet * 0.3048), 10);
}

// Fonction pour traiter un fichier JSON
function processJsonFile(filePath) {
    try {
        // Lire le fichier JSON
        const data = fs.readFileSync(filePath, 'utf8');
        let jsonData = JSON.parse(data);   
        
        let bModified = false;
        
        // Parcourir les objets et convertir les unités et valeurs
        if (jsonData.system && jsonData.system.target && jsonData.system.target.units === 'ft') {
            jsonData.system.target.value = feetToMeters(jsonData.system.target.value);
            jsonData.system.target.units = 'm';
            console.log(`Converti system.target.value de ${filePath} ${jsonData.system.target.value}`);
            bModified = true
        }

        if (jsonData.system && jsonData.system.range && jsonData.system.range.units === 'ft') {
            jsonData.system.range.value = feetToMeters(jsonData.system.range.value);
            jsonData.system.range.units = 'm';
            console.log(`Converti system.range.value de ${filePath} ${jsonData.system.range.value}`);
            bModified = true
        }

        // Écrire le fichier JSON modifié
        fs.writeFileSync(filePath, JSON.stringify(jsonData, null, 2), 'utf8');
        if(bModified) console.log(`Fichier ${filePath} mis à jour.`);
    } catch (err) {
        console.error(`Erreur lors du traitement du fichier ${filePath}: ${err}`);
    }
}

// Fonction pour traiter tous les fichiers JSON dans un répertoire
function processDirectory(directoryPath) {
    fs.readdir(directoryPath, (err, files) => {
        if (err) {
            console.error(`Erreur lors de la lecture du répertoire: ${err}`);
            return;
        }

        files.forEach(file => {
            const filePath = path.join(directoryPath, file);
            if (path.extname(filePath) === '.json') {
                processJsonFile(filePath);
            }
        });
    });
}


processDirectory(spellsDir);