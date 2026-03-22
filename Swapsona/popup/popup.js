let rules = [];
let enabled = true;
let profiles = [];
let activeProfileId = null;

const rulesList = document.getElementById("rulesList");
const addBtn = document.getElementById("addRuleBtn");
const enableToggle = document.getElementById("enableToggle");
const darkToggle = document.getElementById("darkToggle");
const profileBar = document.getElementById("profileBar");

// Applies or removes dark mode and updates the button icon.
function applyDark(isDark) {
  document.body.classList.toggle("dark", isDark);
  darkToggle.textContent = isDark ? "☀" : "☽";
}

darkToggle.addEventListener("click", () => {
  const isDark = !document.body.classList.contains("dark");
  applyDark(isDark);
  chrome.storage.local.set({ darkMode: isDark });
});

chrome.storage.local.get("darkMode", (data) => {
  applyDark(data.darkMode === true);
});

// Returns a short unique id.
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

// Returns a copy of rules with ephemeral _suggestion fields stripped.
function cleanRules(rawRules) {
  return rawRules.map((r) => {
    if (r.mode !== "parts") return r;
    return { ...r, parts: r.parts.map(({ _suggestion, ...p }) => p) };
  });
}

// Saves current rules into the active profile, then persists everything to sync storage.
function save() {
  const current = profiles.find((p) => p.id === activeProfileId);
  if (current) current.rules = cleanRules(rules);
  chrome.storage.sync.set({ profiles, activeProfileId, enabled });
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

// Switches to a different profile, saving the current one first.
function switchProfile(id) {
  const current = profiles.find((p) => p.id === activeProfileId);
  if (current) current.rules = cleanRules(rules);
  activeProfileId = id;
  const next = profiles.find((p) => p.id === id);
  rules = next ? [...next.rules] : [];
  saveAndPushNow();
  renderProfiles();
  renderRules();
}

// Renders the profile chip bar.
function renderProfiles() {
  profileBar.innerHTML = "";

  profiles.forEach((profile) => {
    const chip = document.createElement("div");
    chip.className = "profile-chip" + (profile.id === activeProfileId ? " active" : "");

    const nameEl = document.createElement("input");
    nameEl.type = "text";
    nameEl.className = "profile-chip-name";
    nameEl.value = profile.name;
    nameEl.readOnly = true;
    nameEl.title = "Double-click to rename";
    nameEl.addEventListener("dblclick", () => {
      nameEl.readOnly = false;
      nameEl.select();
    });
    nameEl.addEventListener("blur", () => {
      profile.name = nameEl.value.trim() || profile.name;
      nameEl.value = profile.name;
      nameEl.readOnly = true;
      save();
    });
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") nameEl.blur();
      if (e.key === "Escape") { nameEl.value = profile.name; nameEl.blur(); }
    });

    chip.addEventListener("click", () => {
      if (!nameEl.readOnly) return;
      if (profile.id !== activeProfileId) switchProfile(profile.id);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "profile-chip-del";
    delBtn.textContent = "×";
    delBtn.title = "Delete profile";
    if (profiles.length <= 1) delBtn.style.display = "none";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (profiles.length <= 1) return;
      const idx = profiles.indexOf(profile);
      profiles.splice(idx, 1);
      if (activeProfileId === profile.id) {
        activeProfileId = profiles[Math.max(0, idx - 1)].id;
        const newActive = profiles.find((p) => p.id === activeProfileId);
        rules = newActive ? [...newActive.rules] : [];
        saveAndPushNow();
      } else {
        save();
      }
      renderProfiles();
      renderRules();
    });

    chip.appendChild(nameEl);
    chip.appendChild(delBtn);
    profileBar.appendChild(chip);
  });

  const newProfileBtn = document.createElement("button");
  newProfileBtn.className = "add-profile-btn";
  newProfileBtn.textContent = "+";
  newProfileBtn.title = "New profile";
  newProfileBtn.addEventListener("click", () => {
    const p = { id: generateId(), name: "New Profile", rules: [] };
    profiles.push(p);
    switchProfile(p.id);
    const nameInput = profileBar.querySelector(".profile-chip.active .profile-chip-name");
    if (nameInput) { nameInput.readOnly = false; nameInput.select(); nameInput.focus(); }
  });
  profileBar.appendChild(newProfileBtn);
}

const PART_LABELS = ["First", "Middle", "Last"];

function makeInput(placeholder, value, onChange) {
  const el = document.createElement("input");
  el.type = "text";
  el.placeholder = placeholder;
  el.value = value;
  el.addEventListener("input", (e) => onChange(e.target.value));
  return el;
}

// Asks the content script to find the most common word after firstName, then sets it as a suggestion on the Last part.
function triggerLastSuggestion(ruleIndex) {
  const firstPart = rules[ruleIndex].parts.find((p) => p.label === "First");
  if (!firstPart?.from) return;
  const lastIdx = rules[ruleIndex].parts.findIndex((p) => p.label === "Last");
  if (lastIdx === -1 || rules[ruleIndex].parts[lastIdx].from || rules[ruleIndex].parts[lastIdx]._suggestion) return;
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, { type: "FIND_FOLLOWING_WORD", firstName: firstPart.from }, (response) => {
      if (chrome.runtime.lastError || !response?.word) return;
      const li = rules[ruleIndex].parts.findIndex((p) => p.label === "Last");
      if (li === -1 || rules[ruleIndex].parts[li].from || rules[ruleIndex].parts[li]._suggestion) return;
      rules[ruleIndex].parts[li]._suggestion = response.word;
      renderRules();
    });
  });
}

