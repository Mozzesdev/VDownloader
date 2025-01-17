export {};

declare global {
  interface Window {
    electronAPI: {
      downloadPlaylist: (
        playlist: VideoDetails[]
      ) => Promise<{ success: boolean; error?: string }>;
      getPlaylist: (url: string) => Promise<VideoDetails[]>;
      getVideo: (url: string) => Promise<VideoDetails>;
      downloadVideo: (
        video: VideoDetails,
        dlId: string
      ) => Promise<{ message: string; path?: string }>;
      cancelDownload: any
      onDLProgress: (
        channel: string,
        callback: (progress: number) => void
      ) => void;
      rmDLProgress: (channel: string) => void;

      // Métodos para gestionar el path de descarga
      setDownloadPath: (path: string) => Promise<void>;
      getDownloadPath: () => Promise<string>;
      openFolderDialog: () => Promise<Electron.OpenDialogReturnValue>;
      minimize: () => void;
      maximize: () => void;
      close: () => void;
      setConfig: (config: Partial<AppConfig>) => Promise<any>;
      getConfig: () => Promise<AppConfig>;
      openFile: (path: string) => any;
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
