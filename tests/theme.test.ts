import { describe, expect, it } from "vitest";

import {
  DEFAULT_SCHEME,
  DEFAULT_THEME,
  SCHEMES,
  SCHEME_ATTR,
  SCHEME_LABELS,
  SCHEME_PREFERENCE_ATTR,
  SCHEME_QUERY_PARAM,
  SCHEME_STORAGE_KEY,
  THEMES,
  THEME_BOOTSTRAP_SCRIPT,
  THEME_LABELS,
  THEME_QUERY_PARAM,
  THEME_STORAGE_KEY,
  hasThemeParam,
  isScheme,
  isTheme,
  resolveScheme,
  resolveSchemeToMode,
  resolveTheme,
  schemeFromSearch,
  themeAttribute,
  themeFromSearch,
} from "@/lib/theme";

describe("theme resolution", () => {
  it("defaults to the shipped datasheet design", () => {
    expect(DEFAULT_THEME).toBe("datasheet");
    expect(resolveTheme("", null)).toBe("datasheet");
  });

  it("reads a known theme from the query string", () => {
    expect(themeFromSearch("?theme=apple")).toBe("apple");
    expect(resolveTheme("?theme=apple", null)).toBe("apple");
    expect(themeFromSearch("?theme=datasheet")).toBe("datasheet");
  });

  it("finds the parameter among other parameters", () => {
    // /order/track?ref=NGX-1006&theme=apple must resolve, and a ref that
    // merely contains the word "theme" must not.
    expect(themeFromSearch("?ref=NGX-1006&theme=apple")).toBe("apple");
    expect(themeFromSearch("?ref=theme=apple")).toBeNull();
  });

  it("ignores an unknown theme rather than trusting it", () => {
    expect(themeFromSearch("?theme=solarized")).toBeNull();
    expect(isTheme("solarized")).toBe(false);
    expect(isTheme(undefined)).toBe(false);
    expect(isTheme(7)).toBe(false);
  });

  it("falls back to the default for a malformed link, not to stored state", () => {
    // Someone sent ?theme=solarized. Whatever the recipient last chose is
    // irrelevant; a broken link shows the shipped design. This case failed
    // when the invalid parameter fell through to stored state.
    expect(resolveTheme("?theme=solarized", "apple")).toBe("datasheet");
    expect(resolveTheme("?theme=", "apple")).toBe("datasheet");
  });

  it("distinguishes an absent parameter from an invalid one", () => {
    expect(hasThemeParam("")).toBe(false);
    expect(hasThemeParam("?ref=NGX-1006")).toBe(false);
    expect(hasThemeParam("?theme=apple")).toBe(true);
    expect(hasThemeParam("?theme=solarized")).toBe(true);
  });

  it("uses remembered state when no parameter is present", () => {
    // This is what keeps the theme alive across a Link to /shop, which drops
    // the query string.
    expect(resolveTheme("", "apple")).toBe("apple");
    expect(resolveTheme("", "datasheet")).toBe("datasheet");
  });

  it("lets an explicit parameter override remembered state", () => {
    expect(resolveTheme("?theme=datasheet", "apple")).toBe("datasheet");
    expect(resolveTheme("?theme=apple", "datasheet")).toBe("apple");
  });

  it("ignores a corrupt stored value", () => {
    expect(resolveTheme("", "not-a-theme")).toBe("datasheet");
    expect(resolveTheme("", "")).toBe("datasheet");
  });

  it("tolerates a query string that is not parseable", () => {
    expect(resolveTheme("?%%%", null)).toBe("datasheet");
    expect(resolveTheme(":::", "apple")).toBe("apple");
  });

  it("has a label for every theme", () => {
    for (const theme of THEMES) {
      expect(THEME_LABELS[theme]).toBeTruthy();
    }
  });

  it("writes the attribute the CSS selector reads", () => {
    expect(themeAttribute("apple")).toBe("apple");
  });
});

