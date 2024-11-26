import { Accessibility, Paintbrush, Shield, User } from "lucide-react"
import { cn } from "../lib/utils"

type SettingsSection = 'account' | 'privacy' | 'appearance' | 'accessibility'

interface SettingsNavigationProps {
  activeSection: SettingsSection
  onSectionChange: (section: SettingsSection) => void
}

export function PreferencesNavigation({ activeSection, onSectionChange }: SettingsNavigationProps) {
  const navItems = [
    { id: 'account', label: 'Mi cuenta', icon: User },
    { id: 'privacy', label: 'Privacidad y seguridad', icon: Shield },
    { id: 'appearance', label: 'Apariencia', icon: Paintbrush },
    { id: 'accessibility', label: 'Accesibilidad', icon: Accessibility },
  ]

  return (
    <nav className="w-60 bg-[#2f3136]">
      {navItems.map((item) => (
        <button
          key={item.id}
          onClick={() => onSectionChange(item.id as SettingsSection)}
          className={cn(
            "w-full text-left px-4 py-[17px] flex items-center text-[#b9bbbe] hover:bg-[#373b41] hover:text-white transition-colors",
            activeSection === item.id && "bg-[#42464D] text-white"
          )}
        >
          <item.icon size={20} className="mr-3" />
          {item.label}
        </button>
      ))}
    </nav>
  )
}