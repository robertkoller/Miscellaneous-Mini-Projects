// Maps tokens to the set of document IDs that contain them. Used for full-text
// search — query tokens are looked up here to find matching documents.

import { DocId } from './types';

export class InvertedIndex {
  private index = new Map<string, Set<DocId>>();

  add(token: string, id: DocId): void {
    let set = this.index.get(token);
    if (!set) {
      set = new Set(); this.index.set(token, set);
    }
    set.add(id);
  }

  remove(token: string, id: DocId): void {
    const set = this.index.get(token);
    if (!set) {
      return;
    }
    set.delete(id);
    if (set.size === 0) {
      this.index.delete(token);
    }
  }

  get(token: string): Set<DocId> {
    return this.index.get(token) ?? new Set();
  }
}
