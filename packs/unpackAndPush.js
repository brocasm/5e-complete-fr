const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

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
  const rootDir = '.';
  const folders = fs.readdirSync(rootDir, { withFileTypes: true })
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
async function processAllSourceDirs(packsDir) {
  const subDirs = fs.readdirSync(packsDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);

  // Collecte de tous les fichiers
  const allFiles = [];
  for (const subDir of subDirs) {
      const sourceDir = path.join(packsDir, subDir, '_source');
      const targetDir = path.join(packsDir, subDir, '_source_trad');

      if (fs.existsSync(sourceDir)) {
          
          if (fs.existsSync(targetDir)) {
            fs.rmSync(sourceDir, { recursive: true });
            console.log(`Supprimé le dossier __source : ${sourceDir}`);
            fs.renameSync(targetDir, sourceDir);
             
          }

         
      }
  }
  
}

async function packFolders() {
  await init_workon_fvtt();
  const rootDir = '.';
  const folders = fs.readdirSync(rootDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory() && dirent.name !== '__source')
    .map(dirent => dirent.name);

  for (const folder of folders) {
    const command = `fvtt package pack ${folder}`;
    try {
      await runCommand(command);
      console.log(`Successfully packed ${folder}`);
    } catch (error) {
      console.error(`Failed to pack ${folder}: ${error}`);
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
      await processAllSourceDirs(".");
      break;
    default:
      console.log("Action non reconnue. Utilisez 'unpack', 'pack', 'process' ou 'git'.");
      break;
  }
})();