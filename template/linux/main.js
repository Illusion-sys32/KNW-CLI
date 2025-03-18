// Main Entry File for Windoes or Ios
// This file is used to initialize the app
////////////////////////
//Down here is the defult initialization code
//You can change it to what ever you want
// *Note the app will work *only* if you have electron installed
//To install electron run this command in the terminal
// npm install electron
////////////////////////


// basic electron app
const { app, BrowserWindow } = require('electron');
let win;
function createWindow() {
    win = new BrowserWindow({ width: 800, height: 600 });
    win.loadFile('./src/index.html');
    win.on('closed', () => {
        win = null;
    });
}
app.on('ready', createWindow);
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});
app.on('activate', () => {
    if (win === null) {
        createWindow();
    }
});

