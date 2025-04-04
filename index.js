import fs, { copyFileSync } from "fs";
import path from "path";
import { createInterface } from "readline/promises";
import chalk from "chalk";
import { fileURLToPath, pathToFileURL } from "url";
import { exec } from "child_process";
import { log } from "console";
// Define __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log(chalk.blue("Initializing K.W.N CLI..."));

async function runCommend(command) {

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log(`error: ${error.message}`);
      return;
    }
    if (stderr) {
      console.log(`stderr: ${stderr}`);
      return;
    }
    console.log(`stdout: ${stdout}`);
  });
}




async function init() {
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let appName = await rl.question(chalk.yellow("Enter the name of your app: "));
  if (!appName.trim()) {
    console.log(chalk.red("Please enter a valid name."));
    rl.close();
    return;
  }

  let appPath = await rl.question(
    chalk.yellow("Enter the destination path for your app: ")
  );
  if (!appPath.trim()) {
    console.log(chalk.red("Please enter a valid path."));
    rl.close();
    return;
  }

  if (appPath === ".") {
    appPath = process.cwd();
  } else if (appPath === "..") {
    appPath = path.join(process.cwd(), "..");
  } else if (!fs.existsSync(appPath)) {
    console.log(chalk.red("Path does not exist."));
    rl.close();
    return;
  }

  const destinationPath = path.join(appPath, appName);
  console.log(chalk.green(`App Name: ${appName}`));
  console.log(chalk.green(`Destination Path: ${destinationPath}`));
  let confirm = await rl.question(chalk.yellow("Is this correct? (y/n): "));
  if (confirm.toLowerCase() !== "y") {
    rl.close();
    console.log(chalk.red("Exiting..."));
    return;
  }
  rl.close();

  // Determine the template folder based on OS.
  let templateFolder;
  if (process.platform === "win32") {
    templateFolder = path.join(__dirname, "template", "win");
    copyTemplateFiles(templateFolder, destinationPath, appName);
    console.log(chalk.yellow("installing dependencies..."));
    runCommend("cd " + destinationPath + "&& npm install");
  } else if (process.platform === "linux") {
    templateFolder = path.join(__dirname, "template", "linux");
    copyTemplateFiles(templateFolder, destinationPath, appName);
    console.log(chalk.yellow("installing dependencies..."));
    runCommend("cd " + destinationPath + "&& npm install");
  } else {
    // Fallback for other OSes
    templateFolder = path.join(__dirname, "template", "linux");
    copyTemplateFiles(templateFolder, destinationPath, appName);
    console.log(chalk.yellow("installing dependencies..."));
    runCommend("cd " + destinationPath + "&& npm install");
  }


  console.log(chalk.green("Template copied successfully!"));
}

// Recursively copy files and folders from srcDir to destDir.
// For files with specific extensions, replace all occurrences of "TicTacToe" with the appName.
function copyTemplateFiles(srcDir, destDir, appName) {
  try {
    fs.mkdirSync(destDir, { recursive: true });
  } catch (err) {
    console.error(`Error creating directory ${destDir}: ${err.message}`);
    return;
  }

  let items;
  try {
    items = fs.readdirSync(srcDir);
  } catch (err) {
    console.error(`Error reading directory ${srcDir}: ${err.message}`);
    return;
  }

  items.forEach((item) => {
    const srcPath = path.join(srcDir, item);
    const destPath = path.join(destDir, item);
    const destDirNoName = path.join(destDir)
    let stats;
    function elseCopy(){
      try {
        fs.copyFileSync(srcPath, destPath);
      } catch (err) {
        console.error(`Error copying file from ${srcPath} to ${destPath}: ${err.message}`);
        return;
      }
      const ext = path.extname(item).toLowerCase();
      const validExtensions = [".js", ".html", ".kt", ".swift", ".manifest", ".json", ".gradle", ".xml", ".properties", ".java",];

      if (validExtensions.includes(ext)) {
        try {
          let content = fs.readFileSync(destPath, "utf8");
          content = content.replace(/TicTacToe/g, appName);
          fs.writeFileSync(destPath, content, "utf8");
        } catch (err) {
          console.error(`Error processing file ${destPath}: ${err.message}`);
        }
      }
    }
    try {
      stats = fs.statSync(srcPath);
    } catch (err) {
      console.error(`Skipping ${srcPath}: ${err.message}`);
      return; // Skip this item if stat fails.
    }

    if (stats.isDirectory()){
      try {
        if (srcPath.endsWith("TicTacToe")){
          fs.mkdirSync(path.join(destDirNoName,appName), {recursive: true} )
          let files;
          files = fs.readdirSync(srcDir)
          files.forEach((file) =>{
            fs.copyFileSync(path.join(srcDir,file),path.join(destDirNoName,appName))
          })
        } else {
          elseCopy()
        }
      } catch (error) {
        log("Error " + error)
      }


    } else {
      elseCopy()
    }
  });
}

init();
