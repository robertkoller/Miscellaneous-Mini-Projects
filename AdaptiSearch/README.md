# AdaptiSearch

A reusable TypeScript search engine library. You hand it objects; it indexes them automatically and gives back ranked, filterable results. Built on hand-rolled data structures: a trie, an inverted index, red-black trees for numeric/date ranges, and a categorical hash map.

Overall I made this project to kind of practice my Data Structures and Algorithms skills in a useful way. I didnt write most of the tie-together code myself however in terms of the data structures used I wrote lots of that code and also just like lots of this project was me trying to think of the actual model I should use for which scenario and why.

## Project structure

```
src/
  index.ts           — public exports
  types.ts           — shared types (SearchQuery, SearchResult, Filter, ...)
  search-engine.ts   — main SearchEngine class that wires everything together
  trie.ts            — prefix trie for text autocomplete / prefix search
  inverted-index.ts  — maps tokens → document IDs for full-text search
  red-black-tree.ts  — self-balancing BST for numeric/date range queries
  field-extractor.ts — crawls any object and extracts typed fields automatically
  __tests__/         — 91 unit tests covering all data structures and search behaviors

demo/
  index.html         — browser demo UI
  main.ts            — demo app: 30 products, full search + filter + pagination
```

## Setup

```bash
cd AdaptiSearch
npm install
```

## Commands

| Command | What it does |
|---------|-------------|
| `npm run demo` | Start the interactive demo at `http://localhost:5173` |
| `npm test` | Run the full test suite (91 tests) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run dev` | Watch mode — recompiles on save |

## Using the library

```typescript
import { SearchEngine } from './src/index';

interface Book {
  title: string;
  author: string;
  price: number;
  publishedAt: Date;
  inStock: boolean;
}

const engine = new SearchEngine<Book>();

engine.add('1', { title: 'Clean Code', author: 'Robert Martin', price: 45, publishedAt: new Date('2008-08-01'), inStock: true });
engine.add('2', { title: 'Dune',        author: 'Frank Herbert', price: 18, publishedAt: new Date('1965-08-01'), inStock: false });

// Full-text search (prefix-aware — "cle" matches "Clean")
engine.search({ text: 'cle' });

// Exact filter
engine.search({ filters: [{ kind: 'exact', field: 'inStock', value: true }] });

// Range filter
engine.search({ filters: [{ kind: 'range', field: 'price', min: 10, max: 50 }] });

// Combined
engine.search({
  text: 'code',
  filters: [{ kind: 'range', field: 'price', max: 50 }],
  limit: 10,
  offset: 0,
});

// Remove a document
engine.remove('1');
```

`search()` returns `SearchResult<T>[]` — each entry has `{ id, item, score }` sorted by relevance descending.

## How it works

### Field extraction

When you call `engine.add(id, item)`, the engine crawls every field of the object recursively using `extractFields`. It auto-detects the type of each value:

- `number` → indexed in a red-black tree for range queries
- `Date` → indexed in a separate red-black tree for date range queries
- `boolean` → indexed in the categorical hash map for exact matching
- short string (≤50 chars, no spaces) → treated as categorical, indexed for exact matching
- long string / prose → tokenized and indexed in the trie + inverted index for full-text search
- arrays → each element is indexed individually under the same field path

Nested objects are handled with dot notation (`address.city`), arrays with `[]` notation (`tags[]`).

### Trie (prefix search)

Every token from text fields is inserted into the trie, with each node storing the set of document IDs that have a word passing through it. A prefix search like `"pro"` walks three nodes and returns every document containing a word starting with `"pro"` — in O(prefix length) time, regardless of how many documents exist.

### Inverted index (full-text)

Alongside the trie, every token is also added to a flat `token → Set<DocId>` map. When you search for multiple words, the engine intersects the ID sets from the inverted index — starting with the smallest set to minimize work.

### Red-black tree (range queries)

Numbers and dates are stored in self-balancing binary search trees. A range query like `price: { min: 20, max: 100 }` does an in-order traversal collecting all IDs within the bounds — O(log n + k) where k is the number of results.

### Categorical hash map (exact filters)

Categorical fields (enums, booleans, short strings like category names) are stored in a nested map: `field → value → Set<DocId>`. Exact lookups are O(1).

### Scoring and ranking

Each document gets a relevance score based on how many of its fields matched the query text. Documents matching more fields score higher. Results are returned sorted by score descending; ties preserve insertion order. When no text query is given, all documents score equally and the sort is stable.

### Filters

Filters are applied as an intersection: the engine resolves each filter to a set of matching IDs, then intersects all the sets with the text-search results. Only documents satisfying every filter are returned.

## Demo app

`npm run demo` opens a product catalog of 30 items across five categories (Electronics, Clothing, Books, Sports, Food). It demonstrates:

- Live prefix search with 120ms debounce
- Category, price range, minimum rating, and in-stock filters
- Sort by relevance, price, rating, name, or release date
- Pagination (12 / 24 / 48 per page) with smart ellipsis
- Per-query timing displayed in milliseconds
