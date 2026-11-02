(() => {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  const $ = id => document.getElementById(id);
  let tabId = null;
  let config = null;
  let colors = HH.normalizeColors();
  let busy = false;
  let draftWrite = Promise.resolve();
  const request = async message => {
    const response = await api.runtime.sendMessage(message);
    if (!response?.ok) throw new Error("operation_failed");
    return response;
  };
  function rule() {
    return HH.normalizeRule({ enabled: true, blurText: $("blur-words").value, highlightText: $("highlight-words").value, wholeWords: $("whole-words").checked, caseSensitive: $("match-case").checked, scope: $("remember-site").checked ? "site" : "tab" });
  }
  function saveDraft() {
    if (!Number.isInteger(tabId)) return Promise.resolve();
    const current = rule();
    draftWrite = draftWrite.catch(() => {}).then(() => request({ type: "hh:draft", tabId, rule: current }));
    return draftWrite;
  }
  function setStatus(key, args) { $("status").textContent = hhMessage(key, args); }
  function renderStatus(status) {
    if (!config?.hasRule) { setStatus("statusReady"); return; }
    if (!status?.enabled && status?.enabled !== undefined || !config.enabled) { setStatus("statusPaused"); return; }
    const counts = status?.counts || { blur: 0, highlight: 0 };
    if (status?.limited) setStatus("limitReached");
    else if (!counts.blur && !counts.highlight) setStatus("noMatches");
    else setStatus("matchCounts", [String(counts.blur), String(counts.highlight)]);
  }
  function renderConfig(next) {
    config = next;
    $("pause").disabled = !next?.hasRule;
    $("pause").textContent = hhMessage(next?.enabled ? "pause" : "resume");
    $("pause").setAttribute("aria-pressed", String(Boolean(next?.hasRule && !next.enabled)));
    $("reset").disabled = !next?.hasRule;
  }
  function renderColors() {
    const group = $("presets");
    for (const preset of HH.PRESETS) {
      const existing = group.querySelector(`[data-preset="${preset.name}"]`);
      if (existing) { existing.setAttribute("aria-pressed", String(colors.background === preset.background && colors.text === preset.text)); continue; }
      const button = document.createElement("button");
      button.type = "button"; button.className = "swatch"; button.dataset.preset = preset.name;
      button.style.backgroundColor = preset.background;
      button.setAttribute("aria-label", hhMessage(preset.name));
      button.title = hhMessage(preset.name);
      button.setAttribute("aria-pressed", String(colors.background === preset.background && colors.text === preset.text));
      button.addEventListener("click", async () => {
        try {
          const response = await request({ type: "hh:colors", colors: { ...colors, ...preset } });
          colors = response.colors; renderColors();
        } catch { setStatus("error"); }
      });
      group.append(button);
    }
    $("color-preview").style.backgroundColor = colors.background;
    $("color-preview").style.color = colors.text;
    $("color-preview").style.textShadow = colors.useShadow ? `0 1px 3px ${colors.shadow}` : "none";
  }
  async function apply(close = false) {
    if (busy || !Number.isInteger(tabId)) return;
    const currentRule = rule();
    if ([currentRule.blurText, currentRule.highlightText].some(text => HH.terms(text, currentRule.caseSensitive, 101).length > HH.MAX_TERMS)) { setStatus("termLimit"); return; }
    busy = true; $("apply").disabled = true; $("apply-close").disabled = true;
    try {
      await saveDraft();
      const response = await request({ type: "hh:apply-rule", tabId, rule: rule() });
      renderConfig(response.config);
      const view = await request({ type: "hh:open", tabId });
      renderStatus(view.status);
      if (close) window.close();
    } catch { setStatus("error"); }
    finally { busy = false; $("apply").disabled = false; $("apply-close").disabled = false; }
  }
  $("rule-form").addEventListener("submit", event => { event.preventDefault(); apply(); });
  $("apply-close").addEventListener("click", () => apply(true));
  for (const id of ["blur-words", "highlight-words", "whole-words", "match-case", "remember-site"]) $(id).addEventListener("input", () => { saveDraft().catch(() => setStatus("error")); });
  $("pause").addEventListener("click", async () => {
    try { const result = await request({ type: "hh:pause", tabId }); renderConfig(result.config); const view = await request({ type: "hh:open", tabId }); renderStatus(view.status); } catch { setStatus("error"); }
  });
  $("reset").addEventListener("click", async () => {
    try { const result = await request({ type: "hh:reset", tabId }); renderConfig(result.config); setStatus("removed"); } catch { setStatus("error"); }
  });
  $("custom-colors").addEventListener("click", async () => {
    try { await saveDraft(); await api.tabs.create({ url: api.runtime.getURL(`options/color-options.html?tab=${tabId}`) }); window.close(); } catch { setStatus("error"); }
  });
  api.runtime.onMessage.addListener(message => {
    if (message?.type === "hh:view-status" && message.tabId === tabId) renderStatus(message.status);
    return false;
  });
  api.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes[HH.KEYS.prefs]) { colors = HH.normalizeColors(changes[HH.KEYS.prefs].newValue?.colors); renderColors(); }
  });
  function viewport() {
    const height = window.visualViewport?.height || window.innerHeight;
    document.documentElement.style.setProperty("--available-height", `${Math.max(160, Math.floor(height))}px`);
    document.body.classList.toggle("editing", document.activeElement?.tagName === "TEXTAREA");
  }
  window.visualViewport?.addEventListener("resize", viewport);
  document.addEventListener("focusin", viewport);
  document.addEventListener("focusout", () => setTimeout(viewport, 0));
  viewport();
  async function load() {
    try {
      const [tab] = await api.tabs.query({ active: true, currentWindow: true });
      if (!Number.isInteger(tab?.id)) throw new Error("no_tab");
      tabId = tab.id;
      const view = await request({ type: "hh:open", tabId });
      const draft = view.draft;
      $("blur-words").value = draft.blurText;
      $("highlight-words").value = draft.highlightText;
      $("whole-words").checked = draft.wholeWords;
      $("match-case").checked = draft.caseSensitive;
      $("remember-site").checked = draft.scope === "site";
      colors = view.colors; renderColors(); renderConfig(view.config); renderStatus(view.status);
      $("unavailable").hidden = view.available;
      $("rule-fields").disabled = !view.available;
      $("apply").disabled = !view.available;
      $("apply-close").disabled = !view.available;
      if (!view.available) { $("pause").disabled = true; $("reset").disabled = true; }
    } catch { $("unavailable").hidden = false; setStatus("error"); }
  }
  load();
})();
