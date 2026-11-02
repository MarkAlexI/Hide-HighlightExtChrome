/* Shared configuration and literal text matching. */
(() => {
  "use strict";
  const KEYS = Object.freeze({ prefs: "hhPreferences", sites: "hhSiteRules", draft: "hhDefaultDraft", migration: "hhMigration", tabs: "hhTabRules", drafts: "hhTabDrafts" });
  const DEFAULT_COLORS = Object.freeze({ background: "#ffe08a", text: "#172033", shadow: "#d46200", useShadow: false });
  const PRESETS = Object.freeze([
    { name: "amber", background: "#ffe08a", text: "#172033" },
    { name: "mint", background: "#a7f3d0", text: "#102e27" },
    { name: "sky", background: "#bae6fd", text: "#102a43" },
    { name: "rose", background: "#fecdd3", text: "#4c1727" },
    { name: "lavender", background: "#ddd6fe", text: "#2e1b54" },
  ]);
  const MAX_TEXT = 4000;
  const MAX_TERMS = 100;
  function normalizeRule(input = {}) {
    return {
      enabled: input.enabled !== false,
      blurText: typeof input.blurText === "string" ? input.blurText.slice(0, MAX_TEXT) : "",
      highlightText: typeof input.highlightText === "string" ? input.highlightText.slice(0, MAX_TEXT) : "",
      wholeWords: input.wholeWords === true,
      caseSensitive: input.caseSensitive === true,
      scope: input.scope === "site" ? "site" : "tab",
      revision: Number.isSafeInteger(input.revision) ? input.revision : 0,
    };
  }
  function normalizeColors(input = {}) {
    const hex = (value, fallback) => typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value) ? value.toLowerCase() : fallback;
    return { background: hex(input.background, DEFAULT_COLORS.background), text: hex(input.text, DEFAULT_COLORS.text), shadow: hex(input.shadow, DEFAULT_COLORS.shadow), useShadow: input.useShadow === true };
  }
  function terms(text, caseSensitive = false, limit = MAX_TERMS) {
    const seen = new Set();
    return String(text || "").split(/[;\r\n]+/u).map(value => value.trim()).filter(value => {
      const key = caseSensitive ? value : value.toLocaleLowerCase();
      if (!value || seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, limit);
  }
  const wordCharacter = /[\p{L}\p{M}\p{N}_]/u;
  function before(text, index) {
    const last = text.charCodeAt(index - 1);
    return text.slice(last >= 0xdc00 && last <= 0xdfff ? index - 2 : index - 1, index);
  }
  function compile(rule) {
    const make = (text, effect) => {
      const list = terms(text, rule.caseSensitive).sort((a, b) => b.length - a.length);
      if (!list.length) return null;
      const pattern = list.map(value => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
      return { regex: new RegExp(pattern, rule.caseSensitive ? "gu" : "giu"), effect };
    };
    return [make(rule.blurText, "blur"), make(rule.highlightText, "highlight")].filter(Boolean);
  }
  function findMatches(text, matchers, wholeWords, limit = 5000) {
    const found = [];
    for (const { regex, effect } of matchers) {
      regex.lastIndex = 0;
      let match;
      while ((match = regex.exec(text)) && found.length < limit) {
        const start = match.index;
        const end = start + match[0].length;
        if (wholeWords && ((start && wordCharacter.test(before(text, start))) || (end < text.length && wordCharacter.test(String.fromCodePoint(text.codePointAt(end)))))) continue;
        found.push({ start, end, effect });
      }
    }
    const accepted = [];
    found.sort((a, b) => (a.effect === b.effect ? a.start - b.start || b.end - a.end : a.effect === "blur" ? -1 : 1));
    for (const match of found) {
      let low = 0, high = accepted.length;
      while (low < high) { const middle = (low + high) >>> 1; if (accepted[middle].start < match.start) low = middle + 1; else high = middle; }
      if ((low && accepted[low - 1].end > match.start) || (low < accepted.length && accepted[low].start < match.end)) continue;
      accepted.splice(low, 0, match);
    }
    return accepted.sort((a, b) => a.start - b.start);
  }
  function originOf(url) {
    try { const parsed = new URL(url); return /^https?:$/u.test(parsed.protocol) ? parsed.origin : null; } catch { return null; }
  }
  globalThis.HH = Object.freeze({ KEYS, DEFAULT_COLORS, PRESETS, MAX_TEXT, MAX_TERMS, normalizeRule, normalizeColors, terms, compile, findMatches, originOf });
})();
