import axios from "axios";
import { createWriteStream, WriteStream } from "node:fs";
import { Format } from "../interfaces/Format.js";
import path from "node:path";
import { spawn } from "node:child_process";
import { unlink, access } from "node:fs/promises";

export const isDev = (): boolean => process.env.NODE_ENV === "development";

export const decipherSignature = async (
  signatureCipher: string,
  sourceCode: string
): Promise<string | null> => {
  try {
    // Utilidad para extraer una función por métodos .split("") y .join("")
    const extractFunctionFromStringByMethods = (str: string): string | null => {
      const funcRegex =
        /function\s*\([a-zA-Z0-9,_\s]*\)\s*{[^}]*\.split\(""\)[^}]*return\s+[a-zA-Z0-9,_\s]*\.join\(""\)[^}]*}/g;
      return str.match(funcRegex)?.[0] || null;
    };

    // Extraer la definición de un objeto dado su nombre
    const extractObjectDefinition = (
      str: string,
      objectName: string
    ): string | null => {
      const objectRegex = new RegExp(
        `${objectName}\\s*=\\s*({[\\s\\S]*?}});?`,
        "g"
      );
      const match = str.match(objectRegex)?.[0];
      return match
        ? match
            .replace(new RegExp(`^${objectName}\\s*=\\s*`), "")
            .replace(/;$/, "")
        : null;
    };

    // Extraer nombres de objetos referenciados dentro de una función
    const extractReferencedObjects = (funcStr: string): string[] => {
      const objectRegex = /\b([a-zA-Z_][a-zA-Z0-9_]*)\./g;
      const matches = funcStr.match(objectRegex) || [];
      return [...new Set(matches.map((m) => m.slice(0, -1)))];
    };

    // Unificar líneas eliminando saltos de línea y espacios extra
    const unifiedData = sourceCode.replace(/\s+/g, " ").trim();

    // eslint-disable-next-line prefer-const
    let extractedFunction: (input: string) => string | null = () => null;

    // Extraer la función de desencriptado
    const extractedFunctionStr =
      extractFunctionFromStringByMethods(unifiedData);
    if (!extractedFunctionStr) {
      return null;
    }

    // Identificar y cargar objetos referenciados por la función
    const referencedObjects = extractReferencedObjects(extractedFunctionStr);
    const objectDefinitions: Record<string, string> = {};

    for (const objectName of [referencedObjects[1]]) {
      const objectDefinition = extractObjectDefinition(unifiedData, objectName);
      if (objectDefinition) {
        objectDefinitions[objectName] = objectDefinition;
      } else {
        console.error(`No se encontró definición para el objeto ${objectName}`);
      }
    }

    // Construir y evaluar el bloque de código
    let evaluationBlock = "";
    for (const [name, definition] of Object.entries(objectDefinitions)) {
      evaluationBlock += `var ${name} = ${definition};\n`;
    }
    evaluationBlock += `extractedFunction = ${extractedFunctionStr};`;

    try {
      eval(evaluationBlock);
    } catch (evalError) {
      console.error("Error al evaluar la función y los objetos:", evalError);
      return null;
    }

    // Probar la función extraída
    try {
      return extractedFunction(signatureCipher);
    } catch (execError) {
      console.error("Error al ejecutar la función extraída:", execError);
      return null;
    }
  } catch (error) {
    console.error("Error durante el proceso:", error);
    return null;
  }
};

