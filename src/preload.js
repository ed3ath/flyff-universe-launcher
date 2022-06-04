const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helper', {
    launch: () => ipcRenderer.invoke('launch'),
    hide: () => ipcRenderer.invoke('hideMain')
});
