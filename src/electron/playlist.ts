import { exec } from "node:child_process";
import { getVideoDetails, VideoDetails } from "./video.js";
import util from "node:util";

const execAsync = util.promisify(exec);

export const getPlaylist = async (
  playlistUrl: string
): Promise<VideoDetails[]> => {
  try {
    // Comando para obtener la lista de videos de la playlist
    const command = `yt-dlp -J --flat-playlist ${playlistUrl}`;
    const { stdout } = await execAsync(command);
    const playlistJson = JSON.parse(stdout).entries;

    if (!playlistJson || playlistJson.length === 0) {
      throw new Error("La playlist no contiene videos o es inválida.");
    }

    // Obtener detalles de cada video
    const playlistDetails = await Promise.all(
      playlistJson.map(async (video: any) => {
        if (!video.url) {
          console.warn(
            `Entrada inválida en la playlist: ${JSON.stringify(video)}`
          );
          return null;
        }
        return await getVideoDetails(video.url);
      })
    );

    // Filtrar entradas nulas (videos inválidos)
    return playlistDetails.filter((video) => video !== null) as VideoDetails[];
  } catch (error) {
    console.error("Error al obtener la playlist:", error);
    throw error;
  }
};
