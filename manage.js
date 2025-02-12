const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const cliProgress = require('cli-progress');
const readline = require('readline');

// Initialisation de la barre de progression
const progressBar = new cliProgress.SingleBar({
  format: '🚀 Progression | {bar} | {percentage}% | {value}/{total} fichiers | Erreurs: {errorCount} | Temps écoulé: {duration_formatted}',
  barCompleteChar: '\u2588',
  barIncompleteChar: '\u2591',
  hideCursor: true
});


const packsDir = path.join(__dirname, 'packs'); // Dossier racine des packs
const errorLogFile = path.join(__dirname, 'error_log.json');
let errorFiles = [];

// Fonction pour exécuter une commande shell
function runCommand(command) {
  return new Promise((resolve, reject) => {
    exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`Error: ${error.message}`);
        return;
      }
      if (stderr) {
        reject(`Stderr: ${stderr}`);
        return;
      }
      resolve(stdout);
    });
  });
}

// Fonction pour parcourir les dossiers et exécuter la commande fvtt package unpack
async function unpackFolders() {
  await init_workon_fvtt();  
  const folders = fs.readdirSync(packsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '__source')
    .map(dirent => dirent.name);

  for (const folder of folders) {
    const command = `fvtt package unpack ${folder}`;
    try {
      await runCommand(command);
      console.log(`Successfully unpacked ${folder}`);      
    } catch (error) {
      console.error(`Failed to unpack ${folder}: ${error}`);
    }
  }
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
      const sourceTradDir = path.join(packsDir, subDir, '_source_trad');
      const to_tradDir = path.join(packsDir,subDir,'_source_to_trad');

      if (!fs.existsSync(sourceDir)) {
        //Création du dossier _source s'il n'existe pas
        fs.mkdirSync(sourceDir, { recursive: true });
      }

      if(fs.existsSync(sourceTradDir)){
        // Lire tous les fichiers dans le dossier _source_trad      
        const files = fs.readdirSync(sourceTradDir);   
        files.forEach(file => {
          const sourceFilePath = path.join(sourceTradDir, file);
          const destinationFilePath = path.join(sourceDir, file);
          
          try {
            // Déplacer ou remplacer le fichier dans le dossier _source
            fs.renameSync(sourceFilePath, destinationFilePath);
            console.log(`✅ Déplacé ${sourceFilePath} vers ${destinationFilePath}`);
          } catch (error) {
            console.error(`❌ Erreur sur ${sourceFilePath}:`, error.message);
          }
        });

        console.log('Tous les fichiers ont été déplacés avec succès. ', subDir);
        fs.rmSync(sourceTradDir, { recursive: true, force: true });
        fs.rmSync(to_tradDir, { recursive: true, force: true });
      }else{
        console.log(`⏩ SKIP Pas de dossier _source_trad: `, subDir);
      }
      
        
  }
  
}

async function packFolders() {
  await init_workon_fvtt();  
  const folders = fs.readdirSync(packsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '__source')
    .map(dirent => dirent.name);

  for (const folder of folders) {
    const sourceDir = path.join(packsDir, folder, '_source');
    if (fs.existsSync(sourceDir)) {      
      const command = `fvtt package pack ${folder}`;
      try {
        await runCommand(command);
        console.log(`Successfully packed ${folder}`);
        folder.rmSync({ recursive: true, force: true })
      } catch (error) {
        console.error(`Failed to pack ${folder}: ${error}`);
      }
    }
  }
}

// Fonction pour exécuter les commandes git
async function runGitCommands() {
  try {
    await runCommand('git add .');
    await runCommand('git commit -m "new export"');
    await runCommand('git push');
    console.log('Git commands executed successfully');
  } catch (error) {
    console.error(`Failed to execute git commands: ${error}`);
  }
}

async function init_workon_fvtt(){
  const command = `fvtt package workon 5e-complete-fr`;
    try {
      await runCommand(command);
      console.log(`Successfully workon `);
    } catch (error) {
      console.error(`Failed to workon: ${error}`);
    }
}


async function retrate_error_files(){

  if (fs.existsSync(errorLogFile)) {
      const data = fs.readFileSync(errorLogFile, 'utf8');
      errorFiles = JSON.parse(data);         
  }else{
      console.error("Pas de fichier ", errorLogFile)
      return false;
  }

  progressBar.start(errorFiles.length, 0);
  
  // Copier les fichiers trouvés vers le nouveau dossier
  errorFiles.forEach(file => {
  const destinationPath = file.filePath.replace('_source', '_source_to_trad');

  // Créer le dossier de destination s'il n'existe pas
  const destinationDir = path.dirname(destinationPath);
  if (!fs.existsSync(destinationDir)) {
      fs.mkdirSync(destinationDir, { recursive: true });
  }

  fs.copyFileSync(file.filePath, destinationPath);  
  progressBar.increment()
  });

  progressBar.stop()


}

// Fonction pour poser une question à l'utilisateur
function askQuestion(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}




const action = process.argv[2];


// Exécuter les fonctions en fonction du paramètre
(async () => {
  switch (action) {
    case 'unpack':
      await unpackFolders();
      break;
    case 'pack':
      await packFolders();
      break;
    case 'git':
      await runGitCommands();
      break;
    case 'process':
      await processAllSourceDirs();
      const answer = await askQuestion('Voulez-vous lancer pack directement ? (y/n) ');
      if (answer.toLowerCase() === 'y') {
        await packFolders();
      }
      break;
    case 'retrate':
      await retrate_error_files();
      break;
    default:
      console.log("Action non reconnue. Utilisez 'unpack', 'pack', 'process', 'retrate' ou 'git'.");
      break;
  }
})();