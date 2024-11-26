import { ipcMain, dialog, BrowserWindow } from "electron";
import { downloadVideo, getVideoDetails } from "./video.js";
import { getConfig, setConfig } from "./config.js";
import { getPlaylist } from "./playlist.js";

export const handleIpc = (window: BrowserWindow) => {
  ipcMain.handle("getConfig", async () => getConfig());

  ipcMain.handle("setConfig", async (_event, newConfig) =>
    setConfig(newConfig)
  );

  ipcMain.handle(
    "getVideo",
    async (_event, videoUrl) => await getVideoDetails(videoUrl)
  );

  ipcMain.handle(
    "downloadVideo",
    async (event, videoDetails) =>
      new Promise((resolve, reject) => {
        downloadVideo(videoDetails, (progress) => {
          // Enviar progreso al frontend
          event.sender.send("download-progress", progress);
        })
          .then(resolve)
          .catch(reject);
      })
  );

  ipcMain.handle(
    "getPlaylist",
    async (_event, playlistUrl) => await getPlaylist(playlistUrl)
  );

  ipcMain.handle("openFolderDialog", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });
    return result;
  });

  ipcMain.on("minimize", () => {
    window.minimize();
  });

  ipcMain.on("maximize", () => {
    if (window.isMaximized()) {
      window.unmaximize();
    } else {
      window.maximize();
    }
  });

  ipcMain.on("close", () => {
    window.close();
  });
};
