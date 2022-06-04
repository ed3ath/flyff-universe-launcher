const { contextBridge, ipcRenderer } = require('electron');

let updateAvailable = false;

contextBridge.exposeInMainWorld('helper', {
    launch: () => !updateAvailable ? ipcRenderer.invoke('launch') : null,
    hide: () => ipcRenderer.invoke('hideMain')
});
