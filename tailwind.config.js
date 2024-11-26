/** @type {import('tailwindcss').Config} */
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  content: ["./src/ui/**/*.{js,jsx,ts,tsx,html}", "./index.html"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        "background-secondary": "var(--background-secondary)",
        primary: "var(--primary)",
        secondary: "var(--secondary)",
      },
      borderRadius: {
        lg: `var(--radius)`,
        md: `calc(var(--radius) - 2px)`,
        sm: "calc(var(--radius) - 4px)",
      },
    },
    plugins: [tailwindcssAnimate],
  },
};
