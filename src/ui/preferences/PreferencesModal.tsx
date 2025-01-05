import { useEffect, useState } from "react";
import { PreferencesNavigation } from "./PreferencesNavigation";
import { AccountSettings } from "./AccountSettings";
import { PrivacySettings } from "./PrivacySettings";
import { AppearanceSettings } from "./AppearanceSettings";
import { AccessibilitySettings } from "./AccessibilitySettings";
import { X } from "lucide-react";

type SettingsSection = "account" | "privacy" | "appearance" | "accessibility";

export function PreferencesModal({ onClose }: { onClose: () => void }) {
  const [activeSection, setActiveSection] =
    useState<SettingsSection>("account");

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
      <div className="bg-[#36393f] w-[90%] max-w-4xl h-[80%] rounded-lg flex overflow-hidden">
        <PreferencesNavigation
          activeSection={activeSection}
          onSectionChange={setActiveSection}
        />
        <div className="flex-1 flex flex-col">
          <div className="flex justify-between items-center p-4 border-b border-[#202225]">
            <h2 className="text-white text-xl font-semibold capitalize">
              {activeSection} Settings
            </h2>
            <button
              onClick={onClose}
              className="text-[#b9bbbe] hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-6">
            {activeSection === "account" && <AccountSettings />}
            {activeSection === "privacy" && <PrivacySettings />}
            {activeSection === "appearance" && <AppearanceSettings />}
            {activeSection === "accessibility" && <AccessibilitySettings />}
          </div>
        </div>
      </div>
    </div>
  );
}
