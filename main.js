const { app, ipcMain, BrowserWindow, Menu, Tray } = require("electron");
const path = require("path");
const openAboutWindow = require("about-window").default;

require('update-electron-app')()

let mainWindow;
let gameWindowCount = 0

const createMainWindow = () => {
  mainWindow = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    resizable: false,
    webPreferences: {
      devTools: true,
      nodeIntegration: true,
      webviewTag: true,
      preload: __dirname + "/preload.js",
    },
  });
  mainWindow.setIcon(path.join(__dirname, "/assets/img/icon.ico"));

  mainWindow.loadFile("index.html");

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on('close', (event) => {
    if (gameWindowCount > 0) {      
      event.preventDefault();
      mainWindow.hide();
    }
  })

  const appTray = new Tray(path.join(__dirname, "/assets/img/icon.ico"));
  appTray.setContextMenu(
    Menu.buildFromTemplate([
      {
        label: "Show app",
        click: function () {
          mainWindow.show();
        },
      },
      {
        label: "Quit",
        click: function () {
          app.quit();
        },
      },
    ])
  );

  mainWindow.tray = appTray;
};

const createWikiWindow = (type) => {
  const wikiWindow = new BrowserWindow({
    autoHideMenuBar: true,
    show: false,
    webPreferences: {},
  });
  wikiWindow.setIcon(path.join(__dirname, "/assets/img/icon.ico"));

  wikiWindow.loadURL(`https://flyffipedia.com/${type}`);

  wikiWindow.once("ready-to-show", () => {
    wikiWindow.show();
  });
};

const createGameWindow = () => {
  const gameWindow = new BrowserWindow({
    show: false,
    webPreferences: {},
  });
  gameWindow.setIcon(path.join(__dirname, "/assets/img/icon.ico"));

  gameWindow.loadURL("https://universe.flyff.com/play");

  const mainMenuTemplate = [
    {
      label: "Wiki",
      submenu: [
        {
          label: "Item List",
          click: () => {
            createWikiWindow("items");
          },
        },
        {
          label: "Monster List",
          click: () => {
            createWikiWindow("monsters");
          },
        },
        {
          label: "Quest Guide",
          click: () => {
            createWikiWindow("quests");
          },
        },
      ],
    },
    {
      label: "Help",
      submenu: [
        {
          label: "Reload",
          click: () => {
            gameWindow.webContents.reloadIgnoringCache();
          },
        },
        {
          label: "About",
          click: () => {
            openAboutWindow({
              product_name: "Flyff Universe Launcher",
              icon_path: path.join(__dirname, "/assets/img/icon.png"),
              copyright: "Copyright (c) 2022 eD3ath",
              use_version_info: true,
              win_options: {
                parent: gameWindow,
                modal: true,
              },
              show_close_button: "Close",
            });
          },
        },
      ],
    },
  ];
  const mainMenu = Menu.buildFromTemplate(mainMenuTemplate);
  Menu.setApplicationMenu(mainMenu);

  gameWindow.once("ready-to-show", () => {
    gameWindow.show();
  });
  gameWindow.maximize();
  gameWindowCount += 1
  gameWindow.on('close', () => {
    gameWindowCount -= 1
  })
};

ipcMain.handle("launch", async () => {
  createGameWindow();
});

ipcMain.handle("hideMain", async () => {
  mainWindow.hide();
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on('ready', function()  {
  createMainWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
