const textColorInput = document.getElementById("text-color");
const shadowColorInput = document.getElementById("shadow-color");
const saveBtn = document.getElementById("save-btn");

chrome.storage.sync.get(["textColor", "shadowColor"], (data) => {
  textColorInput.value = data.textColor || "#ff5722";
  shadowColorInput.value = data.shadowColor || "#ff0000";
});

saveBtn.addEventListener("click", () => {
  chrome.storage.sync.set({
  "textColor": textColorInput.value,
  "shadowColor": shadowColorInput.value
  }, () => {
    window.close();
  });
});