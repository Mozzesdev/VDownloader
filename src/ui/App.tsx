// src/App.tsx
import React, { useEffect, useState } from "react";
import {
  Download,
  Grid2X2,
  List,
  Loader2,
  Search,
  Settings,
} from "lucide-react";
import { Input } from "./components/Input";
import Button from "./components/Button";
import ProgressBar from "./components/ProgressBar";
import Alert, { AlertType } from "./components/Alert";
import { PreferencesModal } from "./preferences/PreferencesModal";

interface FormValues {
  url: string;
}

type Video = {
  url: string;
  title: string;
  videoDetails: any;
  duration: string;
  thumbnail: string;
  size: string;
  id: string;
};

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playList, setPlayList] = useState<Video[]>([]);
  const [isGridView, setIsGridView] = useState(false);
  const [isLoading, setIsLoading] = useState({ value: false, info: "" });
  const [error, setError] = useState("");
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (type: AlertType, message: string, delay = 5000) => {
    const newAlert: Alert = {
      id: Date.now(),
      type,
      message,
      delay,
    };
    setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
  };

  const removeAlert = (id: number) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  };

  const [downloadProgress, setDownloadProgress] = useState<number | null>(null);

  useEffect(() => {
    // Escuchar progreso de descarga
    window.electronAPI.onDownloadProgress((progress) => {
      setDownloadProgress(Number(progress)); // Actualiza el estado
    });

    return () => {
      // Remover listener al desmontar el componente
      window.electronAPI.removeDownloadProgressListener();
    };
  }, []);

  const downloadVideo = async (video: Video) => {
    try {
      setIsLoading({ info: `Descargando ${video.title}...`, value: true });
      setDownloadProgress(0); // Inicializa el progreso

      const response = await window.electronAPI.downloadVideo(video);
      if (response.message.includes("ya ha sido descargado")) {
        addAlert("warning", response.message);
      } else {
        addAlert("success", response.message);
      }
    } catch {
      addAlert("error", "Error al descargar el video.");
    } finally {
      setIsLoading({ value: false, info: "" });
      setDownloadProgress(null); // Limpia el progreso
    }
  };

  // const setDownloadPath = async () => {
  //   try {
  //     const { canceled, filePaths } =
  //       await window.electronAPI.openFolderDialog();
  //     if (!canceled && filePaths.length > 0) {
  //       await window.electronAPI.setConfig({ downloadPath: filePaths[0] });
  //     }
  //   } catch (error) {
  //     console.error("Error al configurar la ruta de descargas:", error);
  //   }
  // };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPlayList([]);
    setError("");

    const formData = new FormData(e.currentTarget);
    const values: FormValues = Object.fromEntries(
      formData.entries()
    ) as unknown as FormValues;

    if (!values?.url) {
      setError("Agrega una URL, es requerido.");
      return;
    }

    try {
      setIsLoading({ info: "Obteniendo informacion...", value: true });

      const urlType = determineYouTubeUrlType(values.url);

      if (urlType === "video") {
        const videoDetails = await window.electronAPI.getVideo(values.url);
        setPlayList([videoDetails]); // Tratamos el video como una lista de un solo elemento
      } else if (urlType === "playlist") {
        const playlist = await window.electronAPI.getPlaylist(values.url);
        setPlayList(playlist);
      } else if (urlType === "videoInPlaylist") {
        values.url = values.url.split("&list")[0];
        const videoDetails = await window.electronAPI.getVideo(values.url);
        setPlayList([videoDetails]); // Tratamos el video como una lista de un solo elemento
      } else {
        setError(
          "La URL proporcionada no es válida o no es un video/playlist de YouTube."
        );
        return;
      }
    } catch (error) {
      console.error(error);
      setError("Ocurrió un error al procesar la URL. Verifica que sea válida.");
    } finally {
      setIsLoading({ value: false, info: "" });
    }
  };

  // Función para determinar si una URL de YouTube es un video o una playlist
  const determineYouTubeUrlType = (
    url: string
  ): "video" | "playlist" | "videoInPlaylist" | null => {
    try {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.hostname !== "www.youtube.com" &&
        parsedUrl.hostname !== "youtu.be"
      ) {
        return null; // No es una URL válida de YouTube
      }

      // Analizar los parámetros de la URL
      const videoId = parsedUrl.searchParams.get("v");
      const playlistId = parsedUrl.searchParams.get("list");

      if (videoId && playlistId) {
        return "videoInPlaylist"; // Es un video dentro de una playlist
      } else if (videoId) {
        return "video"; // Es un video
      } else if (playlistId) {
        return "playlist"; // Es una playlist
      } else {
        return null; // No es ni video ni playlist
      }
    } catch (error) {
      console.error("Error al analizar la URL:", error);
      return null; // URL inválida
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] container">
      {isModalOpen && (
        <PreferencesModal onClose={() => setIsModalOpen(false)} />
      )}
      <div className="fixed bottom-4 left-4">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="!p-2 rounded-md"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </div>
      {isLoading.value && (
        <>
          <div className="fixed inset-0 z-10 flex justify-center items-center bg-[#00000054] pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" />
                {isLoading.info}
              </div>
              {downloadProgress !== null && (
                <div className="w-full max-w-md">
                  <ProgressBar value={downloadProgress} className="mb-4" />
                  <p className="text-sm text-gray-400 text-center">{`${downloadProgress}% Completado`}</p>
                </div>
              )}
            </div>
          </div>
        </>
      )}
      <div className="fixed bottom-4 right-4 max-w-[420px] space-y-2">
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            alert={alert}
            onClose={() => removeAlert(alert.id)}
          />
        ))}
      </div>
      <div className="mx-auto bg-[var(--background-secondary)] p-4 rounded-md">
        <h1 className="text-2xl font-bold mb-4">VDownloader</h1>
        <form onSubmit={handleSubmit}>
          <div className="flex gap-2">
            <Input
              type="url"
              placeholder="Ingresa la URL del video o playlist"
              name="url"
            />
            <Button type="submit" size="sm">
              Buscar
              <Search className="inline-block w-4" />
            </Button>
          </div>
          <p className="text-red-400 mt-2">{error}</p>
        </form>
      </div>
      <div className="mt-3 rounded-sm bg-[var(--foreground)] p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Lista de Videos</h2>
          <div className="flex gap-2">
            <Button
              onClick={() => setIsGridView(!isGridView)}
              className="!p-2 rounded-md"
            >
              {isGridView ? (
                <List className="h-4 w-4" />
              ) : (
                <Grid2X2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
        <div
          className={`grid gap-4 ${
            isGridView
              ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-1"
          }`}
        >
          {playList.length
            ? playList.map((video) => (
                <div
                  key={video.id}
                  className={`bg-[#202124] rounded-lg shadow-md overflow-hidden ${
                    !isGridView ? "flex" : ""
                  }`}
                >
                  <div className={!isGridView ? "w-1/4 p-4" : ""}>
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className={`w-full h-auto object-cover rounded-md`}
                    />
                  </div>
                  <div
                    className={`flex flex-col justify-between ${
                      !isGridView ? "w-3/4 p-4" : "p-4"
                    }`}
                  >
                    <h3 className="text-lg font-semibold mb-2">
                      {video.title}
                    </h3>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-zinc-400">
                        {video.duration}
                      </span>
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => downloadVideo(video)}
                      >
                        <Download className="inline-block mr-1 h-4 w-4" />
                        Descargar
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            : ""}
        </div>
      </div>
    </div>
  );
};

export default App;
