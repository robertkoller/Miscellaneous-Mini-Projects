let rules = [];
let enabled = true;
let observer = null;

const originalValues = new Map();

const SKIP_TAGS = new Set([
  "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT",
  "SELECT", "CODE", "PRE", "KBD", "VAR", "SAMP"
]);

// Returns the replacement word with the same casing pattern as the original.
function preserveCase(original, replacement) {
  if (original === original.toUpperCase()) return replacement.toUpperCase();
  if (original[0] === original[0].toUpperCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement.toLowerCase();
}

// Applies a single swap rule to a string and returns the result.
function applyRule(text, rule) {
  const flags = rule.caseSensitive ? "g" : "gi";
  const escaped = rule.from.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}\\b`, flags);
  return text.replace(regex, (match) => preserveCase(match, rule.to));
}

// Runs every active rule against the given text and returns the fully swapped result.
function applyAllRules(text) {
  for (const rule of rules) {
    if (rule.mode === "parts") {
      for (const part of (rule.parts || [])) {
        if (part.from && part.to) {
          text = applyRule(text, { from: part.from, to: part.to, caseSensitive: false });
        }
      }
    } else {
      if (rule.from && rule.to) {
        text = applyRule(text, rule);
      }
    }
  }
  return text;
}


// Returns true if the node is inside a tag that should not be modified.
function shouldSkipNode(node) {
  let el = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    el = el.parentElement;
  }
  return false;
}

// Applies all swap rules to a single text node, preserving the original for future resets.
function processTextNode(node) {
  if (shouldSkipNode(node)) return;

  if (!originalValues.has(node)) {
    originalValues.set(node, node.nodeValue);
  }

  const original = originalValues.get(node);
  const replaced = applyAllRules(original);
  if (node.nodeValue !== replaced) {
    node.nodeValue = replaced;
  }
}

// Walks all text nodes under a root element and applies swap rules to each.
function processTree(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node;
  while ((node = walker.nextNode())) {
    processTextNode(node);
  }
}

// Reverts every modified text node back to its original content.
function restoreAll() {
  for (const [node, original] of originalValues) {
    if (node.nodeValue !== original) {
      node.nodeValue = original;
    }
  }
}

let mutationQueue = [];
let rafPending = false;

// Processes all queued mutation nodes in a single animation frame batch.
function flushMutations() {
  const nodes = mutationQueue.splice(0);
  for (const node of nodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      processTextNode(node);
    } else {
      processTree(node);
    }
  }
  rafPending = false;
}

// Starts a MutationObserver that watches for DOM changes and applies swap rules to new content.
function startObserver() {
  if (observer) observer.disconnect();

  observer = new MutationObserver((mutations) => {
    if (!enabled || rules.length === 0) return;

    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        mutationQueue.push(mutation.target);
      } else {
        for (const node of mutation.addedNodes) {
          mutationQueue.push(node);
        }
      }
    }

    if (!rafPending) {
      rafPending = true;
      requestAnimationFrame(flushMutations);
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true,
  });
}

// Kicks off the initial page scan and starts the observer if rules are active.
function run() {
  if (!enabled || rules.length === 0) return;
  processTree(document.body);
  startObserver();
}

chrome.storage.sync.get(["rules", "enabled"], (data) => {
  rules = data.rules || [];
  enabled = data.enabled !== false;
  run();
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === "RULES_UPDATED") {
    rules = message.rules || [];
    enabled = message.enabled !== false;

    if (observer) observer.disconnect();
    observer = null;

    restoreAll();

    if (enabled && rules.length > 0) {
      processTree(document.body);
      startObserver();
    }
  }
});

// Returns the word at the given page coordinates, stripped of non-letter characters.
function getWordUnderCursor(x, y) {
  const range = document.caretRangeFromPoint(x, y);
  if (!range) return null;
  range.expand("word");
  const word = range.toString().trim().replace(/[^a-zA-Z'-]/g, "");
  return word.length > 0 ? word : null;
}

document.addEventListener("contextmenu", (e) => {
  const word = getWordUnderCursor(e.clientX, e.clientY);
  if (word) {
    chrome.storage.local.set({ pendingWord: word });
  }
});
