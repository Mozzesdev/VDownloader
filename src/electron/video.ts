import { axiosI, getConfig } from "./config.js";
// import { spawn } from "node:child_process";
import fs from "node:fs";
import {
  chooseFormat,
  decipherSignature,
  extractNSigSourceCode,
  generateRandomString,
  getPlayerSourceCode,
  mergeVideoAndAudio,
  resolveFilePath,
} from "./utils/util.js";
import { CLIENTS } from "./utils/constants.js";
import { Format } from "./interfaces/Format.js";

// const execAsync = util.promisify(exec);

export interface VideoDetails {
  url: string;
  title: string;
  size?: string;
  duration: string;
  thumbnail: string | undefined;
  id: string;
  streamingData: any;
  description: string;
  formatSelected?: any;
}

export interface FormatOptions {
  type: "video" | "audio" | "video+audio";
  quality: "144p" | "240p" | "360p" | "480p" | "720p" | "1080p" | "best";
}

export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return hours > 0
    ? `${hours}:${minutes.toString().padStart(2, "0")}:${secs
        .toString()
        .padStart(2, "0")}`
    : `${minutes}:${secs.toString().padStart(2, "0")}`;
};

export const getVideoDetails = async (
  videoUrl: string
): Promise<VideoDetails> => {
  const videoId = videoUrl.split("v=")[1]; // Extraer videoId del URL

  const url = "https://www.youtube.com/youtubei/v1/player";

  const body = {
    context: {
      client: {
        clientName: CLIENTS.IOS.NAME,
        clientVersion: CLIENTS.IOS.VERSION,
        userAgent: CLIENTS.IOS.USER_AGENT,
        deviceMake: CLIENTS.IOS.DEVICE_MAKE,
        hl: CLIENTS.IOS.HL,
        osName: CLIENTS.IOS.OS_NAME,
        osVersion: CLIENTS.IOS.OS_VERSION,
        timeZone: CLIENTS.IOS.TIME_ZONE,
        gl: CLIENTS.IOS.GL,
        utcOffsetMinutes: CLIENTS.IOS.UTC_OFFSET_MINUTES,
      },
    },
    contentCheckOk: true,
    videoId,
  };

  try {
    // Realizar la solicitud HTTP a la página del video
    const { data } = await axiosI.post(url, body, {
      headers: {
        "User-Agent": body.context.client.userAgent,
        Accept: "*/*",
        "Content-Type": "application/json",
      },
    });

    const { videoDetails, streamingData } = data;

    if (!videoDetails)
      throw new Error("No se pudo obtener los detalles del video");

    // Extraer formatos de video
    const formats = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || []),
    ];
    const bestVideoFormat = formats[0];

    // Calcular el tamaño total (esto es solo un ejemplo, se requiere una mayor lógica)
    const size = bestVideoFormat?.contentLength
      ? (parseInt(bestVideoFormat.contentLength) / (1024 * 1024)).toFixed(0) +
        " MB"
      : "N/A";

    const videoInfo: VideoDetails = {
      id: videoId,
      url: videoUrl,
      title: videoDetails.title,
      duration: formatDuration(videoDetails.lengthSeconds),
      thumbnail:
        videoDetails.thumbnail.thumbnails[
          videoDetails.thumbnail.thumbnails.length - 1
        ].url,
      size,
      streamingData,
      description: videoDetails.shortDescription,
    };

    // Retornar todos los datos del video
    return videoInfo;
  } catch (error: any) {
    console.error("Error al obtener los detalles del video:", error);
    return Promise.reject(error.message);
  }
};

