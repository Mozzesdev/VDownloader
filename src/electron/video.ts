import path from "node:path";
import { getConfig } from "./config.js";
import axios from "axios";
import * as cheerio from "cheerio";
// import { spawn } from "node:child_process";
import fs from "node:fs";
import {
  decipherSignature,
  extractNSigSourceCode,
  getPlayerSourceCode,
} from "./utils/util.js";

// const execAsync = util.promisify(exec);

export interface VideoDetails {
  url: string;
  title: string;
  size?: string;
  duration: string;
  thumbnail: string | undefined;
  id: string;
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

  try {
    // Realizar la solicitud HTTP a la página del video
    const { data } = await axios.get(videoUrl);

    // Usar Cheerio para parsear el HTML
    const $ = cheerio.load(data);

    const thumbnail = $('meta[property="og:image"]').attr("content");

    // Buscar la variable ytInitialPlayerResponse en el script
    const ytInitialPlayerResponseMatch =
      /ytInitialPlayerResponse\s*=\s*(\{.*?\});/s.exec(data);

    if (!ytInitialPlayerResponseMatch) {
      throw new Error("No se pudo encontrar la respuesta del jugador");
    }

    // Parsear el JSON de ytInitialPlayerResponse
    const videoInfo = JSON.parse(ytInitialPlayerResponseMatch[1]);

    const videoDetails = videoInfo.videoDetails;

    console.log(videoInfo)

    // Extraer formatos de video
    const formats = videoInfo.streamingData.formats || [];
    const bestVideoFormat = formats
      .filter((format: any) => format.hasAudio && format.hasVideo)
      .sort((a: any, b: any) => b.width - a.width)[0]; // El formato con la mejor resolución

    // Calcular el tamaño total (esto es solo un ejemplo, se requiere una mayor lógica)
    const size = bestVideoFormat?.contentLength
      ? (parseInt(bestVideoFormat.contentLength) / (1024 * 1024)).toFixed(2) +
        " MB"
      : "N/A";

    // Retornar todos los datos del video
    return {
      id: videoId,
      url: videoUrl,
      title: videoDetails.title,
      duration: formatDuration(videoDetails.lengthSeconds),
      thumbnail,
      size,
    };
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
  onProgress: (progress: string) => void,
  audioOnly: boolean = false // Parámetro para decidir si se descarga solo el audio
): Promise<{ message: string }> => {
  try {
    const config = getConfig(); // Obtener configuración de descarga
    const videoTitle = videoDetails.title.replace(/[<>:"/\\|?*]+/g, ""); // Limpiar el título del video
    const videoUrl = videoDetails.url; // URL del video

    // Verificar si el archivo ya existe
    const videoPath = path.resolve(
      config.downloadPath,
      `${videoTitle}.%(ext)s`
    );
    if (fs.existsSync(videoPath)) {
      return {
        message: `El video "${videoTitle}" ya ha sido descargado.`, // Mensaje si ya existe el archivo
      };
    }

    // Paso 1: Obtener el HTML de la página de YouTube
    const { data } = await axios.get(videoUrl);

    // Paso 2: Buscar el script que contiene ytInitialPlayerResponse
    const playerResponseMatch = data.match(
      /ytInitialPlayerResponse\s*=\s*({.*?});/s
    );
    if (!playerResponseMatch) {
      throw new Error("No se pudo encontrar los metadatos del video.");
    }

    // Paso 3: Extraer la URL del video del objeto playerResponse
    const playerResponse = JSON.parse(playerResponseMatch[1]);

    // Obtenemos los formatos disponibles
    const formats = playerResponse.streamingData.adaptiveFormats;

    // Paso 4: Filtrar los formatos de video y audio
    const videoFormats = formats.filter(
      (format: any) =>
        format.mimeType.includes("video") && format.height <= 1080
    );
    const audioFormats = formats.filter((format: any) =>
      format.mimeType.includes("audio")
    );

    // Paso 5: Seleccionar el mejor formato según si es solo audio o video+audio
    let selectedFormat;

    if (audioOnly) {
      // Seleccionar el mejor formato de audio
      selectedFormat = audioFormats.reduce((prev: any, current: any) => {
        return prev.audioQuality === "AUDIO_QUALITY_LOW" &&
          current.audioQuality !== "AUDIO_QUALITY_LOW"
          ? current
          : prev;
      });
    } else {
      // Seleccionar el mejor formato de video (con audio y video)
      selectedFormat = videoFormats.reduce((prev: any, current: any) => {
        return prev.height > current.height ? prev : current;
      });
    }

    // Paso 6: Determinar la URL y extensión del formato seleccionado
    let downloadUrl = selectedFormat.url;

    const playerSourceCode = await getPlayerSourceCode();

    if (!downloadUrl && selectedFormat.signatureCipher) {
      // Extraer los parámetros de la cadena signatureCipher
      const urlParams = new URLSearchParams(selectedFormat.signatureCipher);

      // Obtener la firma (s) y sp (si está presente)
      const signature: string | null = urlParams.get("s");
      const baseUrl: string | null = urlParams.get("url");

      const url_components = new URL(baseUrl as string);

      // Validar que exista una firma y la URL base antes de continuar
      if (signature && baseUrl) {
        // Desencriptar la firma utilizando la función decipherSignature
        const decSignature = await decipherSignature(
          signature,
          playerSourceCode
        );

        const sp = urlParams.get("sp");

        if (typeof decSignature !== "string") {
          throw new Error("Fallo el decifrado de la firma.");
        }

        if (sp) {
          url_components.searchParams.set("sp", decSignature);
        } else {
          url_components.searchParams.set("signature", decSignature);
        }

        downloadUrl = url_components.toString();
      } else {
        console.error(
          "La firma o la URL base no están presentes en signatureCipher."
        );
      }
    }

    let nsig = "";

    const url = new URL(downloadUrl);
    const nCipher = url.searchParams.get("n");

    if (nCipher) {
      const nfunc = extractNSigSourceCode(playerSourceCode);
      if (nfunc) {
        nsig = nfunc(nCipher);
        url.searchParams.set("n", nsig);
      } else {
        console.error("No se pudo extraer la función nfunc.");
      }
    }

    downloadUrl = url.toString();

    console.log(downloadUrl);

    if (!downloadUrl) {
      throw new Error("No se pudo obtener la URL de descarga.");
    }

    // Paso 7: Iniciar la descarga usando la URL obtenida
    const chunkSize = 10 * 1024 * 1024; // Tamaño del chunk (10 MB)
    const totalSize = parseInt(selectedFormat.contentLength, 10); // Tamaño total del archivo
    const formatExtension = selectedFormat.mimeType.split("/")[1]; // Extensión del formato
    const filePath = videoPath.replace("%(ext)s", formatExtension); // Ruta del archivo

    const fileStream = fs.createWriteStream(filePath);

    // Inicializa variables de progreso
    let downloaded = 0;

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalSize - 1);

      // Descargar el chunk actual
      const response = await axios.get(downloadUrl, {
        headers: {
          Range: `bytes=${start}-${end}`,
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
          Referer: "https://youtube.com",
        },
        responseType: "stream",
      });

      await new Promise<void>((resolve, reject) => {
        response.data.pipe(fileStream, { end: false }); // No cerrar el stream al final
        response.data.on("end", resolve);
        response.data.on("error", reject);
      });

      // Actualizar el progreso
      downloaded += end - start + 1;
      const progress = ((downloaded / totalSize) * 100).toFixed(2);
      onProgress(progress); // Notificar el progreso
    }

    return new Promise((resolve, reject) => {
      fileStream.on("finish", () => {
        resolve({
          message: `Descarga completada: ${videoTitle}.${formatExtension}\nFormato: ${
            selectedFormat.qualityLabel
          }, Tamaño: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`,
        });
      });

      fileStream.on("error", (err) => {
        reject({
          success: false,
          message: `Error al guardar el archivo: ${err.message}`,
        });
      });
    });
  } catch (error: any) {
    return Promise.reject({
      success: false,
      message: `Error al descargar el video: ${error.message}`,
    });
  }
};
