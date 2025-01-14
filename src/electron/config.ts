import fs from "node:fs";
import path from "node:path";
import { app, nativeTheme, shell } from "electron";
import { osLocaleSync } from "os-locale";
import axios from "axios";

export interface AppConfig {
  downloadPath: string;
  theme?: "light" | "dark";
  language?: string;
  notificationsEnabled?: boolean;
  autoStartDownload?: boolean;
  lastDownload?: string;
}

const getConfigFilePath = (): string =>
  path.join(app.getPath("userData"), "config.json");

const systemLanguage = osLocaleSync() || "en";
const systemTheme = nativeTheme.shouldUseDarkColors ? "dark" : "light";

const defaultConfig: AppConfig = {
  downloadPath: app.getPath("downloads"),
  theme: systemTheme,
  language: systemLanguage,
  notificationsEnabled: true,
  autoStartDownload: false,
  lastDownload: undefined,
};

export const getConfig = (): AppConfig => {
  const configFilePath = getConfigFilePath();
  try {
    if (fs.existsSync(configFilePath)) {
      const configContent = fs.readFileSync(configFilePath, "utf-8");
      return { ...defaultConfig, ...JSON.parse(configContent) };
    }
  } catch (error) {
    console.error("Error al leer el archivo de configuración:", error);
  }
  return defaultConfig;
};

export const setConfig = (newConfig: Partial<AppConfig>): AppConfig => {
  const configFilePath = getConfigFilePath();
  const currentConfig = getConfig();
  const updatedConfig = { ...currentConfig, ...newConfig };

  try {
    fs.writeFileSync(
      configFilePath,
      JSON.stringify(updatedConfig, null, 2),
      "utf-8"
    );
    return updatedConfig;
  } catch (error) {
    console.error("Error al guardar la configuración:", error);
    throw error;
  }
};

export const openFile = (path: string) => {
  shell.openPath(path);
};

export const axiosI = axios.create({
  timeout: 5000,
});

// axiosI.interceptors.request.use(
//   (config) => {
//     if (config.url) {
//       const originalUrl = new URL(config.url); // Convertimos a URL para manipular fácilmente

//       // Verifica si la URL es absoluta (contiene "https://" o "http://")
//       if (
//         originalUrl.protocol === "https:" ||
//         originalUrl.protocol === "http:"
//       ) {
//         // Construimos la URL para el proxy
//         const proxyUrl = new URL(
//           `http://localhost:${PORT}${originalUrl.pathname}`
//         );
//         proxyUrl.searchParams.set("__host", originalUrl.host);

//         // Convertimos los headers a un objeto y lo serializamos
//         const headers: any = {};
//         for (const [key, value] of Object.entries(config.headers || {})) {
//           headers[key] = value;
//         }
//         proxyUrl.searchParams.set("__headers", JSON.stringify(headers));

//         // Actualizamos la configuración de la solicitud
//         config.url = proxyUrl.toString();
//       }
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// function copyHeader(headerName: any, targetHeaders: any, sourceHeaders: any) {
//   if (sourceHeaders[headerName]) {
//     targetHeaders[headerName] = sourceHeaders[headerName];
//   }
// }

// export const createProxyServer = () => {
//   const server = http.createServer(async (req, res) => {
//     if (req.method === "OPTIONS") {
//       res.writeHead(200, {
//         "Access-Control-Allow-Origin": req.headers.origin || "*",
//         "Access-Control-Allow-Methods": "*",
//         "Access-Control-Allow-Headers":
//           "Origin, X-Requested-With, Content-Type, Accept, Authorization, x-goog-visitor-id, x-goog-api-key, x-origin, x-youtube-client-version, x-youtube-client-name, x-goog-api-format-version, x-user-agent, Accept-Language, Range, Referer",
//         "Access-Control-Max-Age": "86400",
//         "Access-Control-Allow-Credentials": "true",
//       });
//       return res.end();
//     }

//     const url = new URL(req.url as string, `http://localhost:${PORT}`);
//     const __host = url.searchParams.get("__host");
//     const __headers = url.searchParams.get("__headers");

//     if (!__host) {
//       res.writeHead(400, { "Content-Type": "text/plain" });
//       return res.end(
//         "Request is formatted incorrectly. Please include __host in the query string."
//       );
//     }

//     // Construct the proxied URL
//     url.host = __host;
//     url.protocol = "https";
//     url.port = "443";
//     url.searchParams.delete("__host");
//     url.searchParams.delete("__headers");

//     // Build headers for the proxied request
//     const requestHeaders = JSON.parse(__headers || "{}");
//     copyHeader("range", requestHeaders, req.headers);

//     if (!requestHeaders["user-agent"]) {
//       copyHeader("user-agent", requestHeaders, req.headers);
//     }

//     const options = {
//       method: req.method,
//       headers: requestHeaders,
//     };

//     try {
//       const proxyReq = https.request(url, options, (proxyRes) => {
//         const responseHeaders = {
//           "Access-Control-Allow-Origin": req.headers.origin || "*",
//           "Access-Control-Allow-Methods": "*",
//           "Access-Control-Allow-Headers": "*",
//           "Access-Control-Allow-Credentials": "true",
//         };

//         copyHeader("content-length", responseHeaders, proxyRes.headers);
//         copyHeader("content-type", responseHeaders, proxyRes.headers);
//         copyHeader("content-disposition", responseHeaders, proxyRes.headers);
//         copyHeader("accept-ranges", responseHeaders, proxyRes.headers);
//         copyHeader("content-range", responseHeaders, proxyRes.headers);

//         res.writeHead(proxyRes.statusCode as number, responseHeaders);
//         proxyRes.pipe(res);
//       });

//       proxyReq.on("error", (error: any) => {
//         res.writeHead(500, { "Content-Type": "text/plain" });
//         res.end(`Proxy error: ${error.message}`);
//       });

//       if (req.method !== "GET" && req.method !== "HEAD") {
//         req.pipe(proxyReq);
//       } else {
//         proxyReq.end();
//       }
//     } catch (error: any) {
//       res.writeHead(500, { "Content-Type": "text/plain" });
//       res.end(`Proxy error: ${error.message}`);
//     }
//   });

//   server.listen(PORT, () => {
//     console.log(`Proxy server running at http://localhost:${PORT}`);
//   });
// };
