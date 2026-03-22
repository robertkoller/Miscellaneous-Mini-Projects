chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "swapsona-add-word",
      title: "Add to Swapsona",
      contexts: ["all"],
    });
  });
});

chrome.contextMenus.onClicked.addListener((info) => {
  if (info.selectionText && info.selectionText.trim().length > 0) {
    const word = info.selectionText.trim().split(/\s+/)[0];
    chrome.storage.local.set({ pendingWord: word });
  }
});

chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "PUSH_RULES_TO_TAB") return;

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (!tabs[0]) return;
    chrome.tabs.sendMessage(tabs[0].id, {
      type: "RULES_UPDATED",
      rules: message.rules,
      enabled: message.enabled,
    }).catch(() => {});
  });
});
