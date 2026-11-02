(() => {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  const language = api.i18n.getUILanguage().replaceAll("_", "-");
  document.documentElement.lang = language;
  document.documentElement.dir = /^(ar|he|fa|ur)(-|$)/i.test(language) ? "rtl" : "ltr";
  for (const node of document.querySelectorAll("[data-i18n]")) node.textContent = api.i18n.getMessage(node.dataset.i18n);
  for (const node of document.querySelectorAll("[data-i18n-aria]")) node.setAttribute("aria-label", api.i18n.getMessage(node.dataset.i18nAria));
  globalThis.hhMessage = (key, substitutions) => api.i18n.getMessage(key, substitutions);
})();
