'use strict';

const updateBadge = (isActive = false) => {
  const label = isActive ? "ON" : "OFF";
  const badgeColor = isActive ? "#0000FF" : "#A9A9A9";

  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ 'color': badgeColor });
};

const toggleSwitch = document.getElementById("toggle-visibility");
const textInput = document.getElementById("blur-text");
const modeSelect = document.getElementById("mode-select");

chrome.storage.sync.get(["isActive", "targetText", "mode"], (data) => {
  toggleSwitch.checked = !!data.isActive;
  updateBadge(data.isActive);
  textInput.value = data.targetText || "";
  modeSelect.value = data.mode || "blur";
});

toggleSwitch.addEventListener("change", (event) => {
  const isActive = event.target.checked;
  chrome.storage.sync.set({ "isActive": isActive });
  updateBadge(isActive);
});

textInput.addEventListener("input", (event) => {
  const inputValue = event.target.value;
  chrome.storage.sync.set({ "targetText": inputValue });
});

modeSelect.addEventListener("change", (event) => {
  const selectedMode = event.target.value;
  chrome.storage.sync.set({ "mode": selectedMode });
});