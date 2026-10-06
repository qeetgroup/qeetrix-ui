import { useTheme } from "@qeetrix/ui";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { defaultFrameEnv, type FrameEnv } from "../lib/frame";
import type { Density, Direction } from "../lib/prefs";

/**
 * The shell's global render settings, shared with everything that opens a preview frame so a
 * gallery frame matches the page around it.
 */
interface ShellSettings {
  density: Density;
  setDensity: (density: Density) => void;
  dir: Direction;
  setDir: (dir: Direction) => void;
}

const ShellSettingsContext = createContext<ShellSettings | null>(null);

export function ShellSettingsProvider({
  value,
  children,
}: {
  value: ShellSettings;
  children: ReactNode;
}) {
  return <ShellSettingsContext.Provider value={value}>{children}</ShellSettingsContext.Provider>;
}

export function useShellSettings(): ShellSettings {
  const context = useContext(ShellSettingsContext);
  if (!context) throw new Error("useShellSettings needs the playground shell.");
  return context;
}

/** The frame environment that mirrors the shell: resolved theme, density and direction. */
export function useShellFrameEnv(): FrameEnv {
  const { resolvedTheme } = useTheme();
  const { density, dir } = useShellSettings();
  return useMemo(
    () => ({ ...defaultFrameEnv, theme: resolvedTheme, density, dir }),
    [resolvedTheme, density, dir],
  );
}
