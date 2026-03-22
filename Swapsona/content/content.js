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
    if (el.isContentEditable) return true;
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

const COMMON_WORDS = new Set([
  "the","a","an","and","or","but","in","on","at","to","for","of","with","by",
  "is","was","are","were","be","been","has","have","had","will","would","could",
  "should","may","might","do","did","does","not","no","so","as","if","this",
  "that","it","he","she","they","we","you","his","her","their","our","your",
  "its","said","says","from","into","than","then","when","who","which","what",
  "about","after","before","more","also","just","only","very","even","still",
]);

// Scans the page text and returns the most frequently occurring word after the given name.
// Uses original (pre-swap) text from the originalValues map so swapped pages still work.
function findMostFrequentFollower(firstName) {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let rawText = "";
  let node;
  while ((node = walker.nextNode())) {
    rawText += (originalValues.get(node) ?? node.nodeValue) + " ";
  }
  const words = rawText.split(/\s+/);
  const lower = firstName.toLowerCase();
  const freq = {};
  for (let i = 0; i < words.length - 1; i++) {
    const clean = words[i].replace(/[^a-zA-Z'-]/g, "");
    if (clean.toLowerCase() !== lower) continue;
    const next = words[i + 1].replace(/[^a-zA-Z'-]/g, "");
    if (next.length >= 2 && !COMMON_WORDS.has(next.toLowerCase())) {
      freq[next] = (freq[next] || 0) + 1;
    }
  }
  const entries = Object.entries(freq);
  if (entries.length === 0) return null;
  return entries.sort((a, b) => b[1] - a[1])[0][0];
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === "FIND_FOLLOWING_WORD") {
    sendResponse({ word: findMostFrequentFollower(message.firstName) });
    return;
  }

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
