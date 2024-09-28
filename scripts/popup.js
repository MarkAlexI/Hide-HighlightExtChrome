'use strict';

const updateBadge = (isActive = false) => {
  const label = isActive ? "ON" : "OFF";
  const badgeColor = isActive ? "#0000FF" : "#A9A9A9";

  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ 'color': badgeColor });
};

const toggleSwitch = document.getElementById("toggle-visibility");

chrome.storage.sync.get(["isActive"], (data) => {
  toggleSwitch.checked = !!data.isActive;
  updateBadge(data.isActive);
});

toggleSwitch.addEventListener("change", (event) => {
  const isActive = event.target.checked;
  chrome.storage.sync.set({ "isActive": isActive });
  updateBadge(isActive);
});