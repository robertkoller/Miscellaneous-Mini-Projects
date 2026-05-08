// Shared types used across all data structures and the public API.

export type DocId = string;

export type FieldType = 'text' | 'number' | 'date' | 'boolean' | 'categorical';

export interface ExtractedField {
  path: string;
  value: string | number | Date | boolean;
  type: FieldType;
}

export interface RangeFilter {
  kind: 'range';
  field: string;
  min?: number | Date;
  max?: number | Date;
}

export interface ExactFilter {
  kind: 'exact';
  field: string;
  value: string | number | boolean;
}

export type Filter = RangeFilter | ExactFilter;

export interface SearchQuery {
  text?: string;
  filters?: Filter[];
  limit?: number;
  offset?: number;
}

export interface SearchResult<T> {
  id: DocId;
  item: T;
  score: number;
}
