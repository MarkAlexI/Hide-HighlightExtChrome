"use strict";

const updateBadge = (isActive = false) => {
  const label = isActive ? "ON" : "OFF";
  const badgeColor = isActive ? "#0000FF" : "#A9A9A9";

  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ 'color': badgeColor });
};

const apply = () => {
  chrome.storage.sync.remove(["timestamp"], () => {
    chrome.storage.sync.set({
      "timestamp": Date.now()
    });
  });
};

const toggleSwitch = document.getElementById("toggle-visibility");
const textInput = document.getElementById("blur-text");
const modeSelect = document.getElementById("mode-select");
const selectColor = document.getElementById("select-color");
const textColor = document.getElementById("text-color");
const shadowColor = document.getElementById("shadow-color");
const reloadBtn = document.getElementById("reload");

chrome.storage.sync.get(["isActive", "targetText", "mode", "textColor", "shadowColor"], (data) => {
  toggleSwitch.checked = !!data.isActive;
  updateBadge(data.isActive);
  textInput.value = data.targetText || "";
  modeSelect.value = data.mode || "blur";
  textColor.style.backgroundColor = data.textColor || "#ff5722";
  shadowColor.style.backgroundColor = data.shadowColor || "#ff0000";
  reloadBtn.style.display = data.isActive ? "block" : "none";

  if (modeSelect.value === "highlight") {
    setTimeout(function() {
      selectColor.classList.remove("hidden");
    }, 0);
  }
});

toggleSwitch.addEventListener("change", (event) => {
  const isActive = event.target.checked;

  chrome.storage.sync.set({
    "isActive": isActive,
    "timestamp": Date.now()
  });
  updateBadge(isActive);
  setTimeout(function() {
    reloadBtn.style.display = isActive ? "block" : "none";
  }, 0);

  if (!isActive) {
    textInput.value = '';
    chrome.storage.sync.set({
      "targetText": textInput.value
    });
    apply();
  }
});

textColor.addEventListener("click", () => {
  chrome.runtime.openOptionsPage ?
    chrome.runtime.openOptionsPage() :
    chrome.tabs.create({ url: chrome.runtime.getURL("options/color-options.html") });
});

shadowColor.addEventListener("click", () => {
  chrome.runtime.openOptionsPage ?
    chrome.runtime.openOptionsPage() :
    chrome.tabs.create({ url: chrome.runtime.getURL("options/color-options.html") });
});

modeSelect.addEventListener("change", () => {
  if (modeSelect.value === "highlight") {
    setTimeout(function() {
      selectColor.classList.remove("hidden");
    }, 0);
  } else {
    selectColor.classList.add("hidden");
  }
});

reloadBtn.addEventListener("click", () => {
  const inputValue = textInput.value;
  const selectedMode = modeSelect.value;

  chrome.storage.sync.set({
    "targetText": inputValue,
    "mode": selectedMode
  }, () => {
    apply();
  });
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.textColor) {
    textColor.style.backgroundColor = changes.textColor.newValue;
  }
  if (changes.shadowColor) {
    shadowColor.style.backgroundColor = changes.shadowColor.newValue;
  }
});