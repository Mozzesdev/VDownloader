import { Moon, Sun } from "lucide-react";

const ThemeToggle = ({ toggleTheme, theme }: any) => {
  return (
    <div className="flex items-center justify-center">
      <button
        type="button"
        onClick={toggleTheme}
        className="w-16 h-8 flex items-center p-1 bg-gray-200 dark:bg-gray-800 rounded-full transition-colors duration-300 relative shadow-md"
      >
        <span
          className={`w-6 h-6 rounded-full bg-white dark:bg-yellow-400 shadow transform transition-transform duration-300 ${
            theme === "dark" ? "translate-x-8" : "translate-x-0"
          }`}
        ></span>
        <span className="absolute left-1 text-gray-500 dark:text-gray-300 transition-opacity duration-300">
          <Sun size={20}/>
        </span>
        <span className="absolute right-1 text-gray-500 dark:text-gray-300 transition-opacity duration-300">
          <Moon size={20} />
        </span>
      </button>
    </div>
  );
};

export default ThemeToggle;
