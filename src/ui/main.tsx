import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import Layout from "./components/Layout.tsx";
import { ThemeProvider } from "./providers/ThemeProvider.tsx";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <Layout>
      <App />
    </Layout>
  </ThemeProvider>
);
