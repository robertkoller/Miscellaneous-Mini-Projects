// Main entry point for the library. Wires together all the data structures and
// exposes add, remove, search, and autocomplete to the outside world.

import { DocId, ExtractedField, Filter, SearchQuery, SearchResult } from './types';
import { Trie } from './trie';
import { RedBlackTree } from './red-black-tree';
import { InvertedIndex } from './inverted-index';
import { extractFields, tokenize } from './field-extractor';
import { AutoComplete } from './AutoComplete';

const numericCompare = (a: number, b: number): number => a - b;
const dateCompare = (a: Date, b: Date): number => a.getTime() - b.getTime();

// Intersects multiple sets, starting from the smallest to minimize work
function intersect(sets: Set<DocId>[]): Set<DocId> {
  if (sets.length === 0) {
     return new Set();
  }
  const sorted = [...sets].sort((a, b) => a.size - b.size);
  const result = new Set(sorted[0]);
  for (let i = 1; i < sorted.length; i++) {
    for (const id of result) {
      if (!sorted[i].has(id)) result.delete(id);
    }
  }
  return result;
}

export class SearchEngine<T extends object> {
  private documents = new Map<DocId, T>();
  private trie = new Trie();
  private invertedIndex = new InvertedIndex();
  private numericTrees = new Map<string, RedBlackTree<number>>();
  private dateTrees = new Map<string, RedBlackTree<Date>>();
  private categoricalIndex = new Map<string, Map<string, Set<DocId>>>();
  private docFields = new Map<DocId, ExtractedField[]>();
  private autoCompleter = new AutoComplete();

  add(id: DocId, item: T): void {
    if (this.documents.has(id)) this.remove(id);
    this.documents.set(id, item);
    const fields = extractFields(item as Record<string, unknown>);
    this.docFields.set(id, fields);
    for (const field of fields) this.indexField(field, id);
  }

  remove(id: DocId): void {
    const fields = this.docFields.get(id);
    if (!fields) return;
    for (const field of fields) this.unindexField(field, id);
    this.documents.delete(id);
    this.docFields.delete(id);
  }

  private indexField(field: ExtractedField, id: DocId): void {
    const { path, value, type } = field;
    if (type === 'text' || type === 'categorical') {
      // All strings go into the full-text indexes — categoricals are also searchable
      for (const token of tokenize(value as string)) {
        this.trie.insert(token, id);
        this.invertedIndex.add(token, id);
        this.autoCompleter.insert(token);
      }
    }
    if (type === 'categorical' || type === 'boolean') {
      const key = String(value);
      if (!this.categoricalIndex.has(path)) this.categoricalIndex.set(path, new Map());
      const fieldMap = this.categoricalIndex.get(path)!;
      if (!fieldMap.has(key)) fieldMap.set(key, new Set());
      fieldMap.get(key)!.add(id);
    } else if (type === 'number') {
      if (!this.numericTrees.has(path)) this.numericTrees.set(path, new RedBlackTree(numericCompare));
      this.numericTrees.get(path)!.insert(value as number, id);
    } else if (type === 'date') {
      if (!this.dateTrees.has(path)) this.dateTrees.set(path, new RedBlackTree(dateCompare));
      this.dateTrees.get(path)!.insert(value as Date, id);
    }
  }

  private unindexField(field: ExtractedField, id: DocId): void {
    const { path, value, type } = field;
    if (type === 'text' || type === 'categorical') {
      for (const token of tokenize(value as string)) {
        this.trie.remove(token, id);
        this.invertedIndex.remove(token, id);
        this.autoCompleter.remove(token);
      }
    }
    if (type === 'categorical' || type === 'boolean') {
      this.categoricalIndex.get(path)?.get(String(value))?.delete(id);
    }
    if (type === 'number') {
      this.numericTrees.get(path)?.removeId(value as number, id);
    }
    if (type === 'date') {
      this.dateTrees.get(path)?.removeId(value as Date, id);
    }
  }

  search(query: SearchQuery): SearchResult<T>[] {
    const constraintSets: Set<DocId>[] = [];
    const scoreMap = new Map<DocId, number>();

    if (query.text?.trim()) {
      const tokens = tokenize(query.text);
      if (tokens.length > 0) {
        const tokenSets: Set<DocId>[] = [];

        for (let i = 0; i < tokens.length - 1; i++) {
          const matches = this.invertedIndex.get(tokens[i]);
          tokenSets.push(matches);
          for (const id of matches) scoreMap.set(id, (scoreMap.get(id) ?? 0) + 1);
        }

        // Last token: union of exact + prefix match to support partial typing
        const last = tokens[tokens.length - 1];
        const exactMatches = this.invertedIndex.get(last);
        const prefixMatches = this.trie.search(last);
        const lastSet = new Set([...exactMatches, ...prefixMatches]);
        for (const id of lastSet) scoreMap.set(id, (scoreMap.get(id) ?? 0) + 1);
        tokenSets.push(lastSet);

        constraintSets.push(intersect(tokenSets));
      }
    }

    for (const filter of query.filters ?? []) {
      constraintSets.push(this.applyFilter(filter));
    }

    const candidates =
      constraintSets.length === 0
        ? new Set(this.documents.keys())
        : intersect(constraintSets);

    const results: SearchResult<T>[] = [];
    for (const id of candidates) {
      results.push({ id, item: this.documents.get(id)!, score: scoreMap.get(id) ?? 0 });
    }

    results.sort((a, b) => b.score - a.score);

    const offset = query.offset ?? 0;
    const limit = query.limit ?? results.length;
    return results.slice(offset, offset + limit);
  }

  private applyFilter(filter: Filter): Set<DocId> {
    if (filter.kind === 'exact') {
      const { field, value } = filter;
      if (typeof value === 'number') {
        return this.numericTrees.get(field)?.rangeQuery(value, value) ?? new Set();
      }
      return this.categoricalIndex.get(field)?.get(String(value)) ?? new Set();
    }

    // Range filter — routes to numeric or date tree based on which is indexed for the field
    const { field, min, max } = filter;
    const numTree = this.numericTrees.get(field);
    if (numTree) {
      const lo = min instanceof Date ? min.getTime() : (min as number | undefined);
      const hi = max instanceof Date ? max.getTime() : (max as number | undefined);
      return numTree.rangeQuery(lo, hi);
    }
    const dateTree = this.dateTrees.get(field);
    if (dateTree) {
      return dateTree.rangeQuery(min as Date | undefined, max as Date | undefined);
    }
    return new Set();
  }

  autocomplete(prefix: string): string[] {
    if (!prefix.trim()) return [];
    return Array.from(this.autoCompleter.search(prefix));
  }

  get size(): number {
    return this.documents.size;
  }
}
