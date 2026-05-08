import { describe, it, expect, beforeEach } from 'vitest';
import { RedBlackTree } from '../red-black-tree';

const numCmp = (a: number, b: number) => a - b;

describe('RedBlackTree', () => {
  let tree: RedBlackTree<number>;
  beforeEach(() => { tree = new RedBlackTree(numCmp); });

  // ── Empty tree ──────────────────────────────────────────
  it('returns empty set on empty tree', () => {
    expect(tree.rangeQuery(0, 100).size).toBe(0);
  });

  // ── Single insert ────────────────────────────────────────
  it('finds inserted value by exact point query', () => {
    tree.insert(5, 'a');
    expect(tree.rangeQuery(5, 5).has('a')).toBe(true);
  });

  it('does not return value outside query range', () => {
    tree.insert(5, 'a');
    expect(tree.rangeQuery(6, 10).has('a')).toBe(false);
    expect(tree.rangeQuery(0, 4).has('a')).toBe(false);
  });

  // ── Multiple IDs at same key ─────────────────────────────
  it('stores multiple IDs at the same key', () => {
    tree.insert(5, 'a');
    tree.insert(5, 'b');
    const r = tree.rangeQuery(5, 5);
    expect(r.has('a')).toBe(true);
    expect(r.has('b')).toBe(true);
  });

  // ── Range queries ────────────────────────────────────────
  describe('rangeQuery with multiple nodes', () => {
    beforeEach(() => {
      [10, 20, 30, 40, 50].forEach((v, i) => tree.insert(v, `id${i}`));
    });

    it('returns only items within [min, max]', () => {
      const r = tree.rangeQuery(15, 45);
      expect(r.has('id1')).toBe(true);  // 20
      expect(r.has('id2')).toBe(true);  // 30
      expect(r.has('id3')).toBe(true);  // 40
      expect(r.has('id0')).toBe(false); // 10 — below range
      expect(r.has('id4')).toBe(false); // 50 — above range
    });

    it('includes both bounds', () => {
      expect(tree.rangeQuery(10, 50).size).toBe(5);
    });

    it('open lower bound (undefined min) returns all ≤ max', () => {
      const r = tree.rangeQuery(undefined, 30);
      expect(r.has('id0')).toBe(true);  // 10
      expect(r.has('id1')).toBe(true);  // 20
      expect(r.has('id2')).toBe(true);  // 30
      expect(r.has('id3')).toBe(false); // 40
    });

    it('open upper bound (undefined max) returns all ≥ min', () => {
      const r = tree.rangeQuery(30, undefined);
      expect(r.has('id1')).toBe(false); // 20
      expect(r.has('id2')).toBe(true);  // 30
      expect(r.has('id3')).toBe(true);  // 40
      expect(r.has('id4')).toBe(true);  // 50
    });

    it('fully open range (both undefined) returns all', () => {
      expect(tree.rangeQuery(undefined, undefined).size).toBe(5);
    });

    it('empty range returns empty set', () => {
      expect(tree.rangeQuery(35, 35).size).toBe(0); // 35 not inserted
    });
  });

  // ── Stays balanced under pathological insert orders ──────
  describe('correctness under sequential inserts', () => {
    it('ascending order (triggers left-rotation heavy path)', () => {
      for (let i = 1; i <= 100; i++) tree.insert(i, `id${i}`);
      expect(tree.rangeQuery(25, 75).size).toBe(51);
    });

    it('descending order (triggers right-rotation heavy path)', () => {
      for (let i = 100; i >= 1; i--) tree.insert(i, `id${i}`);
      expect(tree.rangeQuery(25, 75).size).toBe(51);
    });

    it('alternating insert does not corrupt range queries', () => {
      const vals = [50, 25, 75, 10, 40, 60, 90, 5, 30, 80];
      vals.forEach(v => tree.insert(v, `id${v}`));
      const r = tree.rangeQuery(20, 70);
      expect(r.has('id25')).toBe(true);
      expect(r.has('id75')).toBe(false);
      expect(r.has('id10')).toBe(false);
    });
  });

  // ── removeId ─────────────────────────────────────────────
  describe('removeId', () => {
    it('removes one ID while keeping the other at the same key', () => {
      tree.insert(5, 'a');
      tree.insert(5, 'b');
      tree.removeId(5, 'a');
      const r = tree.rangeQuery(5, 5);
      expect(r.has('a')).toBe(false);
      expect(r.has('b')).toBe(true);
    });

    it('deletes node when its last ID is removed', () => {
      tree.insert(5, 'a');
      tree.removeId(5, 'a');
      expect(tree.rangeQuery(5, 5).size).toBe(0);
    });

    it('removing one key does not disturb adjacent keys', () => {
      tree.insert(3, 'a');
      tree.insert(5, 'b');
      tree.insert(7, 'c');
      tree.removeId(5, 'b');
      const r = tree.rangeQuery(1, 10);
      expect(r.has('a')).toBe(true);
      expect(r.has('b')).toBe(false);
      expect(r.has('c')).toBe(true);
    });

    it('handles non-existent key gracefully', () => {
      expect(() => tree.removeId(99, 'ghost')).not.toThrow();
    });

    it('handles non-existent ID at existing key gracefully', () => {
      tree.insert(5, 'a');
      expect(() => tree.removeId(5, 'ghost')).not.toThrow();
      expect(tree.rangeQuery(5, 5).has('a')).toBe(true);
    });

    it('can remove all nodes one by one (empties the tree)', () => {
      const vals = [15, 6, 23, 4, 7, 71, 5, 50];
      for (const v of vals) tree.insert(v, `id${v}`);
      for (const v of vals) tree.removeId(v, `id${v}`);
      expect(tree.rangeQuery(undefined, undefined).size).toBe(0);
    });

    it('tree remains queryable after removing the root', () => {
      [10, 5, 20, 3, 8].forEach(v => tree.insert(v, `id${v}`));
      tree.removeId(10, 'id10'); // 10 is likely root after insertions
      const r = tree.rangeQuery(1, 25);
      expect(r.has('id5')).toBe(true);
      expect(r.has('id20')).toBe(true);
      expect(r.has('id10')).toBe(false);
    });
  });

  // ── Date comparator ───────────────────────────────────────
  describe('with Date comparator', () => {
    it('supports range queries on dates', () => {
      const dateCmp = (a: Date, b: Date) => a.getTime() - b.getTime();
      const dateTree = new RedBlackTree<Date>(dateCmp);
      const d1 = new Date('2020-01-01');
      const d2 = new Date('2022-06-15');
      const d3 = new Date('2024-12-31');
      dateTree.insert(d1, 'old');
      dateTree.insert(d2, 'mid');
      dateTree.insert(d3, 'new');

      const r = dateTree.rangeQuery(new Date('2021-01-01'), new Date('2023-01-01'));
      expect(r.has('mid')).toBe(true);
      expect(r.has('old')).toBe(false);
      expect(r.has('new')).toBe(false);
    });
  });
});
