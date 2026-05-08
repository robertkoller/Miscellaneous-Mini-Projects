// Prefix trie used for partial-word search. Stores document IDs at every node
// so the last token in a query can match any word that starts with that prefix.

import { DocId } from './types';

interface TrieNode {
  children: Map<string, TrieNode>;
  ids: Set<DocId>;
  isEnd: boolean;
}

function createNode(): TrieNode {
  return { children: new Map(), ids: new Set(), isEnd: false };
}

export class Trie {
  private root: TrieNode = createNode();

  insert(word: string, id: DocId): void {
    const w = word.toLowerCase();
    let node = this.root;
    node.ids.add(id); // root holds all IDs so empty prefix search returns everything
    for (const ch of w) {
      if (!node.children.has(ch)) {
        node.children.set(ch, createNode());
      }
      node = node.children.get(ch)!;
      node.ids.add(id);
    }
    node.isEnd = true;
  }

  // Returns all IDs whose indexed words share this prefix
  search(prefix: string): Set<DocId> {
    const p = prefix.toLowerCase();
    let node = this.root;
    for (const ch of p) {
      if (!node.children.has(ch)) {
        return new Set();
      }
      node = node.children.get(ch)!;
    }
    return new Set(node.ids);
  }

  remove(word: string, id: DocId): void {
    this.removeRecursive(this.root, word.toLowerCase(), 0, id);
  }

  private removeRecursive(node: TrieNode, word: string, depth: number, id: DocId): boolean {
    node.ids.delete(id);
    if (depth === word.length) {
      node.isEnd = false;
      return node.children.size === 0 && node.ids.size === 0;
    }
    const ch = word[depth];
    const child = node.children.get(ch);
    if (!child) {
      return false;
    }
    const prune = this.removeRecursive(child, word, depth + 1, id);
    if (prune) {
      node.children.delete(ch);
    }
    return node.children.size === 0 && node.ids.size === 0 && !node.isEnd;
  }
}
