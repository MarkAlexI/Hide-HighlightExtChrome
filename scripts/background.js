"use strict";
if (!globalThis.HH && typeof importScripts === "function") importScripts("shared.js");
const api = globalThis.browser || globalThis.chrome;
const { KEYS, normalizeRule, normalizeColors, originOf } = HH;
let serial = Promise.resolve();
let revision = Date.now();
const nextRevision = () => revision = Math.max(Date.now(), revision + 1);
async function initialize() {
  const stored = await api.storage.local.get(Object.values(KEYS));
  if (!stored[KEYS.migration]) {
    const legacy = await api.storage.sync.get(["targetText", "mode", "isActive", "textColor", "shadowColor"]);
    const draft = normalizeRule({ enabled: legacy.isActive !== false, [legacy.mode === "highlight" ? "highlightText" : "blurText"]: legacy.targetText || "" });
    const colors = normalizeColors({ text: legacy.textColor, shadow: legacy.shadowColor, useShadow: Boolean(legacy.shadowColor && legacy.mode === "highlight") });
    await api.storage.local.set({ [KEYS.prefs]: { colors, revision: nextRevision() }, [KEYS.sites]: {}, [KEYS.draft]: draft, [KEYS.migration]: { version: 2, migratedAt: Date.now(), legacyBackup: legacy } });
    await api.storage.sync.remove(["targetText", "mode", "isActive", "textColor", "shadowColor", "timestamp"]).catch(() => {});
  }
}
const ready = initialize();
ready.catch(() => {});
async function readState() {
  const [local, session] = await Promise.all([
    api.storage.local.get([KEYS.prefs, KEYS.sites, KEYS.draft]),
    api.storage.session.get([KEYS.tabs, KEYS.drafts]),
  ]);
  return { prefs: local[KEYS.prefs] || { colors: normalizeColors(), revision: 0 }, sites: local[KEYS.sites] || {}, defaultDraft: normalizeRule(local[KEYS.draft]), tabs: session[KEYS.tabs] || {}, drafts: session[KEYS.drafts] || {} };
}
function configFor(state, tabId, origin) {
  const savedTab = state.tabs[tabId];
  const tab = savedTab?.origin === origin ? savedTab : null;
  const site = origin && state.sites[origin];
  const rule = tab || site || { ...normalizeRule(), enabled: false };
  return { ...normalizeRule(rule), colors: normalizeColors(state.prefs.colors), token: `${rule.revision || 0}:${state.prefs.revision || 0}`, hasRule: Boolean((tab || site) && (HH.terms(rule.blurText).length || HH.terms(rule.highlightText).length)) };
}
async function pageInfo(tabId) {
  try {
    const info = await api.tabs.sendMessage(tabId, { type: "hh:page" }, { frameId: 0 });
    const origin = originOf(info.url);
    return { available: Boolean(origin), origin };
  } catch { return { available: false, origin: null }; }
}
async function tellTab(tabId, config) {
  try { return await api.tabs.sendMessage(tabId, { type: "hh:apply", config }, { frameId: 0 }); } catch { return null; }
}
async function refreshTabs(origin = null) {
  const state = await readState();
  const tabs = await api.tabs.query({});
  await Promise.all(tabs.map(async tab => {
    const info = await pageInfo(tab.id);
    if (info.available && (!origin || info.origin === origin)) await tellTab(tab.id, configFor(state, tab.id, info.origin));
  }));
}
async function badge(tabId, config, status = {}) {
  const count = (status.blur || 0) + (status.highlight || 0);
  const text = config.enabled && config.hasRule ? count > 999 ? "999+" : String(count) : config.hasRule ? "OFF" : "";
  try {
    await Promise.all([api.action.setBadgeText({ tabId, text }), api.action.setBadgeBackgroundColor({ tabId, color: config.enabled ? "#176b5b" : "#64748b" })]);
  } catch { /* Some mobile browsers do not expose badges. */ }
}
async function handle(message, sender) {
  if (!message || typeof message.type !== "string" || !message.type.startsWith("hh:")) return undefined;
  const state = await readState();
  if (message.type === "hh:config") {
    if (!sender.tab || sender.frameId !== 0) return { ok: false };
    const origin = originOf(sender.url || message.url);
    const config = configFor(state, sender.tab.id, origin);
    await badge(sender.tab.id, config);
    return { ok: true, config };
  }
  if (message.type === "hh:status") {
    if (!sender.tab || sender.frameId !== 0) return { ok: false };
    const config = configFor(state, sender.tab.id, originOf(sender.url || message.url));
    if (config.token !== message.token) return { ok: false };
    await badge(sender.tab.id, config, message.counts);
    api.runtime.sendMessage({ type: "hh:view-status", tabId: sender.tab.id, status: { counts: message.counts, limited: message.limited, enabled: config.enabled } }).catch(() => {});
    return { ok: true };
  }
  if (!sender.url?.startsWith(api.runtime.getURL(""))) return { ok: false };
  if (message.type === "hh:preferences") return { ok: true, colors: normalizeColors(state.prefs.colors) };
  if (message.type === "hh:colors") {
    const colors = normalizeColors(message.colors);
    await api.storage.local.set({ [KEYS.prefs]: { colors, revision: nextRevision() } });
    await refreshTabs();
    return { ok: true, colors };
  }
  const tabId = message.tabId;
  if (!Number.isInteger(tabId) || tabId < 0) return { ok: false };
  if (message.type === "hh:draft") {
    state.drafts[tabId] = normalizeRule(message.rule);
    await api.storage.session.set({ [KEYS.drafts]: state.drafts });
    return { ok: true };
  }
  const info = await pageInfo(tabId);
  if (message.type === "hh:open") {
    const config = configFor(state, tabId, info.origin);
    const draft = state.drafts[tabId] || (config.hasRule ? config : state.defaultDraft);
    let status = null;
    if (info.available) {
      try { status = await api.tabs.sendMessage(tabId, { type: "hh:counts" }, { frameId: 0 }); } catch { /* Navigation. */ }
    }
    return { ok: true, ...info, config, draft: normalizeRule(draft), colors: normalizeColors(state.prefs.colors), status };
  }
  if (!info.available || !info.origin) return { ok: false, unavailable: true };
  if (message.type === "hh:apply-rule") {
    const rule = { ...normalizeRule(message.rule), revision: nextRevision() };
    if (rule.scope === "site") {
      state.sites[info.origin] = rule;
      delete state.tabs[tabId];
    } else {
      state.tabs[tabId] = { ...rule, origin: info.origin };
      if (state.sites[info.origin]) delete state.sites[info.origin];
    }
    state.drafts[tabId] = rule;
    await api.storage.local.set({ [KEYS.sites]: state.sites, [KEYS.draft]: rule });
    await api.storage.session.set({ [KEYS.tabs]: state.tabs, [KEYS.drafts]: state.drafts });
    await refreshTabs(info.origin);
    return { ok: true, config: configFor(state, tabId, info.origin) };
  }
  if (message.type === "hh:pause") {
    const config = configFor(state, tabId, info.origin);
    if (!config.hasRule) return { ok: true, config };
    state.tabs[tabId] = { ...normalizeRule(config), origin: info.origin, enabled: !config.enabled, revision: nextRevision() };
    await api.storage.session.set({ [KEYS.tabs]: state.tabs });
    const next = configFor(state, tabId, info.origin);
    await tellTab(tabId, next);
    return { ok: true, config: next };
  }
  if (message.type === "hh:reset") {
    state.tabs[tabId] = { ...normalizeRule(), origin: info.origin, enabled: false, revision: nextRevision() };
    await api.storage.session.set({ [KEYS.tabs]: state.tabs });
    await tellTab(tabId, configFor(state, tabId, info.origin));
    return { ok: true, config: configFor(state, tabId, info.origin) };
  }
  return { ok: false };
}
api.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message?.type?.startsWith("hh:")) return false;
  const task = serial.then(() => ready).then(() => handle(message, sender));
  serial = task.catch(() => {});
  task.then(sendResponse, () => sendResponse({ ok: false, error: "operation_failed" }));
  return true;
});
api.tabs.onRemoved.addListener(tabId => {
  serial = serial.then(async () => {
    await ready;
    const state = await readState();
    delete state.tabs[tabId]; delete state.drafts[tabId];
    await api.storage.session.set({ [KEYS.tabs]: state.tabs, [KEYS.drafts]: state.drafts });
  }).catch(() => {});
});
api.runtime.onInstalled.addListener(() => { ready.then(() => refreshTabs()).catch(() => {}); });