export const downloadVideo = async (
  videoDetails: VideoDetails,
  onProgress: (progress: number) => void,
  signal: AbortSignal
): Promise<{ message: string; path?: string }> => {
  try {
    const config = getConfig();

    // Validar que la ruta de descarga sea un directorio válido
    if (!fs.existsSync(config.downloadPath)) {
      throw new Error(`El directorio ${config.downloadPath} no existe.`);
    }

    if (!fs.lstatSync(config.downloadPath).isDirectory()) {
      throw new Error(`La ruta ${config.downloadPath} no es un directorio.`);
    }

    const videoTitle = sanitizeTitle(videoDetails.title);
    const streamingData = videoDetails.streamingData;

    const formatSelected = [
      ...(streamingData.formats || []),
      ...(streamingData.adaptiveFormats || []),
    ].find((fmat) => fmat.itag === videoDetails.formatSelected.id);

    const videOpts = {
      type: formatSelected?.audioQuality ? "audio" : "video+audio",
      quality: "best",
    };

    let { audioFormat, videoFormat } = chooseFormat(videOpts, streamingData);

    if (formatSelected?.qualityLabel && !formatSelected.audioQuality)
      (videoFormat as Format) = formatSelected;

    if (formatSelected?.audioQuality && !formatSelected.qualityLabel)
      (audioFormat as Format) = formatSelected;

    // Si solo hay audio
    if (audioFormat && !videoFormat) {
      const audioUrl = await getDownloadUrl(audioFormat);
      const audio = {
        ...audioFormat,
        finalUrl: audioUrl,
        path: config.downloadPath,
        title: `${videoTitle}`,
      };

      audio.filePath = await resolveFilePath(audio);
      const result = await downloadFile(audio, onProgress, signal); // Pasamos el signal
      return result;
    }

    // Si solo hay video
    if (videoFormat && !audioFormat) {
      const videoUrl = await getDownloadUrl(videoFormat);
      const video = {
        ...videoFormat,
        finalUrl: videoUrl,
        path: config.downloadPath,
        title: `${videoTitle}`,
      };

      video.filePath = await resolveFilePath(video);
      const result = await downloadFile(video, onProgress, signal); // Pasamos el signal
      return result;
    }

    // Si hay tanto video como audio
    if (videoFormat && audioFormat) {
      const totalProgress = { video: 0, audio: 0, merge: 0 };

      const onOverallProgress = () => {
        const overallProgress =
          totalProgress.video * 0.495 +
          totalProgress.audio * 0.495 +
          totalProgress.merge * 0.01;

        onProgress(overallProgress); // Actualizar progreso hacia el front
      };

      // Descargar video
      const videoUrl = await getDownloadUrl(videoFormat);
      const video = {
        ...videoFormat,
        finalUrl: videoUrl,
        path: config.downloadPath,
        title: `${videoTitle}_video`,
      };
      video.filePath = await resolveFilePath(video);

      await downloadFile(
        video,
        (progress) => {
          if (progress === -1) {
            onProgress(-1);
            throw new Error("Descarga cancelada");
          }
          totalProgress.video = progress;
          onOverallProgress();
        },
        signal
      );

      // Descargar audio
      const audioUrl = await getDownloadUrl(audioFormat);
      const audio = {
        ...audioFormat,
        path: config.downloadPath,
        title: `${videoTitle}_audio`,
        finalUrl: audioUrl,
      };
      audio.filePath = await resolveFilePath(audio);

      await downloadFile(
        audio,
        (progress) => {
          if (progress === -1) {
            onProgress(-1);
            throw new Error("Descarga cancelada");
          }
          totalProgress.audio = progress;
          onOverallProgress();
        },
        signal
      );

      // Unir video y audio
      const finalFomart = {
        title: videoTitle,
        path: config.downloadPath,
        mimeType: "video/mp4",
      };

      const finalPath = await resolveFilePath(finalFomart as Format);

      await mergeVideoAndAudio(
        video.filePath,
        audio.filePath,
        finalPath,
        (progress) => {
          totalProgress.merge = progress;
          onOverallProgress();
        },
        signal
      );

      return {
        message: `El video "${videoTitle}" y el audio se descargaron correctamente.`,
        path: finalPath,
      };
    }

    throw new Error("No se encontraron formatos disponibles para la descarga.");
  } catch (error: any) {
    return Promise.reject(error.message);
  }
};

const getChunkRange = (
  start: number,
  chunkSize: number,
  totalSize: number
): string => {
  const end = Math.min(start + chunkSize - 1, totalSize - 1);
  return `${start}-${end}`;
};

const downloadChunk = async (url: string, range: string): Promise<Buffer> => {
  try {
    const response = await axiosI.get(url, {
      headers: {
        accept: "*/*",
        origin: "https://www.youtube.com",
        referer: "https://www.youtube.com",
        connection: "keep-alive",
        range: `bytes=${range}`,
        DNT: "?1",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
      },
      responseType: "arraybuffer",
    });

    const buffer = Buffer.from(response.data);
    return buffer;
  } catch (error: any) {
    throw new Error(`Error descargando el video: ${error.message}`);
  }
};

const deleteFileIfExists = (filePath: string): void => {
  if (fs.existsSync(filePath)) {
    try {
      fs.unlinkSync(filePath);
      console.warn(`Archivo incompleto eliminado: ${filePath}`);
    } catch (error) {
      console.error(
        `Error al intentar eliminar el archivo: ${filePath}, ${error}`
      );
    }
  }
};

