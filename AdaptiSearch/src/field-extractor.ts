// Crawls any object and extracts typed fields for indexing. Determines whether
// each value should go into the text search, categorical, numeric, or date index.

import { ExtractedField, FieldType } from './types';

function classify(value: unknown): FieldType {
  if (typeof value === 'number') return 'number';
  if (value instanceof Date) return 'date';
  if (typeof value === 'boolean') return 'boolean';
  if (typeof value === 'string') {
    // Short words without spaces → categorical (good for exact-match filters)
    // Longer prose → text (good for full-text search)
    return value.length <= 50 && !/\s/.test(value) ? 'categorical' : 'text';
  }
  return 'text';
}

export function extractFields(
  obj: Record<string, unknown>,
  prefix = '',
): ExtractedField[] {
  const fields: ExtractedField[] = [];

  for (const [key, value] of Object.entries(obj)) {
    if (value === null || value === undefined) continue;
    const path = prefix ? `${prefix}.${key}` : key;

    if (value instanceof Date) {
      fields.push({ path, value, type: 'date' });
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (item === null || item === undefined) continue;
        if (typeof item === 'object' && !(item instanceof Date)) {
          fields.push(...extractFields(item as Record<string, unknown>, `${path}[]`));
        } else {
          fields.push({ path: `${path}[]`, value: item as string | number | boolean, type: classify(item) });
        }
      }
    } else if (typeof value === 'object') {
      fields.push(...extractFields(value as Record<string, unknown>, path));
    } else {
      fields.push({ path, value: value as string | number | boolean, type: classify(value) });
    }
  }

  return fields;
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}
