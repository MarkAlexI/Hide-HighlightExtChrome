"use strict";

const blurEffect = "blur(8px)";
const highlightEffect = "font-weight: bold; font-size: 1.5em; color: #ff5722; text-shadow: 2px 2px 4px rgba(128, 0, 0, 0.4);";
let targetText = "";
let mode = "blur";
let isActive = false;

const applyEffect = (element, mode) => {
  if (mode === "blur") {
    element.style.filter = blurEffect;
  } else if (mode === "highlight") {
    element.style.cssText = highlightEffect;
  }
};

const removeEffect = (element) => {
  element.style.filter = "";
  element.style.fontWeight = "";
  element.style.fontSize = "";
  element.style.color = "";
  element.style.textShadow = "";
};

const scanNode = (node) => {
  if (node.childNodes.length > 0) {
    Array.from(node.childNodes).forEach(scanNode);
  }
  if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
    const parentElem = node.parentElement;
    if (parentElem && !["SCRIPT"].includes(parentElem.tagName)) {
      if (node.textContent.toLowerCase().includes(targetText.toLowerCase())) {
        if (isActive) {
          applyEffect(parentElem, mode);
        } else {
          removeEffect(parentElem);
        }
      }
    }
  }
};

const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    if (mutation.addedNodes.length > 0) {
      mutation.addedNodes.forEach(scanNode);
    } else {
      scanNode(mutation.target);
    }
  });
});

const updateObserver = () => {
  observer.disconnect();

  if (isActive && targetText.trim()) {
    observer.observe(document, { childList: true, subtree: true });
    scanNode(document);
  } else if (!isActive) {
    scanNode(document);
  }
};

chrome.storage.sync.get(["isActive", "targetText", "mode"], (data) => {
  isActive = data.isActive !== false;
  targetText = data.targetText || "";
  mode = data.mode || "blur";

  if (isActive) updateObserver();
});

chrome.storage.onChanged.addListener((changes) => {
  if (changes.isActive) {
    isActive = changes.isActive.newValue !== false;
  }
  if (changes.targetText) {
    targetText = changes.targetText.newValue || "";
  }
  if (changes.mode) {
    mode = changes.mode.newValue || "blur";
  }
  if (changes.timestamp) {
    updateObserver();
  }
});