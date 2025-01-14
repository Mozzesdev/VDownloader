import React, { useEffect, useRef, useState } from "react";
import {
  DownloadIcon,
  Grid2X2,
  List,
  Loader2,
  Search,
  Settings,
  X,
} from "lucide-react";
import { Input } from "./components/Input";
import Button from "./components/Button";
import Alert, { AlertType } from "./components/Alert";
import { PreferencesModal } from "./preferences/PreferencesModal";
import Dropdown, { DropdownItem } from "./components/Dropdown";
import { filterErrorMessage, parseMediaString, uuid } from "./lib/utils";
import { Tooltip } from "./components/Tooltip";
import SearchTab from "./components/icon/SearchTab";
import DownloadManager, { type Download } from "./components/DownloadManager";

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
  items?: DropdownItem[];
  streamingData: any;
  description: string;
  formatSelected?: DropdownItem;
};

const App: React.FC = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [playlist, setPlaylist] = useState<Video[]>([]);
  const [isGridView, setIsGridView] = useState(false);
  const [isLoading, setIsLoading] = useState({ value: false, info: "" });
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [expandedVideos, setExpandedVideos] = useState<Set<string>>(new Set());
  const [downloads, setDownloads] = useState<Download[]>([]);

  const removeDownload = (id: string) => {
    setDownloads((prev) => prev.filter((d) => d.id !== id));
  };

  const addAlert = (type: AlertType, message: string, delay = 5000) => {
    const newAlert: Alert = {
      id: Date.now(),
      type,
      message,
      delay,
    };
    setAlerts((prevAlerts) => [...prevAlerts, newAlert]);
  };

  const toggleExpanded = (videoId: string) => {
    setExpandedVideos((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(videoId)) {
        newSet.delete(videoId);
      } else {
        newSet.add(videoId);
      }
      return newSet;
    });
  };

  const removeAlert = (id: number) => {
    setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== id));
  };

  const playListRef = useRef(playlist);

  useEffect(() => {
    playListRef.current = playlist;
  }, [playlist]);

  useEffect(() => {
    declareFormats(playListRef.current);
  }, [isGridView]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setPlaylist([]);

    const formData = new FormData(e.currentTarget);
    const values: FormValues = Object.fromEntries(
      formData.entries()
    ) as unknown as FormValues;

    if (!values?.url) {
      addAlert("error", "Agrega una URL, es requerido.");
      return;
    }

    try {
      setIsLoading({ info: "Obteniendo informacion...", value: true });

      const urlType = determineYouTubeUrlType(values.url);

      const fetchDetails = async (url: string) => {
        switch (urlType) {
          case "video":
            return await window.electronAPI.getVideo(url);
          case "playlist":
            return await window.electronAPI.getPlaylist(url);
          case "videoInPlaylist":
            values.url = values.url.split("&list")[0];
            return await window.electronAPI.getVideo(values.url);
          default:
            throw new Error("Invalid URL type");
        }
      };

      const details = await fetchDetails(values.url);

      if (details) {
        const newPlayList = Array.isArray(details) ? details : [details];
        setPlaylist(newPlayList);
        declareFormats(newPlayList);
      } else {
        throw new Error("No details found");
      }
    } catch (error: any) {
      console.error(error.message);
      addAlert("error", filterErrorMessage(error.message));
    } finally {
      setIsLoading({ value: false, info: "" });
    }
  };

  const declareFormats = (updatedPlayList: Video[]) => {
    if (updatedPlayList.length) {
      const playlistMap = updatedPlayList.map((video) => {
        const formats: any = [
          ...(video.streamingData.formats || []),
          ...(video.streamingData.adaptiveFormats || []),
        ];
        return {
          ...video,
          items: convertFormatsToDropdownItem(formats, isGridView),
        };
      });

      setPlaylist(playlistMap);
    }
  };

  function normalizeLabel(label: string): string {
    if (label.includes("p")) {
      return label.split("p")[0] + "p";
    }
    return label;
  }

  const convertFormatsToDropdownItem = (
    formats: any,
    isSmallLabel: boolean
  ): DropdownItem[] => {
    if (!formats) return [];

    // Ordena los formatos por prioridad antes de mapear
    const sortedFormats = formats.sort((a: any, b: any) => {
      const getPriority = (format: any) => {
        if (format.audioQuality && format.qualityLabel) return 1; // Audio y video
        if (format.audioQuality && !format.qualityLabel) return 3; // Solo audio
        if (format.qualityLabel && !format.audioQuality) return 2; // Solo video
        return 4; // Cualquier otro caso
      };

      return getPriority(a) - getPriority(b); // Orden ascendente
    });

    // Mapea los formatos ordenados
    const items = sortedFormats.map((format: any) => {
      const mediaStream = parseMediaString(format.mimeType);

      if (format.audioQuality && !format.qualityLabel) {
        // Solo audio
        return {
          id: format.itag,
          value: format.itag,
          label: isSmallLabel
            ? `${mediaStream?.type}`
            : `${mediaStream?.type} - ${mediaStream?.codec}`,
        };
      }

      if (format.qualityLabel && !format.audioQuality) {
        // Solo video
        return {
          id: format.itag,
          value: format.itag,
          label: isSmallLabel
            ? `${format.qualityLabel}`
            : `${mediaStream?.ext} - ${format.qualityLabel}`,
        };
      }

      // Audio y video
      return null;
    });

    const normalizedItems = items.map((item: any) => ({
      ...item,
      label: normalizeLabel(item.label),
    }));

    const uniqueItems = normalizedItems.filter(
      (item: any, index: any, self: any) =>
        self.findIndex((i: any) => i.label === item.label) === index
    );

    return uniqueItems;
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

  const updateVideoFormat = (videoId: string, newFormat: DropdownItem) => {
    setPlaylist((prevPlaylist) =>
      prevPlaylist.map((video) =>
        video.id === videoId
          ? {
              ...video,
              formatSelected: newFormat,
              size: calculateSize(
                video.streamingData.adaptiveFormats,
                newFormat
              ),
            }
          : video
      )
    );
  };

  const calculateSize = (
    adaptiveFormats: any[],
    format: DropdownItem
  ): string => {
    const selectedFormat = adaptiveFormats.find(
      (item) => item.itag === format.id
    );

    if (!selectedFormat) return "0 MB";

    const audioFormat = adaptiveFormats.find((item) => item.audioQuality);

    const selectedFormatSize = selectedFormat.contentLength
      ? Number(selectedFormat.contentLength)
      : 0;
    const audioFormatSize =
      audioFormat && audioFormat.contentLength
        ? Number(audioFormat.contentLength)
        : 0;

    const totalSize = (selectedFormatSize + audioFormatSize) / (1024 * 1024);

    return totalSize.toFixed(2) + " MB";
  };

  const downloadPlaylist = async () => {
    if (!playlist || playlist.length === 0) return;

    const initialDownloads = playlist.map((video) => {
      const UUID = uuid();
      return {
        uuid: UUID,
        id: video.id,
        label: video.title,
        progress: 0,
        img: video.thumbnail,
        size: video.size,
        video,
        cancel: () =>
          window.electronAPI.cancelDownload(UUID).then(() => {
            setDownloads((prevDownloads) =>
              prevDownloads.filter((d) => d.uuid !== UUID)
            );
          }),
      };
    });

    // Actualizar las descargas solo una vez
    setDownloads((prevDownloads) => [...prevDownloads, ...initialDownloads]);

    // Descargar los videos uno por uno, procesando el progreso de cada video de manera eficiente
    for (const { video, uuid } of initialDownloads) {
      await downloadVideo(video, uuid);
    }
  };

  const downloadVideo = async (video: Video, downloadId?: string) => {
    try {
      const dlUUID = downloadId || uuid();

      // Crear el objeto de descarga para el video
      const download: Download = {
        id: video.id,
        uuid: dlUUID,
        label: video.title,
        progress: 0,
        img: video.thumbnail,
        size: video.size,
        cancel: () =>
          window.electronAPI.cancelDownload(downloadId).then(() => {
            setDownloads((prevDownloads) =>
              prevDownloads.filter((d) => d.uuid !== dlUUID)
            );
          }),
      };

      // Verificar si el video ya está en la lista de descargas
      setDownloads((prevDownloads) => {
        const existDownload = prevDownloads.find((v) => v.uuid === dlUUID);
        if (!existDownload) {
          return [...prevDownloads, download];
        }
        return prevDownloads;
      });

      const progressChannel = `download_progress_${dlUUID}`;

      // Actualizar el progreso del video en tiempo real
      window.electronAPI.onDLProgress(progressChannel, (progress: number) => {
        setDownloads((prevDownloads) =>
          prevDownloads.map((d) => (d.uuid === dlUUID ? { ...d, progress } : d))
        );
      });

      // Llamada al backend para iniciar la descarga y pasar el signalId para la cancelación
      const response = await window.electronAPI.downloadVideo(video, dlUUID);

      // Actualizar el estado con el path del video una vez descargado
      setDownloads((prevDownloads) =>
        prevDownloads.map((d) =>
          d.id === video.id ? { ...d, path: response?.path || "" } : d
        )
      );

      window.electronAPI.rmDLProgress(progressChannel); // Limpiar el progreso

      addAlert("success", response.message); // Mostrar alerta de éxito
    } catch (error: any) {
      console.log(error);
      addAlert(
        "error",
        `Error al descargar el video: ${filterErrorMessage(error.message)}`
      );
    }
  };

  const removeVideo = (video: Video) => {
    setPlaylist((prev) => prev.filter((v) => v.id !== video.id));
  };

  return (
    <div className="mx-auto max-w-[1200px] container">
      {isModalOpen && (
        <PreferencesModal onClose={() => setIsModalOpen(false)} />
      )}
      {downloads?.length ? (
        <DownloadManager
          downloads={downloads}
          removeDownload={removeDownload}
        />
      ) : (
        ""
      )}
      <div className="fixed bottom-4 left-4">
        <Tooltip text="Configuración" position="right" variant="secondary">
          <Button
            onClick={() => setIsModalOpen(true)}
            className="!p-2 rounded-md"
          >
            <Settings className="h-4 w-4" />
          </Button>
        </Tooltip>
      </div>
      {isLoading.value && (
        <>
          <div className="fixed inset-0 z-10 flex justify-center items-center bg-[#00000054] pointer-events-none">
            <div className="flex flex-col items-center">
              <div className="flex items-center justify-center">
                <Loader2 className="animate-spin mr-2" />
                {isLoading.info}
              </div>
            </div>
          </div>
        </>
      )}
      <div className="fixed top-4 z-[100] right-4 max-w-[420px] space-y-2">
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
        </form>
      </div>
      <div className="mt-3 rounded-sm bg-[var(--foreground)] p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Lista de Videos</h2>
          <div className="flex gap-2">
            <Tooltip
              text={isGridView ? "Lista" : "Cuadrícula"}
              position="bottom"
              variant="secondary"
            >
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
            </Tooltip>
            {playlist?.length ? (
              <Tooltip
                text="Download all"
                position="bottom"
                variant="secondary"
              >
                <Button onClick={downloadPlaylist} className="!p-2 rounded-md">
                  <DownloadIcon className="h-4 w-4" />
                </Button>
              </Tooltip>
            ) : (
              ""
            )}
          </div>
        </div>
        <div
          className={`grid gap-4 ${
            isGridView && playlist.length
              ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
              : "grid-cols-1"
          }`}
        >
          {playlist.length ? (
            playlist.map((video) => (
              <div
                key={video.id}
                className={`bg-[#202124] rounded-lg shadow-md ${
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
                  <div>
                    <div className="flex justify-between items-center gap-2">
                      <h3 className="text-lg font-semibold mb-2">
                        {video.title}
                      </h3>
                      <X
                        className="cursor-pointer w-5 mb-2"
                        onClick={() => removeVideo(video)}
                      />
                    </div>
                    {!isGridView ? (
                      <p className="text-gray-400 mb-2 line whitespace-pre-line">
                        {expandedVideos.has(video.id)
                          ? video.description
                          : `${video.description.slice(0, 100)}`}
                        {video.description.length > 100 && (
                          <button
                            className="ml-1 text-[12px] text-blue-400 cursor-pointer hover:text-blue-500"
                            onClick={() => toggleExpanded(video.id)}
                          >
                            {expandedVideos.has(video.id)
                              ? "...Ver menos"
                              : "...Ver más"}
                          </button>
                        )}
                      </p>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">
                      {video.duration} - {video.size ?? "Desconocido"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => downloadVideo(video)}
                      >
                        <DownloadIcon className="inline-block h-4 w-4" />
                        {isGridView ? "" : "Descargar"}
                      </Button>
                      <Dropdown
                        size="sm"
                        label="Select format"
                        items={video.items ?? []}
                        value={video?.items?.[0]}
                        showIcon={!isGridView}
                        onColumnChange={(value) => {
                          if (value) {
                            updateVideoFormat(video.id, value as DropdownItem);
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-5">
              <SearchTab className="w-30 h-auto mx-auto fill-sky-500 mb-3" />
              <p className="text-gray-400 text-center mb-3">
                Intenta buscar una URL valida de youtube.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
