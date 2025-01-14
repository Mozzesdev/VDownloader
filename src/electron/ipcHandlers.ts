import { ipcMain, dialog, BrowserWindow } from "electron";
import { downloadVideo, getVideoDetails } from "./video.js";
import { getConfig, openFile, setConfig } from "./config.js";
import { getPlaylist } from "./playlist.js";

export const handleIpc = (window: BrowserWindow) => {
  const activeDownloads = new Map<string, AbortController>();

  ipcMain.handle("getConfig", async () => getConfig());

  ipcMain.handle("setConfig", async (_event, newConfig) =>
    setConfig(newConfig)
  );

  ipcMain.handle(
    "getVideo",
    async (_event, videoUrl) => await getVideoDetails(videoUrl)
  );

  ipcMain.handle("cancelDownload", async (_event, videoId: string) => {
    try {
      const controller = activeDownloads.get(videoId);
      if (controller) {
        controller.abort();
        activeDownloads.delete(videoId);
      } else {
        throw new Error();
      }
    } catch {
      return;
    }
  });

  ipcMain.handle("downloadVideo", async (event, video, dlId) => {
    const progressChannel = `download_progress_${dlId}`;
    const controller = new AbortController();
    activeDownloads.set(dlId, controller);

    return await downloadVideo(
      video,
      (progress) => event.sender.send(progressChannel, progress),
      controller.signal
    );
  });

  ipcMain.handle("openFile", async (_event, filePath) => openFile(filePath));

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
