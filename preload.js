const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadTasks: () => ipcRenderer.invoke('load-tasks'),
  saveTasks: (tasks) => ipcRenderer.invoke('save-tasks', tasks),
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close')
});
