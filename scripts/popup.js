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
const reloadBtn = document.getElementById("reload");

chrome.storage.sync.get(["isActive", "targetText", "mode"], (data) => {
  toggleSwitch.checked = !!data.isActive;
  updateBadge(data.isActive);
  textInput.value = data.targetText || "";
  modeSelect.value = data.mode || "blur";
  reloadBtn.style.display = data.isActive ? "block" : "none";
});

toggleSwitch.addEventListener("change", (event) => {
  const isActive = event.target.checked;
  
  chrome.storage.sync.set({
    "isActive": isActive,
    "timestamp": Date.now()
  });
  updateBadge(isActive);
  reloadBtn.style.display = isActive ? "block" : "none";
  
  if (!isActive) {
    textInput.value = '';
    chrome.storage.sync.set({
      "targetText": textInput.value
    })
    apply();
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
/*textInput.addEventListener("input", (event) => {
  const inputValue = event.target.value;
  chrome.storage.sync.set({ "targetText": inputValue });
});

modeSelect.addEventListener("change", (event) => {
  const selectedMode = event.target.value;
  chrome.storage.sync.set({ "mode": selectedMode });
});
*/
/*reloadBtn.addEventListener("click", () => {
  const inputValue = textInput.value;
  const selectedMode = modeSelect.value;

  // Зберігаємо значення тексту та режиму в chrome.storage
  chrome.storage.sync.set({
    "targetText": inputValue,
    "mode": selectedMode,
    "timestamp": Date.now() // Оновлюємо timestamp, щоб зміни застосувалися
  });
  
  apply();
});*/

/*reloadBtn.addEventListener("click", () => {
  apply();
});*/