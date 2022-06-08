const { app, ipcMain, BrowserWindow, Menu, Tray, dialog } = require("electron");
const path = require("path");
const openAboutWindow = require("about-window").default;
const logger = require("electron-log");
const isDev = require("electron-is-dev");
const { autoUpdater } = require("electron-updater");
const tcpp = require("tcp-ping");

require("dotenv").config();

let mainWindow;
let gameWindowCount = 0;
let servers = {
  Lawolf: "srv02-universe.flyff.com",
  Mia: "srv03-universe.flyff.com",
  Glaphan: "srv04-universe.flyff.com",
};

autoUpdater.setFeedURL({
  provider: "github",
  owner: "ed3ath",
  repo: "flyff-universe-launcher",
  token: process.env.TOKEN,
});

function ping(address, port) {
  return new Promise(function(resolve, reject) {
    tcpp.ping({ address, port }, function(err, data) {
        if (err) reject(err);
        else resolve(data);
    });
  });
}

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
    setInterval(() => {
      autoUpdater.checkForUpdates();
    }, 1800000);
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

const alert = () => {
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
                alert();
              },
            },
            {
              label: "Add Listing",
              click: () => {
                alert();
              },
            },
          ],
        },
        {
          label: "Chat",
          click: () => {
            alert();
          },
        },
        {
          label: "Server List",
          click: async () => {
            const result = await Promise.all(Object.keys(servers).map(async (address) => {
              const data = await ping(servers[address], 443);
              return {
                server: address,
                ping: Math.floor(data.avg)
              }
            }));
            const dialogOpts = {
              type: "none",
              title: "Server List",
              message: `${result.map(data => `${data.server}: ${data.ping} ms`).join("\n")}`
            };
            dialog.showMessageBox(dialogOpts);
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
  
  gameWindow.setMenu(Menu.buildFromTemplate(mainMenuTemplate));

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
  gameWindow.on("close", (event) => {
    event.preventDefault();
    const dialogOpts = {
      type: "warning",
      buttons: ["Exit", "Cancel"],
      title: "Game Closing",
      message: "You are about to close the game.",
    };
    dialog.showMessageBox(dialogOpts).then((returnValue) => {
      if (returnValue.response === 0) {
        gameWindowCount -= 1;
        gameWindow.destroy();
      }
    });
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
  dialog.showMessageBox(dialogOpts);
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
