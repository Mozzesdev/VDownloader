export {};

declare global {
  interface Window {
    electronAPI: {
      downloadPlaylist: (
        playlist: VideoDetails[]
      ) => Promise<{ success: boolean; error?: string }>;
      getPlaylist: (url: string) => Promise<VideoDetails[]>;
      getVideo: (url: string) => Promise<VideoDetails>;
      downloadVideo: (video: VideoDetails) => Promise<{ message: string }>;
      onDownloadProgress: (callback: (progress: string) => void) => void;
      removeDownloadProgressListener: () => void;

      // Métodos para gestionar el path de descarga
      setDownloadPath: (path: string) => Promise<void>;
      getDownloadPath: () => Promise<string>;
      openFolderDialog: () => Promise<Electron.OpenDialogReturnValue>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      setConfig: (config: Partial<AppConfig>) => Promise<{ success: boolean }>;
      getConfig: () => Promise<AppConfig>;
    };
  }
}

export interface AppConfig {
  downloadPath: string;
  theme?: "light" | "dark";
  language?: string;
  notificationsEnabled?: boolean;
  autoStartDownload?: boolean;
  lastDownload?: string;
}
