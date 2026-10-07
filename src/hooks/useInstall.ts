import { useCallback, useEffect, useState } from "react";
import {
  getInstallState,
  initPWA,
  isStandalone,
  onInstallStateChange,
  promptInstall,
  type InstallState,
} from "@/lib/pwa";

/* ============================================================
   React binding for the PWA install flow
   ============================================================ */

const DISMISS_KEY = "life-rpg.install.dismissed.v1";

export function isInstallDismissed(): boolean {
  try {
    return localStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstall(): void {
  try {
    localStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* dismissal is a convenience only */
  }
}

export function useInstall() {
  const [state, setState] = useState<InstallState>(getInstallState);

  useEffect(() => {
    initPWA();
    return onInstallStateChange(setState);
  }, []);

  const install = useCallback(async () => {
    const outcome = await promptInstall();
    return outcome;
  }, []);

  return {
    state,
    install,
    standalone: isStandalone(),
    canInstall: state === "available",
    needsGuide: state === "ios",
  };
}