// Renders a simple find → replace row.
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
      parts: [{ label: "First", from: rule.from || "", to: rule.to || "" }],
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

// Renders an expanded name-parts card with First / Middle / Last rows.
function renderPartsCard(rule, index) {
  const card = document.createElement("div");
  card.className = "parts-card";

  const header = document.createElement("div");
  header.className = "parts-header";

  const label = document.createElement("span");
  label.className = "parts-label";
  label.textContent = "Name Parts";

  const collapseBtn = document.createElement("button");
  collapseBtn.className = "icon-btn";
  collapseBtn.title = "Switch back to simple mode";
  collapseBtn.textContent = "⊟";
  collapseBtn.addEventListener("click", () => {
    const firstPart = rule.parts.find((p) => p.label === "First");
    rules[index] = { mode: "simple", from: firstPart?.from || "", to: firstPart?.to || "", caseSensitive: false };
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

  const partsList = document.createElement("div");
  partsList.className = "parts-list";

  rule.parts.forEach((part, partIdx) => {
    const partRow = document.createElement("div");
    partRow.className = "part-row";

    const partLabel = document.createElement("span");
    partLabel.className = "part-label";
    partLabel.textContent = part.label;

    const fromPlaceholder = part._suggestion ? `${part._suggestion} — Tab to accept` : "Original…";
    const fromInput = makeInput(fromPlaceholder, part.from, (v) => {
      rules[index].parts[partIdx].from = v.trim();
      delete rules[index].parts[partIdx]._suggestion;
      saveAndPush();
    });

    if (part._suggestion && !part.from) {
      fromInput.addEventListener("keydown", (e) => {
        if (e.key === "Tab" && !fromInput.value) {
          fromInput.value = rules[index].parts[partIdx]._suggestion;
          rules[index].parts[partIdx].from = fromInput.value;
          delete rules[index].parts[partIdx]._suggestion;
          saveAndPush();
        }
      });
      fromInput.addEventListener("blur", () => {
        if (!fromInput.value) {
          delete rules[index].parts[partIdx]._suggestion;
          fromInput.placeholder = "Original…";
        }
      });
    }

    if (part.label === "First") {
      fromInput.addEventListener("blur", () => triggerLastSuggestion(index));
    }

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
        rules[index].parts.sort(
          (a, b) => PART_LABELS.indexOf(a.label) - PART_LABELS.indexOf(b.label)
        );
        saveAndPush();
        renderRules();
        if (lbl === "Last") triggerLastSuggestion(index);
      });
      addPartRow.appendChild(chip);
    });

    card.appendChild(addPartRow);
  }

  // If First is already filled and Last was just added (empty, no suggestion), trigger suggestion.
  // setTimeout defers until after renderRules() finishes so the new DOM is fully in place.
  const _fp = rule.parts.find((p) => p.label === "First");
  const _lp = rule.parts.find((p) => p.label === "Last");
  if (_fp?.from && _lp && !_lp.from && !_lp._suggestion) {
    setTimeout(() => triggerLastSuggestion(index), 0);
  }

  return card;
}

// Renders all rules for the active profile.
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

// Initialize popup by loading profiles and rules from storage, then pushing to active tab. Also handles pending word from context menu.

chrome.storage.sync.get(["rules", "enabled", "profiles", "activeProfileId"], (syncData) => {
  enabled = syncData.enabled !== false;
  enableToggle.checked = enabled;

  if (syncData.profiles && syncData.profiles.length > 0) {
    // Strip out any empty "New Profile" leftovers from previous sessions
    profiles = syncData.profiles.filter((p) => !(p.name === "New Profile" && p.rules.length === 0));
  } else {
    profiles = syncData.rules?.length ? [{ id: generateId(), name: "Profile 1", rules: syncData.rules }] : [];
  }

  // Always open on a fresh empty "New Profile"
  const newProfile = { id: generateId(), name: "New Profile", rules: [] };
  profiles.unshift(newProfile);
  activeProfileId = newProfile.id;
  rules = [];

  renderProfiles();
  renderRules();

  // Push current rules to active tab immediately so the profile takes effect
  chrome.runtime.sendMessage({ type: "PUSH_RULES_TO_TAB", rules, enabled });

  chrome.storage.local.get("pendingWord", (localData) => {
    const word = localData.pendingWord;
    if (!word) return;
    chrome.storage.local.remove("pendingWord");
    rules.push({ mode: "simple", from: word, to: "", caseSensitive: false });
    save();
    renderRules();
    const inputs = rulesList.querySelectorAll("input[type='text']");
    if (inputs.length > 0) inputs[inputs.length - 1].focus();
  });
});
