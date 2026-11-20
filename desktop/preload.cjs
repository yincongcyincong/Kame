const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('gameSpeech', {
  available: process.platform === 'darwin',
  start: () => ipcRenderer.invoke('game-speech-command', 'start'),
  stop: () => ipcRenderer.invoke('game-speech-command', 'stop'),
  subscribe: callback => {
    const listener = (_event, value) => callback(value);
    ipcRenderer.on('game-speech-event', listener);
    return () => ipcRenderer.removeListener('game-speech-event', listener);
  },
});
