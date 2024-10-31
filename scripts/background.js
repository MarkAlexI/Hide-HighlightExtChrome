"use strict";

const updateBadge = (isActive = false) => {
  const label = isActive ? "ON" : "OFF";
  const badgeColor = isActive ? "#0000FF" : "A9A9A9";

  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ 'color': badgeColor });
};

const initialize = () => {
  chrome.storage.sync.get("isActive", (data) => {
    updateBadge(!!data.isActive);
  });
};

chrome.runtime.onStartup.addListener(initialize);
chrome.runtime.onInstalled.addListener(updateBadge);

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "updateTextColor") {
    chrome.storage.sync.set({ "textColor": message.value });
  } else if (message.action === "updateShadowColor") {
    chrome.storage.sync.set({ "shadowColor": message.value });
  }
});