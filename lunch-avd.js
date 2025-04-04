import { exec } from 'child_process';
import readline from 'readline';
import chalk from 'chalk';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

// In ES modules, __dirname is not defined so we need to simulate it.
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function to run shell commands and return a promise.
function runCommand(cmd, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(chalk.blue(`Running command: ${cmd}`));
    exec(cmd, options, (err, stdout, stderr) => {
      if (err) {
        console.error(chalk.red(`Error running command: ${cmd}`));
        console.error(chalk.red(stderr));
        return reject(err);
      }
      console.log(chalk.green(`Command succeeded: ${cmd}`));
      resolve(stdout);
    });
  });
}

// Lists available AVDs using the 'emulator -list-avds' command.
async function listAvds() {
  return new Promise((resolve, reject) => {
    exec('emulator -list-avds', (err, stdout, stderr) => {
      if (err) {
        console.error(chalk.red('Error listing AVDs. Ensure the Android SDK is installed and "emulator" is in your PATH.'));
        return reject(err);
      }
      const avds = stdout.split('\n').map(a => a.trim()).filter(a => a);
      if (avds.length === 0) {
        console.error(chalk.red('No AVDs found. Please create one using Android Studio.'));
        return resolve([]);
      }
      resolve(avds);
    });
  });
}

// Helper function to prompt user input using readline (wrapped in a promise).
function prompt(query) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise(resolve => rl.question(query, ans => {
    rl.close();
    resolve(ans);
  }));
}

// Prompts the user to choose one of the available AVDs.
async function chooseAvd(avds) {
  console.log(chalk.blue('Available AVDs:'));
  avds.forEach((avd, index) => console.log(`${index + 1}. ${avd}`));

  const answer = await prompt(chalk.yellow('Choose an AVD by number: '));
  const index = parseInt(answer, 10);
  if (isNaN(index) || index < 1 || index > avds.length) {
    console.error(chalk.red('Invalid selection.'));
    return null;
  }
  return avds[index - 1];
}

// Polls until a device is online by checking 'adb devices'.
async function waitForDevice(timeout = 60000) {
  const startTime = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      exec('adb devices', (err, stdout, stderr) => {
        if (err) {
          console.error(chalk.red('Error running adb devices:'), err);
          return reject(err);
        }
        // Skip the first line ("List of devices attached")
        const lines = stdout.split('\n').slice(1).map(line => line.trim()).filter(Boolean);
        if (lines.some(line => line.endsWith('device'))) {
          console.log(chalk.green('Device is online.'));
          return resolve();
        } else {
          if (Date.now() - startTime > timeout) {
            return reject(new Error('Timeout waiting for device to come online.'));
          }
          console.log(chalk.yellow('Waiting for device to boot...'));
          setTimeout(check, 3000);
        }
      });
    };
    check();
  });
}

// Ensures the Gradle wrapper exists in the android directory. If not, attempts to build it.
async function ensureGradleWrapper() {
  const gradlewName = os.platform() === 'win32' ? 'gradlew.bat' : 'gradlew';
  const gradlewPath = path.join(__dirname, 'android', gradlewName);
  if (!fs.existsSync(gradlewPath)) {
    console.log(chalk.yellow('Gradle wrapper not found. Building Gradle wrapper...'));
    try {
      await runCommand(`cd android && gradle wrapper`);
      console.log(chalk.green('Gradle wrapper built successfully.'));
    } catch (err) {
      console.error(chalk.red('Failed to build Gradle wrapper.'));
      throw err;
    }
  } else {
    console.log(chalk.green('Gradle wrapper exists.'));
  }
}

// Installs NPM dependencies if they are not already installed.
async function installDependencies() {
  const nodeModulesPath = path.join(__dirname, 'node_modules');
  if (!fs.existsSync(nodeModulesPath)) {
    console.log(chalk.yellow('Dependencies not installed. Running npm install...'));
    try {
      await runCommand('npm install');
      console.log(chalk.green('Dependencies installed successfully.'));
    } catch (err) {
      console.error(chalk.red('Failed to install dependencies.'));
      throw err;
    }
  } else {
    console.log(chalk.green('Dependencies are already installed.'));
  }
}

// Copies HTML files from src to android/app/src/main/assets, handling directories properly.
async function copyHtmlFiles() {
  const srcDir = path.join(process.cwd(), 'src');
  const destDir = path.join(process.cwd(), 'android', 'app', 'src', 'main', 'assets');

  // Ensure destination directory exists.
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
    console.log(chalk.green(`Created destination directory: ${destDir}`));
  }

  // Copy index.html separately
  const indexSrcPath = path.join(srcDir, 'index.html');
  const indexDestPath = path.join(destDir, 'index.html');
  if (fs.existsSync(indexSrcPath)) {
    fs.copyFileSync(indexSrcPath, indexDestPath);
    console.log(chalk.yellow('Copying IMPORTANT file: index.html'));
  } else {
    console.error(chalk.red('index.html not found in src folder.'));
  }

  // Copy other files and directories from the src folder
  const items = fs.readdirSync(srcDir);
  for (const item of items) {
    if (item === 'index.html') continue;
    const itemSrcPath = path.join(srcDir, item);
    const itemDestPath = path.join(destDir, item);
    const stats = fs.lstatSync(itemSrcPath);
    if (stats.isDirectory()) {
      // Create destination subdirectory if it doesn't exist
      if (!fs.existsSync(itemDestPath)) {
        fs.mkdirSync(itemDestPath, { recursive: true });
        console.log(chalk.yellow(`Copying folder: ${item}`));
      }
      const files = fs.readdirSync(itemSrcPath);
      for (const fileInFolder of files) {
        const fileSrc = path.join(itemSrcPath, fileInFolder);
        const fileDest = path.join(itemDestPath, fileInFolder);
        fs.copyFileSync(fileSrc, fileDest);
        console.log(chalk.yellow(`Copying file: ${fileInFolder} in folder: ${item}`));
      }
    } else {
      fs.copyFileSync(itemSrcPath, itemDestPath);
      console.log(chalk.yellow(`Copying file: ${item}`));
    }
  }
}

// Main function: launches an AVD, waits for it to be ready, then installs the app.
async function launchAvd() {
  try {
    // Ensure that dependencies are installed and the Gradle wrapper exists.
    await copyHtmlFiles();
    await installDependencies();
    await ensureGradleWrapper();

    const avds = await listAvds();
    if (avds.length === 0) return;

    const selectedAvd = await chooseAvd(avds);
    if (!selectedAvd) return;

    console.log(chalk.blue(`Launching emulator for AVD: ${selectedAvd}...`));
    const emulatorProcess = exec(`emulator -avd ${selectedAvd}`, (err, stdout, stderr) => {
      if (err) {
        console.error(chalk.red('Error launching the emulator:'), err);
      }
    });
    emulatorProcess.unref();

    await waitForDevice();

    console.log(chalk.blue('Installing app on emulator...'));
    const isWindows = os.platform() === 'win32';
    const installCmd = isWindows ? "cd android && gradlew.bat installDebug" : "cd android && ./gradlew installDebug";
    await runCommand(installCmd);
    console.log(chalk.green('App installed successfully.'));
  } catch (error) {
    console.error('Error:', error);
  }
}

launchAvd();
