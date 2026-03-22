/**
 * Swapsona — Popup Script
 */

let rules = [];
let enabled = true;

const rulesList = document.getElementById("rulesList");
const addBtn = document.getElementById("addRuleBtn");
const enableToggle = document.getElementById("enableToggle");

// ─── Storage / push ──────────────────────────────────────────────────────────

function save() {
  chrome.storage.sync.set({ rules, enabled });
}

let pushTimer = null;
function pushToTab() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    chrome.runtime.sendMessage({ type: "PUSH_RULES_TO_TAB", rules, enabled });
  }, 500);
}

function saveAndPush() { save(); pushToTab(); }

function saveAndPushNow() {
  save();
  clearTimeout(pushTimer);
  chrome.runtime.sendMessage({ type: "PUSH_RULES_TO_TAB", rules, enabled });
}

// ─── Render helpers ──────────────────────────────────────────────────────────

const PART_LABELS = ["First", "Middle", "Last"];

function makeInput(placeholder, value, onChange) {
  const el = document.createElement("input");
  el.type = "text";
  el.placeholder = placeholder;
  el.value = value;
  el.addEventListener("input", (e) => onChange(e.target.value));
  return el;
}

// ─── Render a simple rule row ─────────────────────────────────────────────────

function renderSimpleRow(rule, index) {
  const row = document.createElement("div");
  row.className = "rule-row";

  const fromInput = makeInput("Find…", rule.from, (v) => {
    rules[index].from = v.trim();
    saveAndPush();
  });

  const arrow = document.createElement("span");
  arrow.className = "arrow";
  arrow.textContent = "→";

  const toInput = makeInput("Replace with…", rule.to, (v) => {
    rules[index].to = v.trim();
    saveAndPush();
  });

  const expandBtn = document.createElement("button");
  expandBtn.className = "icon-btn expand-btn";
  expandBtn.title = "Switch to First / Middle / Last mode";
  expandBtn.textContent = "⊞";
  expandBtn.addEventListener("click", () => {
    rules[index] = {
      mode: "parts",
      parts: [{ label: "First", from: "", to: "" }],
    };
    saveAndPush();
    renderRules();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete-btn";
  deleteBtn.title = "Remove rule";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => {
    rules.splice(index, 1);
    saveAndPushNow();
    renderRules();
  });

  row.appendChild(fromInput);
  row.appendChild(arrow);
  row.appendChild(toInput);
  row.appendChild(expandBtn);
  row.appendChild(deleteBtn);
  return row;
}

// ─── Render a parts rule card ─────────────────────────────────────────────────

function renderPartsCard(rule, index) {
  const card = document.createElement("div");
  card.className = "parts-card";

  // ── Card header ──
  const header = document.createElement("div");
  header.className = "parts-header";

  const label = document.createElement("span");
  label.className = "parts-label";
  label.textContent = "Name Parts";

  // Collapse back to simple mode
  const collapseBtn = document.createElement("button");
  collapseBtn.className = "icon-btn";
  collapseBtn.title = "Switch back to simple mode";
  collapseBtn.textContent = "⊟";
  collapseBtn.addEventListener("click", () => {
    rules[index] = { mode: "simple", from: "", to: "", caseSensitive: false };
    saveAndPush();
    renderRules();
  });

  const deleteBtn = document.createElement("button");
  deleteBtn.className = "icon-btn delete-btn";
  deleteBtn.title = "Remove rule";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => {
    rules.splice(index, 1);
    saveAndPushNow();
    renderRules();
  });

  header.appendChild(label);
  header.appendChild(collapseBtn);
  header.appendChild(deleteBtn);
  card.appendChild(header);

  // ── Part rows ──
  const partsList = document.createElement("div");
  partsList.className = "parts-list";

  rule.parts.forEach((part, partIdx) => {
    const partRow = document.createElement("div");
    partRow.className = "part-row";

    const partLabel = document.createElement("span");
    partLabel.className = "part-label";
    partLabel.textContent = part.label;

    const fromInput = makeInput("Original…", part.from, (v) => {
      rules[index].parts[partIdx].from = v.trim();
      saveAndPush();
    });

    const arrow = document.createElement("span");
    arrow.className = "arrow";
    arrow.textContent = "→";

    const toInput = makeInput("Replace with…", part.to, (v) => {
      rules[index].parts[partIdx].to = v.trim();
      saveAndPush();
    });

    const removePartBtn = document.createElement("button");
    removePartBtn.className = "icon-btn delete-btn";
    removePartBtn.title = `Remove ${part.label} name`;
    removePartBtn.textContent = "−";
    removePartBtn.addEventListener("click", () => {
      rules[index].parts.splice(partIdx, 1);
      saveAndPush();
      renderRules();
    });

    partRow.appendChild(partLabel);
    partRow.appendChild(fromInput);
    partRow.appendChild(arrow);
    partRow.appendChild(toInput);
    partRow.appendChild(removePartBtn);
    partsList.appendChild(partRow);
  });

  card.appendChild(partsList);

  // ── Add part dropdown ──
  const usedLabels = new Set(rule.parts.map((p) => p.label));
  const available = PART_LABELS.filter((l) => !usedLabels.has(l));

  if (available.length > 0) {
    const addPartRow = document.createElement("div");
    addPartRow.className = "add-part-row";

    const addPartLabel = document.createElement("span");
    addPartLabel.className = "add-part-label";
    addPartLabel.textContent = "+ Add:";

    addPartRow.appendChild(addPartLabel);

    available.forEach((lbl) => {
      const chip = document.createElement("button");
      chip.className = "part-chip";
      chip.textContent = lbl;
      chip.addEventListener("click", () => {
        rules[index].parts.push({ label: lbl, from: "", to: "" });
        // Keep First / Middle / Last order
        rules[index].parts.sort(
          (a, b) => PART_LABELS.indexOf(a.label) - PART_LABELS.indexOf(b.label)
        );
        saveAndPush();
        renderRules();
      });
      addPartRow.appendChild(chip);
    });

    card.appendChild(addPartRow);
  }

  return card;
}

