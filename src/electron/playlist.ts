// import { exec } from "node:child_process";
// import util from "node:util";
import { getVideoDetails, VideoDetails } from "./video.js";
import { axiosI } from "./config.js";
import * as cheerio from "cheerio";

// const execAsync = util.promisify(exec);

// export const getPlaylist = async (
//   playlistUrl: string
// ): Promise<VideoDetails[]> => {
//   try {
//     // Comando para obtener la lista de videos de la playlist
//     const command = `yt-dlp -J --flat-playlist ${playlistUrl}`;
//     const { stdout } = await execAsync(command);
//     const playlistJson = JSON.parse(stdout).entries;

//     if (!playlistJson || playlistJson.length === 0) {
//       throw new Error("La playlist no contiene videos o es inválida.");
//     }

//     // Obtener detalles de cada video
//     const playlistDetails = await Promise.all(
//       playlistJson.map(async (video: any) => {
//         if (!video.url) {
//           console.warn(
//             `Entrada inválida en la playlist: ${JSON.stringify(video)}`
//           );
//           return null;
//         }
//         return await getVideoDetails(video.url);
//       })
//     );

//     // Filtrar entradas nulas (videos inválidos)
//     return playlistDetails.filter((video) => video !== null) as VideoDetails[];
//   } catch (error) {
//     console.error("Error al obtener la playlist:", error);
//     throw error;
//   }
// };

export const getPlaylist = async (url: string): Promise<VideoDetails[]> => {
  try {
    const id = url.split("list=")[1];
    if (!id) throw new Error("URL de playlist inválida");

    const webUrl = `https://www.youtube.com/playlist?list=${id}`;

    // Obtener el HTML de la playlist
    const { data: html } = await axiosI.get(webUrl);
    const $ = cheerio.load(html);

    // Buscar el script que contiene "ytInitialData"
    const scriptTag = $("script")
      .toArray()
      .find((script: any) => $(script).html()?.includes("ytInitialData"));

    if (!scriptTag) throw new Error("No se encontró ytInitialData");

    const scriptContent = $(scriptTag).html();
    const ytInitialData = scriptContent?.match(
      /ytInitialData\s*=\s*(\{.*\});/s
    )?.[1];

    if (!ytInitialData) throw new Error("No se pudo extraer ytInitialData");

    const ytData = JSON.parse(ytInitialData);

    // Extraer los IDs de los videos
    const videoIds =
      ytData.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.sectionListRenderer.contents[0].itemSectionRenderer.contents[0].playlistVideoListRenderer.contents.map(
        ({ playlistVideoRenderer }: any) => playlistVideoRenderer.videoId
      );

    // Obtener detalles de los videos concurrentemente
    const playlist = await Promise.all(
      videoIds.map(async (id: string) => {
        try {
          const videoUrl = `https://www.youtube.com/watch?v=${id}`;
          return await getVideoDetails(videoUrl);
        } catch (err) {
          console.warn(`Error obteniendo detalles del video ${id}:`, err);
          return null;
        }
      })
    );

    // Filtrar videos que no se pudieron obtener
    return playlist.filter((video) => video !== null) as VideoDetails[];
  } catch (error) {
    console.error("Error al obtener la playlist:", error);
    throw error;
  }
};