export async function* streamToIterable(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

export const getPlayerSourceCode = async (): Promise<string> => {
  const iframe = await axios.get("https://www.youtube.com/iframe_api");

  const versionMatch = iframe.data.match(/player\\\/([0-9a-fA-F]{8})\\\//);
  const version = versionMatch?.[1] || "";

  if (!version.trim()) {
    throw new Error("Could not extract player version.");
  }

  const playerSource = await axios.get(
    `https://www.youtube.com/s/player/${version}/player_ias.vflset/en_US/base.js`
  );

  return playerSource.data;
};

/**
 * Obtiene el tamaño total del archivo desde el encabezado `Content-Length`.
 * @param url URL del archivo a descargar
 * @returns Tamaño total en bytes
 */
export const getTotalSize = async (url: string): Promise<number> => {
  try {
    const response = await axios.head(url);
    const contentLength = response.headers["content-length"];
    if (contentLength) {
      return parseInt(contentLength, 10);
    }
    throw new Error("No se pudo obtener Content-Length");
  } catch (error) {
    throw new Error(
      `Error obteniendo el tamaño total: ${(error as Error).message}`
    );
  }
};

/**
 * Descarga un rango de bytes del archivo y escribe los datos en el archivo de salida.
 * @param url URL del archivo a descargar
 * @param start Byte inicial del rango
 * @param end Byte final del rango
 * @param outputStream Stream de escritura para el archivo de salida
 */
export const downloadChunk = async (
  url: string,
  start: number,
  end: number,
  outputStream: WriteStream
): Promise<void> => {
  try {
    const response = await axios.get(url, {
      headers: { Range: `bytes=${start}-${end}` },
      responseType: "stream",
    });

    if (response.status === 206 || response.status === 200) {
      response.data.pipe(outputStream, { end: false });
      await new Promise<void>((resolve, reject) => {
        response.data.on("end", resolve);
        response.data.on("error", reject);
      });
    } else {
      throw new Error(`HTTP Status ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Error descargando el rango ${start}-${end}: ${(error as Error).message}`
    );
  }
};

/**
 * Descarga un archivo por chunks y lo guarda localmente.
 * @param url URL del archivo a descargar
 * @param outputFileName Nombre del archivo de salida
 * @param chunkSize Tamaño de cada chunk en bytes
 */
export const downloadFileByChunks = async (
  url: string,
  outputFileName: string,
  chunkSize: number
): Promise<void> => {
  try {
    const totalSize = await getTotalSize(url);
    console.log(`Tamaño total: ${totalSize} bytes`);

    const outputStream = createWriteStream(outputFileName, { flags: "a" });

    for (let start = 0; start < totalSize; start += chunkSize) {
      const end = Math.min(start + chunkSize - 1, totalSize - 1);
      console.log(`Descargando bytes ${start}-${end}...`);
      await downloadChunk(url, start, end, outputStream);
    }

    outputStream.close();
    console.log("Descarga completada!");
  } catch (error) {
    console.error("Error durante la descarga:", (error as Error).message);
  }
};

export const urlOrNone = (url: string | null | undefined): string | null => {
  if (!url || typeof url !== "string") {
    return null;
  }
  url = url.trim();

  const regex =
    /^(?:(?:https?|rt(?:m(?:pt?[es]?|fp)|sp[su]?)|mms|ftps?):)?\/\//;
  return regex.test(url) ? url : null;
};

export const extractNSigSourceCode = (
  data: string
): ((input: string) => string) | null => {
  const source = data.replace(/\s+/g, " ").trim();
  const searchPatterns: string[] = ["enhanced_except", "-_w8_", "1969"];

  let startIndex: number = -1;
  for (const pattern of searchPatterns) {
    startIndex = source.indexOf(pattern);
    if (startIndex !== -1) break;
  }

  if (startIndex === -1) {
    console.log("No se encontró ninguna referencia relevante.");
    return null;
  }

  let funcStart: number = source.lastIndexOf("=function", startIndex);
  if (funcStart === -1) {
    console.log("No se encontró el inicio de la función.");
    return null;
  }

  funcStart++;

  let endIndex: number = -1;
  const stack: string[] = [];
  let inString: boolean = false;
  let stringChar: string = "";

  for (let i: number = funcStart; i < source.length; i++) {
    const char: string = source[i];

    if (inString) {
      if (char === "\\") {
        i++;
      } else if (char === stringChar) {
        inString = false;
      }
      continue;
    }

    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      stringChar = char;
      continue;
    }

    if (char === "{") {
      stack.push("{");
    } else if (char === "}") {
      stack.pop();

      if (stack.length === 0) {
        endIndex = i;
        break;
      }
    }
  }

  if (endIndex !== -1) {
    const functionCode: string = source.slice(funcStart, endIndex + 1).trim();
    // console.log("Función encontrada:\n", functionCode);

    return evaluateFunction(functionCode, source);
  } else {
    console.log("No se encontró el final de la función.");
    return null;
  }
};

const getVariableValue = (
  data: string,
  variableName: string
): string | null => {
  const regex = new RegExp(`var\\s+${variableName}\\s*=\\s*([^;]+);`);
  const match = data.match(regex);

  if (match && match[1]) {
    return match[1].trim(); // Devuelve la asignación de la variable
  }

  return null;
};

const evaluateFunction = (
  functionCode: string,
  data: string
): ((input: string) => string) | null => {
  // Añadir la función al bloque de evaluación

  const variableName = findVariableUsedInTypeofUndefined(functionCode);
  let variableValue: any;

  if (variableName) {
    // Obtener el valor de la variable
    variableValue = getVariableValue(data, variableName);

    if (!variableValue) {
      console.log(`No se encontró el valor de la variable ${variableName}`);
    }
  } else {
    console.log(
      "No se encontró ninguna variable con 'typeof ... === \"undefined\"'"
    );
  }

  // Agregar la declaración de la variable al contexto de evaluación
  const declarationBlock = `var ${variableName} = ${variableValue};\n`;

  let extractedFunction: any;

  const evaluationBlock = `${declarationBlock}extractedFunction = ${functionCode}`;

  // Evaluar el bloque completo
  try {
    eval(evaluationBlock);
  } catch (evalError) {
    console.error("Error al evaluar la función:", evalError);
    return null;
  }

  // Probar la función extraída si existe
  if (typeof extractedFunction === "function") {
    const input = "cIoXIYywXfv83puVi";
    try {
      extractedFunction(input);
    } catch (execError) {
      console.error("Error al ejecutar la función:", execError);
    }
  }

  return extractedFunction;
};

const findVariableUsedInTypeofUndefined = (data: string): string | null => {
  const regex = /typeof\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*===\s*"undefined"/g;
  const matches = [...data.matchAll(regex)];

  if (matches.length > 0) {
    return matches[0][1]; // Devuelve el nombre de la variable encontrada
  }

  return null;
};

export default function evaluate(code: string, env: Record<string, any>) {
  console.debug("Evaluating JavaScript:\n", code);

  // Crear un nuevo contexto de ejecución
  const context = { ...env };

  // Crear una función que evalúe el código en el contexto dado
  const contextKeys = Object.keys(context).join(", ");
  const contextValues = Object.values(context);
  const functionBody = `return (function(${contextKeys}) { ${code} })(${contextKeys});`;

  const result = new Function(...contextKeys, functionBody)(...contextValues);

  console.debug("Done. Result:", result);

  return result;
}

export const generateRandomString = (length: number): string => {
  const result = [];

  const alphabet =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";

  for (let i = 0; i < length; i++) {
    result.push(alphabet.charAt(Math.floor(Math.random() * alphabet.length)));
  }

  return result.join("");
};

export function chooseFormat(
  options: any,
  streamingData?: any
): { videoFormat: Format | null; audioFormat: Format | null } {
  if (!streamingData) throw new Error("Streaming data not available");

  const formats: Format[] = [
    ...(streamingData.formats || []),
    ...(streamingData.adaptiveFormats || []),
  ];

  const requiresAudio = options.type ? options.type.includes("audio") : true;
  const requiresVideo = options.type ? options.type.includes("video") : true;
  const quality = options.quality || "best";
  const use_most_efficient = quality !== "best";

  // Filtrar formatos de video
  const videoFormats = formats.filter(
    (format) => format.qualityLabel && !format.audioQuality
  );

  // Si solo se requiere audio
  if (requiresAudio && !requiresVideo) {
    const audioFormats = formats.filter(
      (format) => format.audioQuality && !format.qualityLabel
    );
    if (!audioFormats.length)
      throw new Error("No se encontraron formatos de audio disponibles.");

    // Seleccionar el mejor formato de audio según la eficiencia o calidad
    const bestAudioFormat = audioFormats.reduce((best, current) => {
      return use_most_efficient
        ? current.bitrate < best.bitrate
          ? current
          : best
        : current.bitrate > best.bitrate
        ? current
        : best;
    }, audioFormats[0]);

    return { videoFormat: null, audioFormat: bestAudioFormat };
  }

  // Si se requiere video
  let bestVideoFormat = null;
  if (requiresVideo && videoFormats.length) {
    // Seleccionar el mejor formato de video
    bestVideoFormat = videoFormats[0];
    if (quality === "best" || quality === "bestefficiency") {
      bestVideoFormat = videoFormats.reduce((best, current) => {
        return (current.width || 0) > (best.width || 0) ? current : best;
      }, videoFormats[0]);
    } else {
      const specificQuality = videoFormats.find(
        (format) => format.qualityLabel === quality
      );
      if (specificQuality) bestVideoFormat = specificQuality;
    }
  }

  // Filtrar formatos combinados que coincidan con la calidad del video seleccionado
  const combinedFormats = formats.filter(
    (format) =>
      format.audioQuality &&
      format.qualityLabel === bestVideoFormat?.qualityLabel
  );

  if (combinedFormats.length > 0 && bestVideoFormat) {
    // Elegir el mejor formato combinado según eficiencia o calidad
    const bestCombinedFormat = combinedFormats.reduce((best, current) => {
      return use_most_efficient
        ? current.bitrate < best.bitrate
          ? current
          : best
        : current.bitrate > best.bitrate
        ? current
        : best;
    }, combinedFormats[0]);

    return { videoFormat: bestCombinedFormat, audioFormat: null };
  }

  // Si no hay formatos combinados, buscar el mejor formato de audio
  const audioFormats = formats.filter(
    (format) => format.audioQuality && !format.qualityLabel
  );
  if (requiresAudio && audioFormats.length) {
    const bestAudioFormat = audioFormats.reduce((best, current) => {
      return use_most_efficient
        ? current.bitrate < best.bitrate
          ? current
          : best
        : current.bitrate > best.bitrate
        ? current
        : best;
    }, audioFormats[0]);

    return { videoFormat: bestVideoFormat, audioFormat: bestAudioFormat };
  }

  return { videoFormat: bestVideoFormat, audioFormat: null };
}

export const resolveFilePath = async (format: Format): Promise<string> => {
  const formatExtension = format.mimeType.match(/\/([^;]+)/)?.[1] ?? "unknown";
  const fileName = `${format.title}.${formatExtension}`;
  let filePath = path.resolve(format.path as string, fileName);

  let counter = 1;
  const fileBaseName = fileName.substring(0, fileName.lastIndexOf('.'));
  const fileExt = fileName.substring(fileName.lastIndexOf('.'));

  // Verificar si el archivo ya existe y generar un nombre único
  while (await fileExists(filePath)) {
    filePath = path.resolve(format.path as string, `${fileBaseName}_${counter}${fileExt}`);
    counter++;
  }

  return filePath;
};

/**
 * Une un archivo de video y uno de audio en un solo archivo MP4 usando FFmpeg.
 * @param videoPath Ruta del archivo de video.
 * @param audioPath Ruta del archivo de audio.
 * @param outputPath Ruta del archivo combinado.
 * @returns Una promesa que se resuelve cuando el archivo combinado se completa.
 */
export const mergeVideoAndAudio = async (
  videoPath: string,
  audioPath: string,
  outputPath: string,
  onProgress?: (progress: number) => void,
  signal?: AbortSignal
): Promise<void> => {
  const ffmpegArgs = [
    "-i",
    videoPath,
    "-i",
    audioPath,
    "-c:v",
    "copy",
    "-c:a",
    "aac",
    "-strict",
    "experimental",
    outputPath,
  ];

  const ffmpegProcess = spawn("ffmpeg", ffmpegArgs);

  ffmpegProcess.stderr.on("data", (data) => {
    if (onProgress) {
      onProgress(0);

      if (data.toString().includes("muxing overhead")) {
        onProgress(100);
      }
    }
  });

  if (signal) {
    signal.addEventListener("abort", () => {
      if (!ffmpegProcess.killed) {
        ffmpegProcess.kill("SIGINT");
      }
    });
  }

  let wasCancelled = false;

  try {
    await new Promise<void>((resolve, reject) => {
      ffmpegProcess.on("close", (code, signal) => {
        if (signal === "SIGINT") {
          wasCancelled = true;
          reject(new Error("Combinación cancelada por el usuario."));
        } else if (code === 0) {
          resolve();
        } else {
          reject(
            new Error(
              `FFmpeg falló con el código ${code || "desconocido"} y la señal ${
                signal || "ninguna"
              }.`
            )
          );
        }
      });

      ffmpegProcess.on("error", (error) => {
        reject(new Error(`Error al ejecutar FFmpeg: ${error.message}`));
      });
    });
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    throw error;
  } finally {
    try {
      await unlink(videoPath);
      await unlink(audioPath);

      const outputFile = await fileExists(outputPath);

      if (wasCancelled && outputFile) {
        await unlink(outputPath);
      }
    } catch (err: any) {
      console.error(`Error al limpiar archivos: ${err.message}`);
    }
  }
};

// Verifica si un archivo existe
const fileExists = async (path: string): Promise<boolean> => {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
};

export const parseStreamingData = (streamingData: any) => {
  const parsed_data = { streaming_data: {} };

  if (streamingData) {
    parsed_data.streaming_data = {
      expires: new Date(
        Date.now() + parseInt(streamingData.expiresInSeconds) * 1000
      ),
      formats: streamingData.formats,
      adaptiveFormats: streamingData.adaptiveFormats,
      dash_manifest_url: streamingData.dashManifestUrl,
      hls_manifest_url: streamingData.hlsManifestUrl,
      server_abr_streaming_url: streamingData.serverAbrStreamingUrl,
    };
  }

  return parsed_data;
};
