const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('events', {
    launch: () => ipcRenderer.invoke('launch'),
    hide: () => ipcRenderer.invoke('hideMain'),
});