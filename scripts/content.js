(() => {
  "use strict";
  const api = globalThis.browser || globalThis.chrome;
  if (globalThis.__hideHighlightLoaded) return;
  globalThis.__hideHighlightLoaded = true;
  const records = new Map();
  const owned = new WeakSet();
  const excluded = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "IFRAME", "TEXTAREA", "INPUT", "SELECT", "OPTION", "TEMPLATE"]);
  let config = { enabled: false, token: "", colors: HH.normalizeColors() };
  let matchers = [];
  let generation = 0;
  let timer = null;
  let stopped = false;
  let limited = false;
  let queue = new Set();
  const LIMIT = 5000;
  const blocks = new Set(["BODY", "DIV", "P", "LI", "TD", "TH", "H1", "H2", "H3", "H4", "H5", "H6", "ARTICLE", "SECTION", "MAIN", "ASIDE", "HEADER", "FOOTER", "BLOCKQUOTE", "PRE", "CAPTION", "DT", "DD"]);
  function blockFor(node) {
    let root = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
    while (root?.parentElement && (!blocks.has(root.tagName) || owned.has(root))) root = root.parentElement;
    return root;
  }
  function mutationRoot(node) { return blockFor(node); }
  const observer = new MutationObserver(mutations => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData" || mutation.removedNodes.length) queue.add(mutationRoot(mutation.target));
      else for (const node of mutation.addedNodes) queue.add(mutationRoot(node));
    }
    schedule();
  });
  function observe() {
    if (!stopped && config.enabled && matchers.length) observer.observe(document, { subtree: true, childList: true, characterData: true });
  }
  function status() {
    const counts = { blur: 0, highlight: 0 };
    for (const record of records.values()) {
      if (record.original.isConnected) for (const match of record.matches) counts[match.effect] += match.count ?? 1;
    }
    return { counts, limited, token: config.token, enabled: config.enabled };
  }
  function report() {
    if (stopped) return;
    api.runtime.sendMessage({ type: "hh:status", ...status(), url: location.href }).catch(() => {});
  }
  function restore(record) {
    const { original, parent, generated, prefix } = record;
    if (original.parentNode === parent && generated.every(node => node.parentNode === parent)) {
      const value = original.data !== prefix ? original.data : original.data + generated.map(node => node.textContent).join("");
      for (const node of generated) node.remove();
      original.data = value;
    } else {
      for (const node of generated) if (node.nodeType === Node.ELEMENT_NODE && owned.has(node) && node.parentNode) node.replaceWith(...node.childNodes);
    }
    records.delete(original);
  }
  function restoreWithin(root = null) {
    for (const record of [...records.values()]) {
      if (!root || !record.original.isConnected || root === record.original || root.contains?.(record.original) || record.generated.some(node => root === node || root.contains?.(node))) restore(record);
    }
  }
  function eligible(node) {
    if (!node.data.length || records.has(node)) return false;
    let parent = node.parentElement;
    if (!parent || parent.namespaceURI !== "http://www.w3.org/1999/xhtml" || parent.isContentEditable || parent.closest('[role="textbox"]')) return false;
    while (parent) {
      if (excluded.has(parent.tagName) || owned.has(parent)) return false;
      parent = parent.parentElement;
    }
    return true;
  }
  function collect(root) {
    if (!root?.isConnected) return [];
    if (root.nodeType === Node.TEXT_NODE) return eligible(root) ? [root] : [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: node => eligible(node) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT });
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) nodes.push(node);
    return nodes;
  }
  function separated(previous, next) {
    let cursor = previous;
    while (cursor) {
      if (cursor.firstChild) cursor = cursor.firstChild;
      else {
        while (cursor && !cursor.nextSibling) cursor = cursor.parentNode;
        cursor = cursor?.nextSibling;
      }
      if (!cursor || cursor === next) return false;
      if (cursor.nodeType === Node.ELEMENT_NODE && (cursor.tagName === "BR" || excluded.has(cursor.tagName) || cursor.isContentEditable)) return true;
    }
    return false;
  }
  function jobsFor(nodes) {
    const jobs = [];
    for (const node of nodes) {
      const block = blockFor(node);
      let job = jobs[jobs.length - 1];
      if (!job || job.block !== block) { job = { block, text: "", parts: [] }; jobs.push(job); }
      if (job.parts.length && separated(job.parts[job.parts.length - 1].node, node)) job.text += "\n";
      job.parts.push({ node, start: job.text.length, value: node.data });
      job.text += node.data;
    }
    return jobs;
  }
  function paint(node, matches) {
    if (!matches.length || !node.parentNode) return;
    const value = node.data;
    const parent = node.parentNode;
    const fragment = document.createDocumentFragment();
    const prefix = value.slice(0, matches[0].start);
    const generated = [];
    let cursor = matches[0].start;
    for (const match of matches) {
      if (match.start > cursor) generated.push(document.createTextNode(value.slice(cursor, match.start)));
      const span = document.createElement("span");
      span.dataset.hideHighlight = match.effect;
      owned.add(span);
      span.style.setProperty("all", "unset", "important");
      span.textContent = value.slice(match.start, match.end);
      if (match.effect === "blur") {
        span.style.setProperty("display", "inline-block", "important");
        span.style.setProperty("filter", "blur(8px)", "important");
        span.style.setProperty("max-width", "100%", "important");
      } else {
        span.style.setProperty("background-color", config.colors.background, "important");
        span.style.setProperty("color", config.colors.text, "important");
        span.style.setProperty("border-radius", "2px", "important");
        span.style.setProperty("box-decoration-break", "clone", "important");
        if (config.colors.useShadow) span.style.setProperty("text-shadow", `0 1px 3px ${config.colors.shadow}`, "important");
      }
      generated.push(span);
      cursor = match.end;
    }
    if (cursor < value.length) generated.push(document.createTextNode(value.slice(cursor)));
    for (const item of generated) fragment.append(item);
    node.data = prefix;
    parent.insertBefore(fragment, node.nextSibling);
    records.set(node, { original: node, parent, generated, prefix, matches });
  }
  function schedule() {
    if (timer || !config.enabled || !matchers.length || stopped) return;
    timer = setTimeout(() => { timer = null; processQueue(); }, 90);
  }
  function processQueue() {
    const currentGeneration = generation;
    limited = false;
    const roots = [...queue].filter(Boolean);
    queue.clear();
    const unique = roots.filter((root, i) => !roots.some((other, j) => i !== j && other !== root && other.contains?.(root)));
    observer.disconnect();
    for (const root of unique) restoreWithin(root);
    const jobs = jobsFor([...new Set(unique.flatMap(collect))]);
    observe();
    let index = 0;
    let total = Object.values(status().counts).reduce((a, b) => a + b, 0);
    const step = () => {
      if (generation !== currentGeneration || stopped || !config.enabled) return;
      observer.disconnect();
      const start = performance.now();
      while (index < jobs.length && performance.now() - start < 8) {
        const job = jobs[index++];
        if (job.parts.some(part => !part.node.isConnected || !eligible(part.node) || part.node.data !== part.value)) continue;
        let matches = HH.findMatches(job.text, matchers, config.wholeWords, LIMIT + 1);
        if (total + matches.length > LIMIT) { limited = true; matches = matches.slice(0, LIMIT - total); }
        for (const part of job.parts) {
          const end = part.start + part.value.length;
          const fragments = matches.filter(match => match.start < end && match.end > part.start).map(match => ({ start: Math.max(0, match.start - part.start), end: Math.min(part.value.length, match.end - part.start), effect: match.effect, count: match.start >= part.start ? 1 : 0 }));
          paint(part.node, fragments);
        }
        total += matches.length;
        if (limited) break;
      }
      observe();
      if (!limited && index < jobs.length) setTimeout(step, 0);
      else { report(); if (queue.size) schedule(); }
    };
    step();
  }
  function apply(next) {
    if (next.token === config.token) return;
    generation++;
    clearTimeout(timer); timer = null;
    observer.disconnect();
    restoreWithin();
    queue.clear(); limited = false;
    config = { ...HH.normalizeRule(next), hasRule: next.hasRule, token: next.token, colors: HH.normalizeColors(next.colors) };
    matchers = HH.compile(config);
    if (config.enabled && matchers.length) { queue.add(document.body || document.documentElement); processQueue(); }
    else report();
  }
  api.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "hh:page") { sendResponse({ url: location.href }); return false; }
    if (message?.type === "hh:counts") { sendResponse(status()); return false; }
    if (message?.type === "hh:apply") { apply(message.config); sendResponse({ ok: true }); return false; }
    return false;
  });
  api.runtime.sendMessage({ type: "hh:config", url: location.href }).then(response => {
    if (response?.ok) apply(response.config);
  }).catch(() => { stopped = true; observer.disconnect(); });
})();
