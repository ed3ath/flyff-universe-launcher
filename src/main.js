const { app, ipcMain, BrowserWindow, Menu, Tray, dialog } = require("electron");
const path = require("path");
const openAboutWindow = require("about-window").default;
const logger = require("electron-log");
const isDev = require("electron-is-dev");
const { autoUpdater } = require("electron-updater");
require("dotenv").config();

let mainWindow;
let gameWindowCount = 0;

autoUpdater.setFeedURL({
  provider: "github",
  owner: "ed3ath",
  repo: "flyff-universe-launcher",
  token: process.env.TOKEN,
});

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

  mainWindow.loadFile(path.join(__dirname, "/index.html"));

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  mainWindow.on("close", (event) => {
    if (gameWindowCount > 0) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

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

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  if (!isDev) {
    autoUpdater.checkForUpdates();
    setInterval(autoUpdater.checkForUpdates, 1800000);
  }
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

/*const createMarketplaceWindow = (type) => {};*/

const alert = (msg) => {
  dialog.showMessageBox({
    type: "info",
    title: "Coming soon",
    detail: "This feature will be available soon.",
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
      label: "Features",
      submenu: [
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
          label: "Marketplace",
          submenu: [
            {
              label: "Browse Listing",
              click: () => {
                alert("coming soon");
              },
            },
            {
              label: "Add Listing",
              click: () => {
                alert("coming soon");
              },
            },
          ],
        },
        {
          label: "Chat",
          click: () => {
            alert("coming soon");
          },
        },
      ],
    },
    {
      label: "Options",
      submenu: [
        {
          label: "Toggle Fullscreen",
          click: () => {
            gameWindow.fullScreen = gameWindow.isFullScreen() ? false : true;
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

  gameWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key.toLowerCase() === "Escape") {
      event.preventDefault();
    }
  });

  gameWindow.maximize();
  gameWindowCount += 1;
  gameWindow.on("close", () => {
    gameWindowCount -= 1;
  });
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

app.on("ready", function () {
  createMainWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

autoUpdater.on("error", (message) => {
  logger.error("There was a problem updating the application");
  logger.error(message);
});

autoUpdater.on("update-available", (_event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: "info",
    buttons: ["Ok"],
    title: "Application Update",
    message: process.platform === "win32" ? releaseNotes : releaseName,
    detail: "A new version is being downloaded.",
  };
  dialog.showMessageBox(dialogOpts, (response) => {});
});

autoUpdater.on("update-downloaded", (_event, releaseNotes, releaseName) => {
  const dialogOpts = {
    type: "info",
    buttons: ["Restart", "Later"],
    title: "Application Update",
    message: process.platform === "win32" ? releaseNotes : releaseName,
    detail:
      "A new version has been downloaded. Restart the application to apply the updates.",
  };
  dialog.showMessageBox(dialogOpts).then((returnValue) => {
    if (returnValue.response === 0) {
      gameWindowCount = 0;
      autoUpdater.quitAndInstall();
    }
  });
});
