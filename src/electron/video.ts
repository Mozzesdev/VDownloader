import { exec, spawn } from "node:child_process";
import util from "node:util";
import path from "node:path";
import { getConfig } from "./config.js";

const execAsync = util.promisify(exec);

export interface VideoDetails {
  url: string;
  title: string;
  videoDetails: any;
  size: string;
  duration: string;
  thumbnail: string;
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
  const command = `yt-dlp -J ${videoUrl}`;
  const { stdout } = await execAsync(command);
  const videoInfo = JSON.parse(stdout);

  const videoFormat = videoInfo.formats
    .filter(
      (format: any) =>
        format.vcodec !== "none" && format.height <= 1080 && format.filesize
    )
    .sort((a: any, b: any) => b.height - a.height)[0];

  const audioFormat = videoInfo.formats.find(
    (format: any) =>
      format.acodec !== "none" && format.vcodec === "none" && format.filesize
  );

  const totalSize =
    ((videoFormat?.filesize || 0) + (audioFormat?.filesize || 0)) /
    (1024 * 1024);

  return {
    url: videoUrl,
    title: videoInfo.title,
    duration: formatDuration(videoInfo.duration),
    thumbnail: videoInfo.thumbnail,
    videoDetails: videoInfo,
    size: `${totalSize.toFixed(2)} MB`,
  };
};

export const downloadVideo = (
  videoDetails: VideoDetails,
  onProgress: (progress: string) => void
): Promise<{ message?: string }> => {
  const config = getConfig();
  const videoTitle = videoDetails.title.replace(/[<>:"/\\|?*]+/g, "");
  const videoPath = path.resolve(config.downloadPath, `${videoTitle}.%(ext)s`);

  return new Promise((resolve, reject) => {
    const ytDlpProcess = spawn("yt-dlp", [
      "-f",
      "bestvideo[height<=1080]+bestaudio",
      "-o",
      videoPath,
      videoDetails.url,
    ]);

    let alreadyDownloaded = false;

    ytDlpProcess.stdout.on("data", (data: any) => {
      const output = data.toString();
      const progressMatch = output.match(/(\d{1,3}\.\d+)%/);
      if (progressMatch) onProgress(progressMatch[1]);
      if (output.includes("has already been downloaded")) {
        alreadyDownloaded = true;
        onProgress("100"); // Indicar que la descarga ya está completa
      }
    });

    ytDlpProcess.on("close", (code: any) => {
      if (alreadyDownloaded) {
        resolve({
          message: `El video "${videoTitle}" ya ha sido descargado.`,
        });
      } else if (code === 0) {
        resolve({
          message: `Descarga completada para el video: ${videoTitle}`,
        });
      } else {
        reject({
          success: false,
          message: `Error: yt-dlp terminó con el código ${code}`,
        });
      }
    });
  });
};
