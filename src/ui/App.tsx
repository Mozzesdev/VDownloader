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
import Input from "./components/Input";
import Button from "./components/Button";
import Alert, { AlertType } from "./components/Alert";
import Dropdown, { DropdownItem } from "./components/Dropdown";
import { filterErrorMessage, parseMediaString, uuid } from "./lib/utils";
import { Tooltip } from "./components/Tooltip";
import SearchTab from "./components/icon/SearchTab";
import DownloadManager, { type Download } from "./components/DownloadManager";
import { Preferences, PreferencesModal } from "./preferences/PreferencesModal";

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
  const [preferences, setPreferences] = useState<Preferences>();

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
    setAlerts((prev) => [...prev, newAlert]);
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
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  const playListRef = useRef(playlist);

  useEffect(() => {
    playListRef.current = playlist;
  }, [playlist]);

  const getPreferences = async () => {
    const prefe = await window.electronAPI.getConfig();
    setPreferences(prefe as Preferences);
  };

  useEffect(() => {
    getPreferences();
  }, []);

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
      addAlert("error", "URL is required.");
      return;
    }

    try {
      setIsLoading({ info: "Fetching information...", value: true });

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
        const newPlaylist = Array.isArray(details) ? details : [details];
        setPlaylist(newPlaylist);
        declareFormats(newPlaylist);
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

  const declareFormats = (updatedPlaylist: Video[]) => {
    if (updatedPlaylist.length) {
      const playlistMap = updatedPlaylist.map((video) => {
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
    return label.includes("p") ? label.split("p")[0] + "p" : label;
  }

  const convertFormatsToDropdownItem = (
    formats: any,
    isSmallLabel: boolean
  ): DropdownItem[] => {
    if (!formats) return [];

    const sortedFormats = formats.sort((a: any, b: any) => {
      const getPriority = (format: any) => {
        if (format.audioQuality && format.qualityLabel) return 1;
        if (format.audioQuality && !format.qualityLabel) return 3;
        if (format.qualityLabel && !format.audioQuality) return 2;
        return 4;
      };
      return getPriority(a) - getPriority(b);
    });

    const items = sortedFormats.map((format: any) => {
      const mediaStream = parseMediaString(format.mimeType);

      if (format.audioQuality && !format.qualityLabel) {
        return {
          id: format.itag,
          value: format.itag,
          label: isSmallLabel
            ? `${mediaStream?.type}`
            : `${mediaStream?.type} - ${mediaStream?.codec}`,
        };
      }

      if (format.qualityLabel && !format.audioQuality) {
        return {
          id: format.itag,
          value: format.itag,
          label: isSmallLabel
            ? `${format.qualityLabel}`
            : `${mediaStream?.ext} - ${format.qualityLabel}`,
        };
      }

      return null;
    });

    const normalizedItems = items.map((item: any) => ({
      ...item,
      label: normalizeLabel(item.label),
    }));

    return normalizedItems.filter(
      (item: any, index: any, self: any) =>
        self.findIndex((i: any) => i.label === item.label) === index
    );
  };

  const determineYouTubeUrlType = (
    url: string
  ): "video" | "playlist" | "videoInPlaylist" | null => {
    try {
      const parsedUrl = new URL(url);
      if (
        parsedUrl.hostname !== "www.youtube.com" &&
        parsedUrl.hostname !== "youtu.be"
      ) {
        return null;
      }

      const videoId = parsedUrl.searchParams.get("v");
      const playlistId = parsedUrl.searchParams.get("list");

      if (videoId && playlistId) return "videoInPlaylist";
      if (videoId) return "video";
      if (playlistId) return "playlist";
      return null;
    } catch (error) {
      console.error("Error parsing URL:", error);
      return null;
    }
  };

  const updateVideoFormat = (videoId: string, newFormat: DropdownItem) => {
    setPlaylist((prev) =>
      prev.map((video) =>
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
    return totalSize.toFixed(0) + " MB";
  };

  const downloadPlaylist = async () => {
    if (!playlist.length) return;

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
            setDownloads((prev) => prev.filter((d) => d.uuid !== UUID));
          }),
      };
    });

    setDownloads((prev) => [...prev, ...initialDownloads]);

    for (const { video, uuid } of initialDownloads) {
      await downloadVideo(video, uuid);
    }
  };

  const downloadVideo = async (video: Video, downloadId?: string) => {
    try {
      const dlUUID = downloadId || uuid();
      const download: Download = {
        id: video.id,
        uuid: dlUUID,
        label: video.title,
        progress: 0,
        img: video.thumbnail,
        size: video.size,
        cancel: () =>
          window.electronAPI.cancelDownload(dlUUID).then(() => {
            setDownloads((prev) => prev.filter((d) => d.uuid !== dlUUID));
          }),
      };

      setDownloads((prev) => {
        if (!prev.find((v) => v.uuid === dlUUID)) {
          return [...prev, download];
        }
        return prev;
      });

      const progressChannel = `download_progress_${dlUUID}`;

      window.electronAPI.onDLProgress(progressChannel, (progress: number) => {
        setDownloads((prev) =>
          prev.map((d) => (d.uuid === dlUUID ? { ...d, progress } : d))
        );
      });

      const response = await window.electronAPI.downloadVideo(video, dlUUID);

      setDownloads((prev) =>
        prev.map((d) =>
          d.id === video.id ? { ...d, path: response?.path || "" } : d
        )
      );

      window.electronAPI.rmDLProgress(progressChannel);
      addAlert("success", response.message);
      new Notification("Download complete", {
        body: `The video "${video.title}" was successfully downloaded.`,
        icon: "../../icon.png",
      });
    } catch (error: any) {
      console.error(error);
      addAlert(
        "error",
        `Error downloading video: ${filterErrorMessage(error.message)}`
      );
    }
  };

  const removeVideo = (video: Video) => {
    setPlaylist((prev) => prev.filter((v) => v.id !== video.id));
  };

  const onSavePreferences = async (prefs: any) => {
    try {
      const updatedPrefs = await window.electronAPI.setConfig(prefs);
      setPreferences(updatedPrefs);
      addAlert("success", "Preferences saved successfully.");
    } catch (error: any) {
      console.error(error);
      addAlert("error", "Error saving preferences.");
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] container">
      {isModalOpen && (
        <PreferencesModal
          onSave={onSavePreferences}
          isOpen={isModalOpen}
          initialPreferences={preferences!}
          onClose={() => setIsModalOpen(false)}
        />
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
        <Tooltip text="Settings" position="right" variant="secondary">
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
              name="url"
              type="url"
              placeholder="Enter the video or playlist URL"
            />
            <Button type="submit" size="sm">
              Search
              <Search className="inline-block w-4" />
            </Button>
          </div>
        </form>
      </div>
      <div className="mt-3 rounded-sm bg-[var(--foreground)] p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">Video List</h2>
          <div className="flex gap-2">
            <Tooltip
              text={isGridView ? "List View" : "Grid View"}
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
                text="Download All"
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
              ? "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 max-[640px]:grid-cols-1"
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
                      <h3 className="text-lg font-semibold mb-2 truncate">
                        {video.title}
                      </h3>
                      <X
                        className="cursor-pointer w-5 mb-2"
                        onClick={() => removeVideo(video)}
                      />
                    </div>
                    {!isGridView ? (
                      <p className="text-gray-400 mb-2 whitespace-pre-line">
                        {expandedVideos.has(video.id)
                          ? video.description
                          : `${video.description.slice(0, 100)}`}
                        {video.description.length > 100 && (
                          <button
                            className="ml-1 text-[12px] text-blue-400 cursor-pointer hover:text-blue-500"
                            onClick={() => toggleExpanded(video.id)}
                          >
                            {expandedVideos.has(video.id)
                              ? "...Show less"
                              : "...Show more"}
                          </button>
                        )}
                      </p>
                    ) : (
                      ""
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-zinc-400">
                      {video.duration} - {video.size ?? "Unknown"}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => downloadVideo(video)}
                      >
                        <DownloadIcon className="inline-block h-4 w-4" />
                        {isGridView ? "" : "Download"}
                      </Button>
                      <Dropdown
                        size="sm"
                        label="Select Format"
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
                Try searching with a valid YouTube URL.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
