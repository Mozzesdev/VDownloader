const { contextBridge, ipcRenderer } = require("electron");

// Expone el método downloadPlaylist y asegura el tipo de retorno
contextBridge.exposeInMainWorld("electronAPI", {
  downloadVideo: (video: any, dlId: string): Promise<any> =>
    ipcRenderer.invoke("downloadVideo", video, dlId),
  cancelDownload: (videoId: string): any =>
    ipcRenderer.invoke("cancelDownload", videoId),
  downloadPlaylist: (
    playlist: []
  ): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke("downloadPlaylist", playlist),
  getPlaylist: (url: string): Promise<any> =>
    ipcRenderer.invoke("getPlaylist", url),
  getVideo: (url: string): Promise<any> => ipcRenderer.invoke("getVideo", url),
  getConfig: (): Promise<any>  => ipcRenderer.invoke("getConfig"),
  setConfig: (config: any): Promise<any>  => ipcRenderer.invoke("setConfig", config),
  onDLProgress: (channel: string, callback: (progress: number) => void) =>
    ipcRenderer.on(channel, (_event, data) => callback(data)),
  rmDLProgress: (channel: string) => ipcRenderer.removeAllListeners(channel),
  openFolderDialog: () => ipcRenderer.invoke("openFolderDialog"),
  minimize: () => ipcRenderer.send("minimize"),
  maximize: () => ipcRenderer.send("maximize"),
  close: () => ipcRenderer.send("close"),
  openFile: (path: string) => ipcRenderer.invoke("openFile", path)
});
