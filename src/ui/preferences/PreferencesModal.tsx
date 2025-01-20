import { useState, useEffect } from "react";
import { X } from "lucide-react";
import Switch from "../components/Switch";
import Dropdown from "../components/Dropdown";
import Button from "../components/Button";
import { LANGUAGES } from "../lib/const";

export interface Preferences {
  downloadPath: string;
  theme: "light" | "dark";
  language: string;
  notificationsEnabled: boolean;
  autoStartDownload: boolean;
  lastDownload?: string;
}

interface PreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPreferences: Preferences;
  onSave: (preferences: Preferences) => void;
}

export function PreferencesModal({
  isOpen,
  onClose,
  initialPreferences,
  onSave,
}: PreferencesModalProps) {
  const [preferences, setPreferences] =
    useState<Preferences>(initialPreferences);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const handleSave = () => {
    onSave(preferences);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-[#00000081] flex items-center justify-center z-10"
      id="layout"
      onMouseDown={(e) => {
        if ((e.target as HTMLDivElement).id === "layout") {
          onClose();
        }
      }}
    >
      <div className="bg-[var(--background-secondary)] rounded-lg shadow-xl max-w-md w-full">
        <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            Preferences
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <div
            onClick={async () => {
              const { canceled, filePaths } =
                await window.electronAPI.openFolderDialog();
              if (!canceled)
                setPreferences({ ...preferences, downloadPath: filePaths[0] });
            }}
          >
            <label
              htmlFor="downloadPath"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Download path
            </label>
            <span className="text-sm text-zinc-400 font-medium cursor-pointer hover:text-zinc-300 transition">
              {preferences.downloadPath}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Notificaciones
            </span>
            <Switch
              checked={preferences.notificationsEnabled}
              onToggle={() =>
                setPreferences({
                  ...preferences,
                  notificationsEnabled: !preferences.notificationsEnabled,
                })
              }
            />
          </div>
          {/* <div className="pb-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tema
            </label>
            <div className="flex items-center space-x-2">
              <Sun className="h-5 w-5 text-gray-400" />
              <Switch
                checked={preferences.theme === "light"}
                onToggle={() =>
                  setPreferences({
                    ...preferences,
                    theme: preferences.theme === "light" ? "dark" : "light",
                  })
                }
              />
              <Moon className="h-5 w-5 text-gray-400" />
            </div>
          </div> */}
          <Dropdown
            showIcon={false}
            value={LANGUAGES.find((l) => l.id === preferences.language)}
            size="sm"
            label="Language"
            items={LANGUAGES}
            onColumnChange={(option: any) =>
              setPreferences({ ...preferences, language: option.value })
            }
          />
        </div>
        <div className="flex justify-end p-4">
          <Button onClick={handleSave}>Save</Button>
        </div>
      </div>
    </div>
  );
}
