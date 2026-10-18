// ---------------------------------------------------------------------------
// useLocalStorage
// Works like React's useState, but the value is also saved in localStorage
// every time it changes, and loaded from there when the app starts.
// ---------------------------------------------------------------------------
import { useEffect, useState } from "react";
import { load, save } from "../lib/storage";

export function useLocalStorage<T>(key: string, initialValue: T) {
  // The function form runs only once, on the first render.
  const [value, setValue] = useState<T>(() => load(key, initialValue));

  // Save whenever the value changes.
  useEffect(() => {
    save(key, value);
  }, [key, value]);

  return [value, setValue] as const;
}
