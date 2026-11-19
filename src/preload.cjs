'use strict';

const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('orbit', {
  request: (operation, input) => ipcRenderer.invoke('orbit:request', operation, input),
  subscribe(listener) {
    const handler = () => listener();
    ipcRenderer.on('orbit:changed', handler);
    return () => ipcRenderer.removeListener('orbit:changed', handler);
  },
  onAccountOpened(listener) {
    const handler = (_event, accountId) => listener(accountId);
    ipcRenderer.on('orbit:open-account', handler);
    return () => ipcRenderer.removeListener('orbit:open-account', handler);
  },
  onNotice(listener) {
    const handler = (_event, message) => listener(message);
    ipcRenderer.on('orbit:notice', handler);
    return () => ipcRenderer.removeListener('orbit:notice', handler);
  },
  onPostOpened(listener) {
    const handler = (_event, id) => listener(id);
    ipcRenderer.on('orbit:open-post', handler);
    return () => ipcRenderer.removeListener('orbit:open-post', handler);
  },
});
