import path from "node:path";
import { getConfig } from "./config.js";
import axios from "axios";
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
import { promisify } from "node:util";

// const execAsync = util.promisify(exec);

export interface VideoDetails {
  url: string;
  title: string;
  size?: string;
  duration: string;
  thumbnail: string | undefined;
  id: string;
  streamingData: any;
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

// export const getVideoDetails = async (
//   videoUrl: string
// ): Promise<VideoDetails> => {
//   const command = `yt-dlp --no-warnings --quiet --get-title --get-duration --get-thumbnail --format "bestvideo[height<=1080]+bestaudio" ${videoUrl}`;
//   const { stdout } = await execAsync(command);
//   const videoInfo = JSON.parse(stdout);

//   const videoFormat = videoInfo.formats
//     .filter(
//       (format: any) =>
//         format.vcodec !== "none" && format.height <= 1080 && format.filesize
//     )
//     .sort((a: any, b: any) => b.height - a.height)[0];

//   const audioFormat = videoInfo.formats.find(
//     (format: any) =>
//       format.acodec !== "none" && format.vcodec === "none" && format.filesize
//   );

//   const totalSize =
//     ((videoFormat?.filesize || 0) + (audioFormat?.filesize || 0)) /
//     (1024 * 1024);

//   return {
//     id: videoInfo.id,
//     url: videoUrl,
//     title: videoInfo.title,
//     duration: formatDuration(videoInfo.duration),
//     thumbnail: videoInfo.thumbnail,
//     size: `${totalSize.toFixed(2)} MB`,
//   };
// };

export const getVideoDetails = async (
  videoUrl: string
): Promise<VideoDetails> => {
  const videoId = videoUrl.split("v=")[1]; // Extraer videoId del URL

  const url =
    "https://www.youtube.com/youtubei/v1/player?prettyPrint=false&alt=json";

  const body = {
    context: {
      client: {
        clientName: CLIENTS.IOS.NAME,
        clientVersion: CLIENTS.IOS.VERSION,
        userAgent: CLIENTS.IOS.USER_AGENT,
      },
    },
    videoId,
  };

  try {
    // Realizar la solicitud HTTP a la página del video
    const { data } = await axios.post(url, body, {
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
    const formats = streamingData.formats || [];
    const bestVideoFormat = formats
      .filter((format: any) => format.hasAudio && format.hasVideo)
      .sort((a: any, b: any) => b.width - a.width)[0]; // El formato con la mejor resolución

    // Calcular el tamaño total (esto es solo un ejemplo, se requiere una mayor lógica)
    const size = bestVideoFormat?.contentLength
      ? (parseInt(bestVideoFormat.contentLength) / (1024 * 1024)).toFixed(2) +
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
    };

    // Retornar todos los datos del video
    return videoInfo;
  } catch (error) {
    console.error("Error al obtener los detalles del video:", error);
    throw new Error("No se pudo obtener la información del video");
  }
};

// export const downloadVideo = (
//   videoDetails: VideoDetails,
//   onProgress: (progress: string) => void
// ): Promise<{ message?: string }> => {
//   const config = getConfig();
//   const videoTitle = videoDetails.title.replace(/[<>:"/\\|?*]+/g, "");
//   const videoPath = path.resolve(config.downloadPath, `${videoTitle}.%(ext)s`);

//   return new Promise((resolve, reject) => {
//     const ytDlpProcess = spawn("yt-dlp", [
//       "-f",
//       "bestvideo[height<=1080]+bestaudio",
//       "-o",
//       videoPath,
//       videoDetails.url,
//     ]);

//     let alreadyDownloaded = false;

//     ytDlpProcess.stdout.on("data", (data: any) => {
//       const output = data.toString();
//       const progressMatch = output.match(/(\d{1,3}\.\d+)%/);
//       if (progressMatch) onProgress(progressMatch[1]);
//       if (output.includes("has already been downloaded")) {
//         alreadyDownloaded = true;
//         onProgress("100"); // Indicar que la descarga ya está completa
//       }
//     });

//     ytDlpProcess.on("close", (code: any) => {
//       if (alreadyDownloaded) {
//         resolve({
//           message: `El video "${videoTitle}" ya ha sido descargado.`,
//         });
//       } else if (code === 0) {
//         resolve({
//           message: `Descarga completada para el video: ${videoTitle}`,
//         });
//       } else {
//         reject({
//           success: false,
//           message: `Error: yt-dlp terminó con el código ${code}`,
//         });
//       }
//     });
//   });
// };

export const downloadVideo = async (
  videoDetails: VideoDetails,
  onProgress: (progress: string) => void
): Promise<{ message: string }> => {
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

    const videOpts = {
      type: "video+audio",
      quality: "best",
    };

    const { audioFormat, videoFormat } = chooseFormat(videOpts, streamingData);

    if (audioFormat && !videoFormat) {
      const audioUrl = await getDownloadUrl(audioFormat);
      const audio = {
        ...audioFormat,
        finalUrl: audioUrl,
        path: config.downloadPath,
        title: `${videoTitle}_audio`,
      };

      const result = await downloadFile(audio, onProgress);
      return result;
    }

    if (videoFormat && !audioFormat) {
      const videoUrl = await getDownloadUrl(videoFormat);
      const video = {
        ...videoFormat,
        finalUrl: videoUrl,
        path: config.downloadPath,
        title: `${videoTitle}_video`,
      };

      const result = await downloadFile(video, onProgress);
      return result;
    }

    if (videoFormat && audioFormat) {
      // Descargar video
      const videoUrl = await getDownloadUrl(videoFormat);
      const video = {
        ...videoFormat,
        finalUrl: videoUrl,
        path: config.downloadPath,
        title: `${videoTitle}_video`,
      };
      video.filePath = resolveFilePath(video);
      await downloadFile(video, onProgress);

      // Descargar audio
      const audioUrl = await getDownloadUrl(audioFormat);
      const audio = {
        ...audioFormat,
        path: config.downloadPath,
        title: `${videoTitle}_audio`,
        finalUrl: audioUrl,
      };
      audio.filePath = resolveFilePath(audio);
      await downloadFile(audio, onProgress);

      // Unir video y audio
      const finalPath = path.resolve(config.downloadPath, `${videoTitle}.mp4`);
      console.log("Unir video y audio...");
      await mergeVideoAndAudio(video.filePath, audio.filePath, finalPath);

      return {
        message: `El video "${videoTitle}" y el audio se descargaron correctamente.`,
      };
    }

    return {
      message: `No se encontraron formatos disponibles para la descarga.`,
    };
  } catch (error: any) {
    return Promise.reject({
      success: false,
      message: `Error al descargar el video: ${error.message}`,
    });
  }
};

const delay = promisify(setTimeout);

const shouldRetry = (status: number): boolean => {
  return status >= 500 && status < 600; // Errores del servidor
};

const getChunkRange = (
  start: number,
  chunkSize: number,
  totalSize: number
): string => {
  const end = Math.min(start + chunkSize - 1, totalSize - 1);
  return `${start}-${end}`;
};

const downloadChunk = async (
  url: string,
  range: string,
  retries: number,
  maxRetries: number,
  format: Format
): Promise<Buffer> => {
  try {
    const response = await fetch(`${url}`, {
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
    });

    if (!response.ok) {
      if (response.status === 403) {
        console.warn("403 Forbidden: Intentando regenerar la URL...");
        format.finalUrl = await getDownloadUrl(format); // Regenera la URL
        throw new Error("URL regenerada, reintentando descarga...");
      }
      if (shouldRetry(response.status)) {
        throw new Error(
          `Retriable error ${response.status}: ${response.statusText}`
        );
      } else {
        throw new Error(
          `Non-retriable error ${response.status}: ${response.statusText}`
        );
      }
    }

    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer);
  } catch (error: any) {
    if (retries >= maxRetries) {
      throw new Error(`Error after ${retries} retries: ${error.message}`);
    }

    console.error(
      `Error al descargar el rango ${range}: ${error.message}. Reintentando...`
    );
    await delay(2000 * retries);
    return downloadChunk(url, range, retries + 1, maxRetries, format);
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
  onProgress: (progress: string) => void
): Promise<{ message: string }> => {
  const chunkSize = 10 * 1024 * 1024; // Tamaño del chunk (10 MB)
  const totalSize = parseInt(format.contentLength, 10);

  if (fs.existsSync(format.filePath!)) {
    return { message: `El archivo "${format.title}" ya ha sido descargado.` };
  }

  const fileStream = fs.createWriteStream(format.filePath!);
  let chunkStart = 0;

  try {
    while (chunkStart < totalSize) {
      const range = getChunkRange(chunkStart, chunkSize, totalSize);
      const chunk = await downloadChunk(
        format.finalUrl as string,
        range,
        0,
        3,
        format
      );

      fileStream.write(chunk);
      chunkStart += chunk.length;

      const progress = ((chunkStart / totalSize) * 100).toFixed(2);
      onProgress(progress);
    }

    fileStream.end();
    return {
      message: `Descarga completada: ${format.title}\nFormato: ${
        format.qualityLabel
      }, Tamaño: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
    };
  } catch (error: any) {
    fileStream.destroy();
    deleteFileIfExists(format.filePath!);
    throw new Error(`Error al descargar el archivo: ${error.message}`);
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
