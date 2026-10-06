import { useAuth } from "@clerk/expo";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
const Context = createContext<{ entered: boolean; enter: () => void } | null>(null);
export function BrowseProvider({ children }: { children: ReactNode }) {
  const [entered, setEntered] = useState(false);
  const { isSignedIn } = useAuth();
  useEffect(() => { if (!isSignedIn) setEntered(false); }, [isSignedIn]);
  return <Context.Provider value={{ entered, enter: () => setEntered(true) }}>{children}</Context.Provider>;
}
export function useBrowse() { const value = useContext(Context); if (!value) throw new Error("BrowseProvider required"); return value; }
