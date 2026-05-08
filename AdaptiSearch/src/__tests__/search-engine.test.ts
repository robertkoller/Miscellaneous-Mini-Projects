import { describe, it, expect, beforeEach } from 'vitest';
import { SearchEngine } from '../search-engine';

interface Book {
  title: string;
  author: string;
  genre: string;
  price: number;
  rating: number;
  inStock: boolean;
  publishedAt: Date;
  tags: string[];
}

const BOOKS: Array<{ id: string; item: Book }> = [
  { id: '1', item: { title: 'Clean Code',                   author: 'Robert Martin', genre: 'Programming', price: 45, rating: 4.7, inStock: true,  publishedAt: new Date('2008-08-01'), tags: ['coding', 'best-practices'] } },
  { id: '2', item: { title: 'The Pragmatic Programmer',      author: 'David Thomas',  genre: 'Programming', price: 49, rating: 4.8, inStock: true,  publishedAt: new Date('2019-09-23'), tags: ['coding', 'career'] } },
  { id: '3', item: { title: 'Dune',                          author: 'Frank Herbert', genre: 'Sci-Fi',      price: 18, rating: 4.9, inStock: true,  publishedAt: new Date('1965-08-01'), tags: ['sci-fi', 'classic'] } },
  { id: '4', item: { title: 'Foundation',                    author: 'Isaac Asimov',  genre: 'Sci-Fi',      price: 16, rating: 4.7, inStock: false, publishedAt: new Date('1951-05-01'), tags: ['sci-fi', 'classic'] } },
  { id: '5', item: { title: 'Introduction to Algorithms',    author: 'CLRS',          genre: 'Programming', price: 70, rating: 4.9, inStock: true,  publishedAt: new Date('2009-07-31'), tags: ['algorithms', 'textbook'] } },
];

