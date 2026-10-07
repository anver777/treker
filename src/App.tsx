import { useEffect } from "react";
import { GameProvider, useGame } from "@/store/GameContext";
import { UIProvider } from "@/store/UIContext";
import { I18nProvider } from "@/i18n";
import { initPWA } from "@/lib/pwa";
import { AppShell } from "@/components/layout/AppShell";

function ThemeSync() {
  const { data } = useGame();

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const theme = data.settings.theme;
      const light = theme === "light" || (theme === "system" && !mq.matches);
      document.documentElement.classList.toggle("theme-light", light);
      document.documentElement.classList.toggle("dark", !light);
      const meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute("content", light ? "#f4f6f9" : "#06080b");
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [data.settings.theme]);

  useEffect(() => {
    document.documentElement.classList.toggle("reduce-motion", data.settings.reduceMotion);
  }, [data.settings.reduceMotion]);

  return null;
}

function PWABoot() {
  useEffect(() => initPWA(), []);
  return null;
}

export default function App() {
  return (
    <I18nProvider>
      <GameProvider>
        <UIProvider>
          <ThemeSync />
          <PWABoot />
          <AppShell />
        </UIProvider>
      </GameProvider>
    </I18nProvider>
  );
}
