import { describe, it, expect, beforeEach } from 'vitest';
import { InvertedIndex } from '../inverted-index';

describe('InvertedIndex', () => {
  let idx: InvertedIndex;
  beforeEach(() => { idx = new InvertedIndex(); });

  it('returns empty set for unknown token', () => {
    expect(idx.get('unknown').size).toBe(0);
  });

  it('add and get single entry', () => {
    idx.add('hello', 'doc1');
    expect(idx.get('hello').has('doc1')).toBe(true);
  });

  it('multiple docs per token', () => {
    idx.add('hello', 'doc1');
    idx.add('hello', 'doc2');
    const r = idx.get('hello');
    expect(r.has('doc1')).toBe(true);
    expect(r.has('doc2')).toBe(true);
  });

  it('separate tokens do not bleed into each other', () => {
    idx.add('foo', 'doc1');
    idx.add('bar', 'doc2');
    expect(idx.get('foo').has('doc2')).toBe(false);
    expect(idx.get('bar').has('doc1')).toBe(false);
  });

  describe('remove', () => {
    it('removes a specific doc from a token', () => {
      idx.add('hello', 'doc1');
      idx.add('hello', 'doc2');
      idx.remove('hello', 'doc1');
      expect(idx.get('hello').has('doc1')).toBe(false);
      expect(idx.get('hello').has('doc2')).toBe(true);
    });

    it('cleans up the token entry when the last doc is removed', () => {
      idx.add('hello', 'doc1');
      idx.remove('hello', 'doc1');
      expect(idx.get('hello').size).toBe(0);
    });

    it('removing from a non-existent token is a no-op', () => {
      expect(() => idx.remove('ghost', 'doc1')).not.toThrow();
    });

    it('removing a non-existent doc from an existing token is a no-op', () => {
      idx.add('hello', 'doc1');
      expect(() => idx.remove('hello', 'ghost')).not.toThrow();
      expect(idx.get('hello').has('doc1')).toBe(true);
    });
  });
});