describe("scheme resolution", () => {
  it("follows the system by default", () => {
    expect(DEFAULT_SCHEME).toBe("auto");
    expect(resolveScheme("", null)).toBe("auto");
  });

  it("reads an explicit scheme from the query string", () => {
    expect(schemeFromSearch("?scheme=dark")).toBe("dark");
    expect(resolveScheme("?scheme=dark", "light")).toBe("dark");
    expect(resolveScheme("?scheme=light", "dark")).toBe("light");
    expect(resolveScheme("?scheme=auto", "dark")).toBe("auto");
  });

  it("remembers a stored scheme when no parameter is present", () => {
    // This is what keeps dark mode across a Link to /shop, which drops the
    // query string.
    expect(resolveScheme("", "dark")).toBe("dark");
    expect(resolveScheme("", "light")).toBe("light");
    expect(resolveScheme("", "auto")).toBe("auto");
  });

  it("sends a malformed link to auto, not to stored state", () => {
    // Same rule as ?theme=: a broken link must be deterministic for whoever
    // opens it, whatever they happened to have chosen.
    expect(schemeFromSearch("?scheme=sepia")).toBeNull();
    expect(resolveScheme("?scheme=sepia", "dark")).toBe("auto");
    expect(resolveScheme("?scheme=", "dark")).toBe("auto");
    expect(isScheme("sepia")).toBe(false);
    expect(isScheme(null)).toBe(false);
  });

  it("ignores a corrupt stored scheme", () => {
    expect(resolveScheme("", "chartreuse")).toBe("auto");
  });

  it("collapses auto to the system preference before paint", () => {
    // The stylesheet only knows light and dark, so auto must never reach it.
    expect(resolveSchemeToMode("auto", true)).toBe("dark");
    expect(resolveSchemeToMode("auto", false)).toBe("light");
  });

  it("lets an explicit choice override the system preference", () => {
    expect(resolveSchemeToMode("light", true)).toBe("light");
    expect(resolveSchemeToMode("dark", false)).toBe("dark");
  });

  it("has a label for every scheme", () => {
    for (const scheme of SCHEMES) {
      expect(SCHEME_LABELS[scheme]).toBeTruthy();
    }
  });
});

describe("pre-paint bootstrap script", () => {
  it("is syntactically valid JavaScript", () => {
    // Not a formality. A stray brace once made the whole script a syntax
    // error: it failed to execute, so NO theme or scheme was ever applied,
    // the page silently fell back to unstyled defaults, and axe still passed.
    // Nothing but parsing it would have caught that.
    expect(() => new Function(THEME_BOOTSTRAP_SCRIPT)).not.toThrow();
  });

  it("executes and writes both appearance attributes", () => {
    const root: Record<string, string> = {};
    const documentElement = {
      setAttribute: (name: string, value: string) => {
        root[name] = value;
      },
    };
    const store = new Map<string, string>();
    const run = new Function(
      "document",
      "location",
      "localStorage",
      "window",
      "URLSearchParams",
      THEME_BOOTSTRAP_SCRIPT,
    );

    run(
      { documentElement },
      { search: "?theme=apple&scheme=dark" },
      { getItem: (k: string) => store.get(k) ?? null, setItem: () => {} },
      { matchMedia: () => ({ matches: false }) },
      URLSearchParams,
    );

    expect(root["data-theme"]).toBe("apple");
    expect(root["data-scheme-preference"]).toBe("dark");
    expect(root["data-scheme"]).toBe("dark");
  });

  it("resolves auto from the system preference when executing", () => {
    const root: Record<string, string> = {};
    const documentElement = {
      setAttribute: (name: string, value: string) => {
        root[name] = value;
      },
    };
    const run = new Function(
      "document",
      "location",
      "localStorage",
      "window",
      "URLSearchParams",
      THEME_BOOTSTRAP_SCRIPT,
    );

    // The OS prefers dark and the visitor asked for auto: the page must come
    // up dark before the first paint, not flash white.
    run(
      { documentElement },
      { search: "?scheme=auto" },
      { getItem: () => null, setItem: () => {} },
      { matchMedia: (q: string) => ({ matches: q.includes("dark") }) },
      URLSearchParams,
    );

    expect(root["data-scheme-preference"]).toBe("auto");
    expect(root["data-scheme"]).toBe("dark");
  });

  it("reads the same parameter and storage keys the app uses", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_QUERY_PARAM);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(THEME_STORAGE_KEY);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(SCHEME_QUERY_PARAM);
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(SCHEME_STORAGE_KEY);
  });

  it("sets the attributes the CSS keys off", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("data-theme");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(SCHEME_ATTR);
    // The preference is tracked separately so the control can show "Auto"
    // rather than silently relabelling it "Light".
    expect(THEME_BOOTSTRAP_SCRIPT).toContain(SCHEME_PREFERENCE_ATTR);
  });

  it("resolves auto against matchMedia itself, before paint", () => {
    // If the script did not read the media query, a visitor whose OS is dark
    // would get a full-brightness white flash on every load.
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("matchMedia");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("prefers-color-scheme: dark");
  });

  it("never throws when storage is unavailable", () => {
    // Private browsing and blocked third-party storage both make
    // localStorage throw on access. The script wraps it, so a theme change can
    // never take down the page.
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("catch");
    expect(THEME_BOOTSTRAP_SCRIPT).toContain("try");
  });

  it("does not send data anywhere", () => {
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain("fetch");
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain("XMLHttpRequest");
    expect(THEME_BOOTSTRAP_SCRIPT).not.toContain("navigator.sendBeacon");
  });
});

