import { describe, it, expect } from 'vitest';
import { extractFields, tokenize } from '../field-extractor';
import type { ExtractedField } from '../types';

// Helper: find a field by path (and optionally value) from an extraction result
const field = (fields: ExtractedField[], path: string, value?: unknown) =>
  fields.find(f => f.path === path && (value === undefined || f.value === value));

// ── tokenize ────────────────────────────────────────────────
describe('tokenize', () => {
  it('lowercases and splits on whitespace', () => {
    expect(tokenize('Hello World')).toEqual(['hello', 'world']);
  });

  it('strips punctuation', () => {
    expect(tokenize('foo, bar! baz.')).toEqual(['foo', 'bar', 'baz']);
  });

  it('drops single-character tokens', () => {
    expect(tokenize('a big cat')).toEqual(['big', 'cat']);
  });

  it('handles multiple spaces', () => {
    expect(tokenize('one   two')).toEqual(['one', 'two']);
  });

  it('returns empty array for empty string', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace-only string', () => {
    expect(tokenize('   ')).toEqual([]);
  });
});

// ── extractFields ───────────────────────────────────────────
describe('extractFields', () => {
  describe('primitive classification', () => {
    it('classifies long/spaced string as text', () => {
      const f = field(extractFields({ desc: 'A long description with spaces' }), 'desc');
      expect(f?.type).toBe('text');
    });

    it('classifies short no-space string as categorical', () => {
      const f = field(extractFields({ slug: 'electronics' }), 'slug');
      expect(f?.type).toBe('categorical');
    });

    it('classifies number as number', () => {
      const f = field(extractFields({ price: 99.99 }), 'price');
      expect(f?.type).toBe('number');
      expect(f?.value).toBe(99.99);
    });

    it('classifies boolean as boolean', () => {
      const f = field(extractFields({ active: true }), 'active');
      expect(f?.type).toBe('boolean');
      expect(f?.value).toBe(true);
    });

    it('classifies Date as date and preserves the value', () => {
      const d = new Date('2024-06-01');
      const f = field(extractFields({ createdAt: d }), 'createdAt');
      expect(f?.type).toBe('date');
      expect(f?.value).toBe(d);
    });
  });

  describe('nested objects', () => {
    it('recurses one level deep', () => {
      const fields = extractFields({ user: { name: 'Alice', age: 30 } });
      expect(field(fields, 'user.name')?.value).toBe('Alice');
      expect(field(fields, 'user.age')?.value).toBe(30);
    });

    it('recurses multiple levels deep', () => {
      const fields = extractFields({ a: { b: { c: 42 } } });
      expect(field(fields, 'a.b.c')?.value).toBe(42);
    });
  });

  describe('arrays', () => {
    it('extracts array of primitives under path[]', () => {
      const fields = extractFields({ tags: ['alpha', 'beta', 'gamma'] });
      const tagFields = fields.filter(f => f.path === 'tags[]');
      expect(tagFields.length).toBe(3);
      expect(tagFields.map(f => f.value).sort()).toEqual(['alpha', 'beta', 'gamma']);
    });

    it('extracts array of objects with indexed sub-paths', () => {
      const fields = extractFields({ items: [{ id: 1 }, { id: 2 }] });
      expect(field(fields, 'items[].id', 1)).toBeTruthy();
      expect(field(fields, 'items[].id', 2)).toBeTruthy();
    });

    it('handles mixed-depth array content', () => {
      const fields = extractFields({ list: [{ name: 'x', val: 1 }, { name: 'y', val: 2 }] });
      expect(fields.filter(f => f.path === 'list[].name').length).toBe(2);
      expect(fields.filter(f => f.path === 'list[].val').length).toBe(2);
    });
  });

  describe('null / undefined handling', () => {
    it('skips null values', () => {
      const fields = extractFields({ a: null, b: 'hello' });
      expect(field(fields, 'a')).toBeUndefined();
      expect(field(fields, 'b')?.value).toBe('hello');
    });

    it('skips undefined values', () => {
      const fields = extractFields({ a: undefined, b: 42 });
      expect(field(fields, 'a')).toBeUndefined();
      expect(field(fields, 'b')?.value).toBe(42);
    });

    it('skips null items inside arrays', () => {
      const fields = extractFields({ tags: [null, 'valid'] as unknown[] });
      const tagFields = fields.filter(f => f.path === 'tags[]');
      expect(tagFields.length).toBe(1);
      expect(tagFields[0].value).toBe('valid');
    });
  });

  describe('prefix parameter', () => {
    it('prepends prefix to all paths', () => {
      const fields = extractFields({ name: 'Alice' }, 'user');
      expect(field(fields, 'user.name')?.value).toBe('Alice');
    });
  });
});
