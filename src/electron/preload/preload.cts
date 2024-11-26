const { contextBridge, ipcRenderer } = require("electron");

// Expone el método downloadPlaylist y asegura el tipo de retorno
contextBridge.exposeInMainWorld("electronAPI", {
  downloadVideo: (video: any): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("downloadVideo", video),
  downloadPlaylist: (
    playlist: []
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("downloadPlaylist", playlist),
  getPlaylist: (url: string): Promise<any> =>
    ipcRenderer.invoke("getPlaylist", url),
  getVideo: (url: string): Promise<any> => ipcRenderer.invoke("getVideo", url),
  onDownloadProgress: (callback: (progress: string) => void) => {
    ipcRenderer.on("download-progress", (_event, progress: string) => {
      callback(progress);
    });
  },
  removeDownloadProgressListener: () => {
    ipcRenderer.removeAllListeners("download-progress");
  },
  openFolderDialog: () => ipcRenderer.invoke("openFolderDialog"),
  minimize: () => ipcRenderer.send('minimize'),
  maximize: () => ipcRenderer.send('maximize'),
  close: () => ipcRenderer.send('close'),
});