describe('SearchEngine', () => {
  let engine: SearchEngine<Book>;

  beforeEach(() => {
    engine = new SearchEngine<Book>();
    for (const { id, item } of BOOKS) engine.add(id, item);
  });

  // ── size ──────────────────────────────────────────────────
  it('reports correct document count', () => {
    expect(engine.size).toBe(5);
  });

  // ── empty query ───────────────────────────────────────────
  it('empty query returns all documents', () => {
    expect(engine.search({}).length).toBe(5);
  });

  // ── text search ───────────────────────────────────────────
  describe('text search', () => {
    it('finds a document by a word in its title', () => {
      const ids = engine.search({ text: 'pragmatic' }).map(r => r.id);
      expect(ids).toContain('2');
    });

    it('is case-insensitive', () => {
      expect(engine.search({ text: 'CLEAN' }).map(r => r.id)).toContain('1');
    });

    it('matches partial prefix on last token', () => {
      expect(engine.search({ text: 'prag' }).map(r => r.id)).toContain('2');
    });

    it('multi-word query intersects — only documents matching all tokens returned', () => {
      const r = engine.search({ text: 'clean code' });
      expect(r.length).toBe(1);
      expect(r[0].id).toBe('1');
    });

    it('returns empty array when nothing matches', () => {
      expect(engine.search({ text: 'zyxwvutsrq' }).length).toBe(0);
    });

    it('searches across multiple fields (title and tags)', () => {
      // "coding" is a tag on docs 1 and 2
      const ids = engine.search({ text: 'coding' }).map(r => r.id);
      expect(ids).toContain('1');
      expect(ids).toContain('2');
    });

    it('multi-token query uses AND semantics — all tokens must match', () => {
      // docs 1 and 2 have 'coding' in tags AND 'Programming' as genre
      // doc 5 has 'Programming' as genre but NOT 'coding'
      const ids = engine.search({ text: 'coding programming' }).map(x => x.id);
      expect(ids).toContain('1');
      expect(ids).toContain('2');
      expect(ids).not.toContain('5');
    });
  });

  // ── exact filter ──────────────────────────────────────────
  describe('exact filter', () => {
    it('filters by categorical string field', () => {
      const r = engine.search({ filters: [{ kind: 'exact', field: 'genre', value: 'Sci-Fi' }] });
      expect(r.length).toBe(2);
      expect(r.map(x => x.id).sort()).toEqual(['3', '4']);
    });

    it('filters by boolean field (inStock: true)', () => {
      const r = engine.search({ filters: [{ kind: 'exact', field: 'inStock', value: true }] });
      expect(r.every(x => x.item.inStock)).toBe(true);
      expect(r.length).toBe(4);
    });

    it('filters by boolean field (inStock: false)', () => {
      const r = engine.search({ filters: [{ kind: 'exact', field: 'inStock', value: false }] });
      expect(r.length).toBe(1);
      expect(r[0].id).toBe('4');
    });

    it('exact numeric filter finds the right document', () => {
      const r = engine.search({ filters: [{ kind: 'exact', field: 'price', value: 45 }] });
      expect(r.map(x => x.id)).toContain('1');
      expect(r.length).toBe(1);
    });
  });

  // ── range filter ──────────────────────────────────────────
  describe('range filter', () => {
    it('filters numeric range with both bounds', () => {
      const r = engine.search({ filters: [{ kind: 'range', field: 'price', min: 40, max: 60 }] });
      expect(r.every(x => x.item.price >= 40 && x.item.price <= 60)).toBe(true);
    });

    it('open lower bound returns all ≤ max', () => {
      const r = engine.search({ filters: [{ kind: 'range', field: 'price', max: 20 }] });
      expect(r.every(x => x.item.price <= 20)).toBe(true);
      expect(r.length).toBe(2); // $16, $18
    });

    it('open upper bound returns all ≥ min', () => {
      const r = engine.search({ filters: [{ kind: 'range', field: 'price', min: 60 }] });
      expect(r.every(x => x.item.price >= 60)).toBe(true);
      expect(r.length).toBe(1); // $70
    });

    it('range filter on rating', () => {
      const r = engine.search({ filters: [{ kind: 'range', field: 'rating', min: 4.85 }] });
      expect(r.every(x => x.item.rating >= 4.85)).toBe(true);
      expect(r.length).toBe(2); // 4.9, 4.9
    });

    it('filters by date range', () => {
      const r = engine.search({ filters: [{
        kind: 'range', field: 'publishedAt',
        min: new Date('2000-01-01'),
        max: new Date('2025-12-31'),
      }] });
      expect(r.every(x => x.item.publishedAt >= new Date('2000-01-01'))).toBe(true);
      const ids = r.map(x => x.id);
      expect(ids).toContain('2'); // 2019
      expect(ids).toContain('5'); // 2009
      expect(ids).not.toContain('3'); // 1965
      expect(ids).not.toContain('4'); // 1951
    });
  });

  // ── multiple filters combined ─────────────────────────────
  describe('combined filters', () => {
    it('two exact filters are ANDed', () => {
      const r = engine.search({ filters: [
        { kind: 'exact', field: 'genre',   value: 'Programming' },
        { kind: 'exact', field: 'inStock', value: true },
      ] });
      expect(r.every(x => x.item.genre === 'Programming' && x.item.inStock)).toBe(true);
    });

    it('text + exact filter are ANDed', () => {
      const r = engine.search({
        text: 'code',
        filters: [{ kind: 'exact', field: 'genre', value: 'Programming' }],
      });
      expect(r.length).toBe(1);
      expect(r[0].id).toBe('1');
    });

    it('text + range filter are ANDed', () => {
      // "algorithms" is in doc 5 title; price 70 is ≥ 60
      const r = engine.search({
        text: 'algorithms',
        filters: [{ kind: 'range', field: 'price', min: 60 }],
      });
      expect(r.length).toBe(1);
      expect(r[0].id).toBe('5');
    });
  });

  // ── pagination ────────────────────────────────────────────
  describe('pagination', () => {
    it('limit caps the result count', () => {
      expect(engine.search({ limit: 2 }).length).toBe(2);
    });

    it('offset skips the first N results', () => {
      const all   = engine.search({}).map(x => x.id);
      const paged = engine.search({ offset: 2 }).map(x => x.id);
      expect(paged).toEqual(all.slice(2));
    });

    it('limit and offset work together', () => {
      const all   = engine.search({}).map(x => x.id);
      const paged = engine.search({ limit: 2, offset: 1 }).map(x => x.id);
      expect(paged).toEqual(all.slice(1, 3));
    });

    it('offset beyond total returns empty array', () => {
      expect(engine.search({ offset: 100 }).length).toBe(0);
    });
  });

  // ── add / remove ──────────────────────────────────────────
  describe('add and remove', () => {
    it('newly added document is immediately searchable', () => {
      engine.add('6', { title: 'Refactoring', author: 'Fowler', genre: 'Programming', price: 52, rating: 4.6, inStock: true, publishedAt: new Date('2018-11-20'), tags: ['refactoring'] });
      expect(engine.search({ text: 'refactoring' }).map(x => x.id)).toContain('6');
      expect(engine.size).toBe(6);
    });

    it('removed document is no longer in text results', () => {
      engine.remove('1');
      expect(engine.search({ text: 'clean' }).map(x => x.id)).not.toContain('1');
    });

    it('removed document is no longer in filter results', () => {
      engine.remove('1');
      const r = engine.search({ filters: [{ kind: 'exact', field: 'genre', value: 'Programming' }] });
      expect(r.map(x => x.id)).not.toContain('1');
    });

    it('removed document decrements size', () => {
      engine.remove('1');
      expect(engine.size).toBe(4);
    });

    it('re-adding a document with new content fully updates all indexes', () => {
      engine.add('1', { ...BOOKS[0].item, title: 'Totally Different Title', price: 999 });
      expect(engine.search({ text: 'totally' }).map(x => x.id)).toContain('1');
      expect(engine.search({ text: 'clean'   }).map(x => x.id)).not.toContain('1');
      const r = engine.search({ filters: [{ kind: 'range', field: 'price', min: 990 }] });
      expect(r.map(x => x.id)).toContain('1');
    });

    it('removing a non-existent id is a no-op', () => {
      expect(() => engine.remove('ghost')).not.toThrow();
      expect(engine.size).toBe(5);
    });
  });
});