export const downloadFile = async (
  format: Format,
  onProgress: (progress: number) => void,
  signal?: AbortSignal
): Promise<{ message: string; path?: string }> => {
  const chunkSize = 5 * 1024 * 1024; // Tamaño del chunk (5 MB)
  const totalSize = parseInt(format.contentLength, 10);

  const fileStream = fs.createWriteStream(format.filePath!);
  let chunkStart = 0;

  // Escuchar eventos de error para manejar excepciones inesperadas
  fileStream.on("error", (error) => {
    console.error(`Error en el flujo de escritura: ${error.message}`);
  });

  try {
    while (chunkStart < totalSize) {
      // Verificar si el signal ha sido abortado
      if (signal?.aborted) {
        onProgress(-1); // Notificar cancelación
        // Cerrar el flujo con `end()` para garantizar que no haya escrituras pendientes
        fileStream.end(() => fileStream.destroy());
        throw new Error("Descarga cancelada por el usuario.");
      }

      const range = getChunkRange(chunkStart, chunkSize, totalSize);
      const chunk = await downloadChunk(format.finalUrl as string, range);

      // Verificar antes de escribir si el flujo sigue activo
      if (!fileStream.destroyed) {
        const canWrite = fileStream.write(chunk);
        if (!canWrite) {
          // Si el flujo está lleno, espera a que drene
          await new Promise((resolve) => fileStream.once("drain", resolve));
        }
      } else {
        throw new Error("El flujo fue destruido prematuramente.");
      }

      chunkStart += chunk.length;

      // Calcular y actualizar el progreso
      const progress = ((chunkStart / totalSize) * 100).toFixed(2);
      onProgress(+progress);
    }

    // Finalizar correctamente el flujo
    fileStream.end();
    return {
      message: `Descarga completada: ${format.title}\nFormato: ${
        format.qualityLabel
      }, Tamaño: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
      path: format.filePath,
    };
  } catch (error: any) {
    // Asegurarte de destruir el flujo en caso de error
    if (!fileStream.destroyed) {
      fileStream.destroy();
    }
    deleteFileIfExists(format.filePath!);
    throw new Error(error.message);
  }
};

const sanitizeTitle = (title: string): string => {
  return title.replace(/[<>:"/\\|?*]+/g, "");
};

export const getDownloadUrl = async (
  selectedFormat: Format,
  nsigCache?: Map<string, string>
): Promise<string> => {
  let downloadUrl = selectedFormat.url;
  const playerSourceCode = await getPlayerSourceCode();

  if (!downloadUrl && selectedFormat.signatureCipher) {
    const urlParams = new URLSearchParams(selectedFormat.signatureCipher);
    const signature = urlParams.get("s");
    const baseUrl = urlParams.get("url");

    if (signature && baseUrl) {
      const urlComponents = new URL(baseUrl);
      const decSignature = await decipherSignature(signature, playerSourceCode);
      const sp = urlParams.get("sp");

      if (sp) {
        urlComponents.searchParams.set("sp", decSignature as string);
      } else {
        urlComponents.searchParams.set("signature", decSignature as string);
      }

      downloadUrl = urlComponents.toString();
    } else {
      throw new Error(
        "La firma o la URL base no están presentes en signatureCipher."
      );
    }
  }

  if (!downloadUrl) throw new Error("No se pudo obtener la URL de descarga.");

  const url = new URL(downloadUrl);
  const n = url.searchParams.get("n");

  if (n) {
    let nsig: string | undefined;

    // Verifica si el valor ya está en la caché
    if (nsigCache?.has(n)) {
      nsig = nsigCache.get(n);
    } else {
      const nfunc = extractNSigSourceCode(playerSourceCode);
      if (nfunc) {
        nsig = nfunc(n);

        // Guarda el resultado en la caché si es válido
        if (nsig && nsigCache) {
          nsigCache.set(n, nsig);
        }
      } else {
        throw new Error("No se pudo extraer la función nfunc.");
      }
    }

    if (nsig) {
      url.searchParams.set("n", nsig);
    }
  }

  if (selectedFormat.sabr !== "1" && selectedFormat.poToken) {
    url.searchParams.set("pot", selectedFormat.poToken);
  }

  const client = url.searchParams.get("c");

  switch (client) {
    case CLIENTS.WEB.NAME:
      url.searchParams.set("cver", CLIENTS.WEB.VERSION);
      break;
    case CLIENTS.MWEB.NAME:
      url.searchParams.set("cver", CLIENTS.MWEB.VERSION);
      break;
    case CLIENTS.YTMUSIC.NAME:
      url.searchParams.set("cver", CLIENTS.YTMUSIC.VERSION);
      break;
    case CLIENTS.WEB_KIDS.NAME:
      url.searchParams.set("cver", CLIENTS.WEB_KIDS.VERSION);
      break;
    case CLIENTS.TV.NAME:
      url.searchParams.set("cver", CLIENTS.TV.VERSION);
      break;
    case CLIENTS.TV_EMBEDDED.NAME:
      url.searchParams.set("cver", CLIENTS.TV_EMBEDDED.VERSION);
      break;
    case CLIENTS.WEB_EMBEDDED.NAME:
      url.searchParams.set("cver", CLIENTS.WEB_EMBEDDED.VERSION);
      break;
  }

  const cpn = generateRandomString(16);
  url.searchParams.set("cpn", cpn);

  return url.toString();
};
