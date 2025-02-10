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

async function packFolders() {
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

// Exécuter les fonctions
(async () => {
  //await unpackFolders();
  await packFolders();
  //await runGitCommands();
})();
