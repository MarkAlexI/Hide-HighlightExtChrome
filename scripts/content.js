"use strict";

const blurEffect = "blur(8px)";
const highlightEffect = "font-weight: bold; font-size: 1.5em; color: #ff5722; text-shadow: 2px 2px 4px rgba(128, 0, 0, 0.4);";
let targetText = "";
let mode = "blur";

const applyEffect = (element, mode) => {
  if (mode === "blur") {
    element.style.filter = blurEffect;
  } else if (mode === "highlight") {
    element.style.cssText = highlightEffect;
  }
};

const scanNode = (node) => {
  if (node.childNodes.length > 0) {
    Array.from(node.childNodes).forEach(scanNode);
  }
  if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
    const parentElem = node.parentElement;
    if (parentElem && !["SCRIPT"].includes(parentElem.tagName)) {
      if (node.textContent.includes(targetText)) {
        applyEffect(parentElem, mode);
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

let isActive = true;

chrome.storage.sync.get(["isActive", "targetText", "mode"], (data) => {
  isActive = data.isActive !== false;
  targetText = data.targetText || "";
  mode = data.mode || "blur";
  if (isActive && targetText.trim()) {
    observer.observe(document, { childList: true, subtree: true });
    scanNode(document);
  }
});