(() => {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  const $ = id => document.getElementById(id);
  const rawTab = new URLSearchParams(location.search).get("tab");
  const returnTab = rawTab === null ? null : Number(rawTab);
  function values() { return HH.normalizeColors({ background: $("background-color").value, text: $("text-color").value, shadow: $("shadow-color").value, useShadow: $("use-shadow").checked }); }
  function preview() {
    const colors = values();
    $("color-preview").style.backgroundColor = colors.background;
    $("color-preview").style.color = colors.text;
    $("color-preview").style.textShadow = colors.useShadow ? `0 1px 3px ${colors.shadow}` : "none";
    $("shadow-color").disabled = !colors.useShadow;
  }
  function fill(colors) {
    $("background-color").value = colors.background;
    $("text-color").value = colors.text;
    $("shadow-color").value = colors.shadow;
    $("use-shadow").checked = colors.useShadow;
    preview();
  }
  for (const input of document.querySelectorAll("input")) input.addEventListener("input", preview);
  $("restore-colors").addEventListener("click", () => { fill(HH.DEFAULT_COLORS); $("status").textContent = ""; });
  $("colors-form").addEventListener("submit", async event => {
    event.preventDefault();
    try { const response = await api.runtime.sendMessage({ type: "hh:colors", colors: values() }); if (!response?.ok) throw new Error(); $("status").textContent = hhMessage("saved"); }
    catch { $("status").textContent = hhMessage("error"); }
  });
  $("return-tab").hidden = !Number.isInteger(returnTab);
  $("return-tab").addEventListener("click", async () => {
    try { await api.tabs.update(returnTab, { active: true }); const current = await api.tabs.getCurrent(); if (current?.id !== returnTab) await api.tabs.remove(current.id); }
    catch { $("status").textContent = hhMessage("error"); }
  });
  api.runtime.sendMessage({ type: "hh:preferences" }).then(response => { if (!response?.ok) throw new Error(); fill(response.colors); }).catch(() => { $("status").textContent = hhMessage("error"); });
})();
