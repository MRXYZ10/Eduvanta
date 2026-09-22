"use client";

import { useState, useEffect } from "react";

/**
 * Recharts (and any other library that takes color props rather than
 * className) can't respond to Tailwind's `dark:` variants or the
 * `rgb(var(--x))` pattern used elsewhere — it needs an actual computed
 * color string. This reads the current values of the app's CSS custom
 * properties (see globals.css) and returns them as `rgb(...)` strings,
 * re-reading whenever the `dark` class on <html> changes so a live theme
 * toggle updates chart colors without a page reload.
 */
export function useThemeColors() {
  const [colors, setColors] = useState({
    cobalt: "rgb(46 67 116)",
    signal: "rgb(194 121 10)",
    line: "rgb(228 225 218)",
    ink: "rgb(20 22 26)",
  });

  useEffect(() => {
    function read() {
      const style = getComputedStyle(document.documentElement);
      const get = (name: string) => `rgb(${style.getPropertyValue(name).trim()})`;
      setColors({
        cobalt: get("--cobalt"),
        signal: get("--signal"),
        line: get("--line"),
        ink: get("--ink"),
      });
    }

    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => observer.disconnect();
  }, []);

  return colors;
}
