# Swapsona

### Last Updated at 03/22/2026

**Swapsona** is a Chrome extension that replaces names on any webpage in real time — so you can read articles, posts, or any content as if it's about someone else entirely.

## Why It Was Made

Sometimes I would want to swap a name in an article or story with my name or someone else's name in order to read the story as if its about me. I just thought of Swapsona as a way to get more immersed in a story and honestly just make it about yourself if you want as well. I feel like there are other uses for this that I cannot think of right now but that was it's original purpose.

---

## Features

### Simple Swaps
Add a find → replace rule and Swapsona instantly rewrites every instance on the page, preserving the original capitalization pattern (ALL CAPS stays all caps, Title Case stays title case).

### Name Parts Mode
Go beyond simple swaps with First / Middle / Last name control. Swap just the first name, just the last, or all three independently — useful when a name appears in different forms across an article.

### Smart Last Name Suggestion
When you fill in a first name, Swapsona scans the page and suggests the word that most commonly follows it — usually the last name — so you don't have to hunt for it yourself. Press Tab to accept.

### Profiles
Save different rule sets as profiles and switch between them instantly. Each browsing session opens fresh on a clean slate so you can set up rules specific to whatever you're reading.

### Context Menu
Right-click any word on a page and select **"Add to Swapsona"** to instantly pre-fill it as a rule in the popup.

### Dark Mode
Full dark mode with a warm, low-contrast palette that's easy on the eyes.

---

## How It Works

Swapsona runs a content script on every page you visit. Here's what happens under the hood:

### DOM Tree Walking
When rules are active, Swapsona uses a `TreeWalker` to traverse every text node in the page's DOM — the raw pieces of text that make up what you read, sitting inside paragraph tags, headings, spans, and so on. It skips nodes inside tags that shouldn't be touched (like `<script>`, `<style>`, `<input>`, `<code>`, etc.).

### Text Node Processing & Originals Map
Before modifying any text node, Swapsona saves its original content in a `Map`. Every replacement is applied against the original, not the already-swapped version — so rules don't stack on top of each other or corrupt each other. This map also makes it possible to fully restore the page to its original state at any time (e.g. when you disable the extension or switch profiles).

### Regex with Word Boundaries
Each swap rule is compiled into a regular expression using `\b` word boundaries — meaning "Fred" won't match inside "Alfred" or "Frederick". Replacements also preserve the capitalization pattern of whatever they replace: if the original was ALL CAPS, the replacement will be too; if it was Title Case, so will the replacement.

### MutationObserver
Modern web pages load content dynamically (infinite scroll, live feeds, single-page apps). Swapsona attaches a `MutationObserver` to `document.body` that watches for new nodes being added to the DOM or character data changing. Any new content is automatically run through the swap rules.

### Animation Frame Batching
DOM mutations can fire dozens of times per second. Rather than processing each one immediately, Swapsona queues them and flushes the whole batch on the next `requestAnimationFrame`. This keeps the extension from blocking the browser's rendering pipeline on heavy pages.

### Smart Last Name Detection
When you're in Name Parts mode and fill in a first name, Swapsona reads `document.body.innerText`, splits it into words, and counts what word appears most frequently directly after the first name — filtering out common filler words. The most common follower (usually the last name) is offered as a Tab-to-accept suggestion in the Last name field.

### Message Passing
The popup doesn't directly touch the page. Instead, when rules change it sends a message to a background service worker, which forwards it to the active tab's content script as a `RULES_UPDATED` event. The content script then restores all originals and re-applies the new rules from scratch.

---

## Installation (Developer Mode)

1. Clone or download this repository
2. Open Chrome and go to `chrome://extensions`
3. Enable **Developer mode** (top right toggle)
4. Click **Load unpacked** and select the `Swapsona` folder
5. The extension icon will appear in your toolbar

---

## How to Use

1. Click the Swapsona icon in your toolbar
2. Click **+ Add a swap rule** and fill in what to find and what to replace it with
3. Rules apply instantly — reload the page if content was already loaded before the extension ran
4. Use the **⊞** button to expand a rule into First / Middle / Last parts mode
5. Use profiles to save and switch between different rule sets