describe("palette accessibility across both schemes", () => {
  /**
   * A theme (datasheet | apple) and a scheme (light | dark) are independent
   * axes, so there are FOUR palettes and every accent has to hold up in all of
   * them. A colour that passes in one says nothing about the other three — that
   * is exactly how a dark theme ships unreadable text.
   *
   * These values must match scripts/color-contrast-audit.mjs, which is the gate
   * and additionally greps app/globals.css for them.
   */
  const relLuminance = (hex: string): number => {
    const v = hex.replace("#", "");
    const channel = (c: number) => {
      const s = c / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    return (
      0.2126 * channel(parseInt(v.slice(0, 2), 16)) +
      0.7152 * channel(parseInt(v.slice(2, 4), 16)) +
      0.0722 * channel(parseInt(v.slice(4, 6), 16))
    );
  };

  const contrast = (a: string, b: string): number => {
    const la = relLuminance(a);
    const lb = relLuminance(b);
    const [hi, lo] = la > lb ? [la, lb] : [lb, la];
    return (hi + 0.05) / (lo + 0.05);
  };

  const PALETTES: Record<string, Record<string, string>> = {
    "datasheet/light": {
      paper: "#f6f3ec",
      surface: "#ffffff",
      ink: "#1a1d21",
      drafting: "#2254a3",
      signal: "#c4430f",
      steel: "#5c646d",
      stock: "#2e7d4f",
    },
    "datasheet/dark": {
      paper: "#16181c",
      surface: "#1f2228",
      ink: "#e9e7e1",
      drafting: "#8ab4f8",
      signal: "#ff8a5b",
      steel: "#a7adb6",
      stock: "#5fd39a",
    },
    "apple/light": {
      paper: "#ffffff",
      surface: "#f5f5f7",
      ink: "#1d1d1f",
      drafting: "#0058b8",
      signal: "#0058b8",
      steel: "#5b5b60",
      stock: "#1c6b3f",
    },
    "apple/dark": {
      paper: "#000000",
      surface: "#1c1c1e",
      ink: "#f5f5f7",
      drafting: "#409cff",
      signal: "#409cff",
      steel: "#a1a1a6",
      stock: "#3fbf6b",
    },
  };

  it("covers every theme-and-scheme combination", () => {
    expect(Object.keys(PALETTES)).toEqual([
      "datasheet/light",
      "datasheet/dark",
      "apple/light",
      "apple/dark",
    ]);
  });

  for (const [name, palette] of Object.entries(PALETTES)) {
    describe(name, () => {
      it("keeps every text token at 4.5:1 on both backgrounds", () => {
        for (const background of ["paper", "surface"]) {
          for (const foreground of [
            "ink",
            "steel",
            "drafting",
            "signal",
            "stock",
          ]) {
            expect(
              contrast(palette[foreground], palette[background]),
              `${foreground} on ${background}`,
            ).toBeGreaterThanOrEqual(4.5);
          }
        }
      });

      it("keeps button labels at 4.5:1 on their fills", () => {
        // The inverted button (hover:bg-ink hover:text-paper) and the primary
        // button both rely on these.
        expect(contrast(palette.paper, palette.ink)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(palette.paper, palette.signal)).toBeGreaterThanOrEqual(
          4.5,
        );
      });

      it("keeps focus rings and control borders at 3:1", () => {
        expect(contrast(palette.ink, palette.paper)).toBeGreaterThanOrEqual(3);
        expect(contrast(palette.drafting, palette.paper)).toBeGreaterThanOrEqual(
          3,
        );
      });
    });
  }

  it("does not use Apple's published hexes, which fail AA", () => {
    // Guard against a well-meaning revert to the brand values. #007AFF is
    // 4.02:1 on white; #34C759 is 2.22:1.
    expect(PALETTES["apple/light"].signal).not.toBe("#007aff");
    expect(PALETTES["apple/light"].stock).not.toBe("#34c759");
    // And #0058b8, the light-scheme link blue, is unusable on black — which is
    // why apple/dark needs a different one rather than reusing it.
    expect(contrast("#0058b8", "#000000")).toBeLessThan(4.5);
  });

  it("inverts ink against paper in both dark schemes", () => {
    // This is the property that lets every hover and inverted state keep
    // working in dark mode with no extra classes. If it ever stops holding, a
    // dark theme would render `text-ink` as near-black on near-black.
    for (const name of ["datasheet/dark", "apple/dark"]) {
      const p = PALETTES[name];
      expect(contrast(p.ink, p.paper)).toBeGreaterThanOrEqual(4.5);
      expect(p.ink).not.toBe(PALETTES[name.replace("/dark", "/light")].ink);
    }
  });
});