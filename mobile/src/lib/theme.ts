import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from "react";
import { Platform, useColorScheme } from "react-native";
import * as SecureStore from "expo-secure-store";

/** NexaGear palette with a remembered preference and a live device-mode subscription. */
export interface Theme {
  scheme: "light" | "dark";
  paper: string;
  surface: string;
  ink: string;
  drafting: string;
  signal: string;
  steel: string;
  stock: string;
  border: string;
}

const light: Theme = {
  scheme: "light",
  paper: "#ffffff",
  surface: "#f4f4f4",
  ink: "#111111",
  drafting: "#ff7a16",
  signal: "#b83d0c",
  steel: "#666666",
  stock: "#078a00",
  border: "#e5e5e5",
};

const dark: Theme = {
  scheme: "dark",
  paper: "#17191c",
  surface: "#23262b",
  ink: "#f5f5f7",
  drafting: "#ff8a5b",
  signal: "#ff8a5b",
  steel: "#a1a1a6",
  stock: "#3fbf6b",
  border: "#3a3a3c",
};

export type ThemePreference = "auto" | "light" | "dark";
const STORAGE_KEY = "nexagear.appearance";
const ThemeContext = createContext<{ preference: ThemePreference; setPreference: (value: ThemePreference) => Promise<void>; ready: boolean; error: string | null } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setValue] = useState<ThemePreference>("auto");
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const value = Platform.OS === "web" ? window.localStorage.getItem(STORAGE_KEY) : await SecureStore.getItemAsync(STORAGE_KEY);
        if (active && (value === "auto" || value === "light" || value === "dark")) setValue(value);
      } catch { /* Device mode remains available when storage is unavailable. */ }
      finally { if (active) setReady(true); }
    }
    void load();
    return () => { active = false; };
  }, []);
  async function setPreference(value: ThemePreference) {
    setValue(value);
    setError(null);
    try {
      if (Platform.OS === "web") window.localStorage.setItem(STORAGE_KEY, value);
      else await SecureStore.setItemAsync(STORAGE_KEY, value);
    } catch { setError("Appearance changed for this session, but could not be saved. Try choosing it again."); }
  }
  return createElement(ThemeContext.Provider, { value: { preference, setPreference, ready, error } }, children);
}

export function useAppearance() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("Appearance requires ThemeProvider");
  return context;
}

export function useTheme(): Theme {
  const device = useColorScheme();
  const context = useContext(ThemeContext);
  const preference = context?.preference ?? "auto";
  return (preference === "auto" ? device : preference) === "dark" ? dark : light;
}
