import { describe, it, expect, beforeEach } from 'vitest';
import { Trie } from '../trie';

describe('Trie', () => {
  let trie: Trie;
  beforeEach(() => { trie = new Trie(); });

  it('returns empty set for unknown prefix', () => {
    expect(trie.search('foo').size).toBe(0);
  });

  it('finds exact match', () => {
    trie.insert('hello', 'doc1');
    expect(trie.search('hello').has('doc1')).toBe(true);
  });

  it('finds by prefix — multiple branches', () => {
    trie.insert('hello', 'doc1');
    trie.insert('help',  'doc2');
    trie.insert('world', 'doc3');
    const r = trie.search('hel');
    expect(r.has('doc1')).toBe(true);
    expect(r.has('doc2')).toBe(true);
    expect(r.has('doc3')).toBe(false);
  });

  it('is case-insensitive on insert and search', () => {
    trie.insert('Hello', 'doc1');
    expect(trie.search('hello').has('doc1')).toBe(true);
    expect(trie.search('HELLO').has('doc1')).toBe(true);
    expect(trie.search('hElLo').has('doc1')).toBe(true);
  });

  it('supports multiple IDs per word', () => {
    trie.insert('cat', 'doc1');
    trie.insert('cat', 'doc2');
    const r = trie.search('cat');
    expect(r.has('doc1')).toBe(true);
    expect(r.has('doc2')).toBe(true);
  });

  it('empty prefix returns all inserted IDs', () => {
    trie.insert('foo', 'a');
    trie.insert('bar', 'b');
    const r = trie.search('');
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(true);
  });

  it('single-character prefix narrows correctly', () => {
    trie.insert('apple', 'a');
    trie.insert('apricot', 'b');
    trie.insert('banana', 'c');
    const r = trie.search('a');
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(true);
    expect(r.has('c')).toBe(false);
  });

  describe('remove', () => {
    it('removes one ID while keeping another', () => {
      trie.insert('hello', 'doc1');
      trie.insert('hello', 'doc2');
      trie.remove('hello', 'doc1');
      const r = trie.search('hello');
      expect(r.has('doc1')).toBe(false);
      expect(r.has('doc2')).toBe(true);
    });

    it('prunes dead nodes when last ID is removed', () => {
      trie.insert('hello', 'doc1');
      trie.remove('hello', 'doc1');
      expect(trie.search('hello').size).toBe(0);
      expect(trie.search('hel').size).toBe(0);
    });

    it('removing one word does not affect sibling branch', () => {
      trie.insert('hello', 'doc1');
      trie.insert('help',  'doc2');
      trie.remove('hello', 'doc1');
      const r = trie.search('hel');
      expect(r.has('doc1')).toBe(false);
      expect(r.has('doc2')).toBe(true);
    });

    it('removing non-existent word is a no-op', () => {
      trie.insert('hello', 'doc1');
      expect(() => trie.remove('ghost', 'doc1')).not.toThrow();
      expect(trie.search('hello').has('doc1')).toBe(true);
    });
  });
});