// ─── Main render ─────────────────────────────────────────────────────────────

function renderRules() {
  rulesList.innerHTML = "";
  rules.forEach((rule, index) => {
    if (rule.mode === "parts") {
      rulesList.appendChild(renderPartsCard(rule, index));
    } else {
      rulesList.appendChild(renderSimpleRow(rule, index));
    }
  });
}

// ─── Event listeners ─────────────────────────────────────────────────────────

addBtn.addEventListener("click", () => {
  rules.push({ mode: "simple", from: "", to: "", caseSensitive: false });
  save();
  renderRules();
  const inputs = rulesList.querySelectorAll("input[type='text']");
  if (inputs.length > 0) inputs[inputs.length - 2].focus();
});

enableToggle.addEventListener("change", (e) => {
  enabled = e.target.checked;
  saveAndPushNow();
});

// ─── Init ────────────────────────────────────────────────────────────────────

chrome.storage.sync.get(["rules", "enabled"], (syncData) => {
  rules = syncData.rules || [];
  enabled = syncData.enabled !== false;
  enableToggle.checked = enabled;
  renderRules();

  // Check if a word was right-clicked on the page and pre-fill a new rule.
  chrome.storage.local.get("pendingWord", (localData) => {
    const word = localData.pendingWord;
    if (!word) return;

    // Clear it immediately so it doesn't re-appear next time
    chrome.storage.local.remove("pendingWord");

    // Add a new rule pre-filled with the clicked word
    rules.push({ mode: "simple", from: word, to: "", caseSensitive: false });
    save();
    renderRules();

    // Focus the "replace with" input of the new rule so the user can type right away
    const inputs = rulesList.querySelectorAll("input[type='text']");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  });
});
