const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('ibra', {
  loadPacks: () => ipcRenderer.invoke('packs:load'),
  loadMyLevels: () => ipcRenderer.invoke('mine:load'),
  saveMyLevels: (list) => ipcRenderer.invoke('mine:save', list),
  openLevelsFolder: () => ipcRenderer.invoke('folder:open'),
  setFullscreen: (on) => ipcRenderer.send('fullscreen', on),
  quit: () => ipcRenderer.send('quit'),
  openUrl: (u) => ipcRenderer.send('open-url', u),
});
