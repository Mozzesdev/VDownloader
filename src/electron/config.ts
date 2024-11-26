import fs from "node:fs";
import path from "node:path";
import { app, nativeTheme } from "electron";
import { osLocaleSync } from "os-locale";

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
