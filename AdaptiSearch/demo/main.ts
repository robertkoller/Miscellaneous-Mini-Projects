import { SearchEngine } from '../src/index';
import type { Filter, SearchResult } from '../src/index';

interface Product {
  name: string;
  category: string;
  brand: string;
  price: number;
  rating: number;
  inStock: boolean;
  description: string;
  tags: string[];
  releaseDate: Date;
}

const PRODUCTS: Array<{ id: string; item: Product }> = [
  { id: '1',  item: { name: 'Wireless Noise-Cancelling Headphones', category: 'Electronics', brand: 'SoundCore', price: 299, rating: 4.7, inStock: true,  description: 'Premium over-ear headphones with 30-hour battery life and adaptive noise cancellation.', tags: ['audio', 'wireless', 'premium'], releaseDate: new Date('2024-03-15') } },
  { id: '2',  item: { name: 'Mechanical Gaming Keyboard', category: 'Electronics', brand: 'KeyForge', price: 149, rating: 4.5, inStock: true,  description: 'Tactile switches, per-key RGB lighting and programmable macros for competitive play.', tags: ['gaming', 'keyboard', 'rgb'], releaseDate: new Date('2024-01-20') } },
  { id: '3',  item: { name: '4K Webcam Pro', category: 'Electronics', brand: 'VisionPro', price: 129, rating: 4.2, inStock: true,  description: 'Ultra-sharp 4K webcam with auto-focus, HDR, and built-in noise-cancelling mic.', tags: ['webcam', 'streaming', '4k'], releaseDate: new Date('2024-05-01') } },
  { id: '4',  item: { name: 'USB-C Hub 7-in-1', category: 'Electronics', brand: 'ConnectX', price: 49,  rating: 4.4, inStock: true,  description: 'Expands a single USB-C port into HDMI, SD card, USB-A x3, and 100W PD charging.', tags: ['hub', 'usbc', 'portable'], releaseDate: new Date('2023-11-05') } },
  { id: '5',  item: { name: 'Bluetooth Earbuds', category: 'Electronics', brand: 'SoundCore', price: 79,  rating: 4.3, inStock: true,  description: 'True wireless earbuds with 8-hour playtime, IPX5 water resistance, and fast charging.', tags: ['audio', 'wireless', 'earbuds'], releaseDate: new Date('2024-02-10') } },
  { id: '6',  item: { name: 'Smart Watch Series 9', category: 'Electronics', brand: 'ChronoTech', price: 399, rating: 4.6, inStock: false, description: 'Advanced health tracking, ECG, blood oxygen, and always-on AMOLED display.', tags: ['smartwatch', 'fitness', 'health'], releaseDate: new Date('2024-09-12') } },
  { id: '7',  item: { name: 'Portable SSD 1TB', category: 'Electronics', brand: 'DataVault', price: 89,  rating: 4.8, inStock: true,  description: '1TB NVMe SSD with USB 3.2 Gen 2 — up to 1050 MB/s read speed in a pocket-sized enclosure.', tags: ['storage', 'portable', 'fast'], releaseDate: new Date('2023-08-22') } },
  { id: '8',  item: { name: 'Wireless Charging Pad', category: 'Electronics', brand: 'ChargeFlow', price: 35,  rating: 4.1, inStock: true,  description: '15W fast wireless charging pad compatible with Qi-enabled devices.', tags: ['charging', 'wireless'], releaseDate: new Date('2023-06-30') } },
  { id: '9',  item: { name: 'Running Shoes Elite', category: 'Clothing', brand: 'SwiftStep', price: 120, rating: 4.4, inStock: true,  description: 'Lightweight carbon-plate running shoes with responsive foam midsole for long-distance runs.', tags: ['running', 'shoes', 'athletic'], releaseDate: new Date('2024-04-01') } },
  { id: '10', item: { name: 'Merino Wool Sweater', category: 'Clothing', brand: 'NorthWear', price: 89,  rating: 4.6, inStock: true,  description: 'Soft 100% merino wool sweater — naturally temperature-regulating and odor-resistant.', tags: ['wool', 'warm', 'casual'], releaseDate: new Date('2023-10-14') } },
  { id: '11', item: { name: 'Waterproof Hiking Jacket', category: 'Clothing', brand: 'TrailMaster', price: 199, rating: 4.5, inStock: false, description: '3-layer Gore-Tex hiking jacket with sealed seams, pit zips, and a helmet-compatible hood.', tags: ['hiking', 'waterproof', 'outdoor'], releaseDate: new Date('2023-09-05') } },
  { id: '12', item: { name: 'Compression Training Shorts', category: 'Clothing', brand: 'FlexFit', price: 45,  rating: 4.2, inStock: true,  description: '4-way stretch compression shorts with moisture-wicking fabric and deep pockets.', tags: ['training', 'compression', 'gym'], releaseDate: new Date('2024-01-08') } },
  { id: '13', item: { name: 'Full-Grain Leather Belt', category: 'Clothing', brand: 'CraftCo', price: 55,  rating: 4.0, inStock: true,  description: 'Hand-stitched full-grain leather belt that develops a unique patina over time.', tags: ['leather', 'belt', 'casual'], releaseDate: new Date('2022-03-20') } },
  { id: '14', item: { name: 'Polarized Sport Sunglasses', category: 'Clothing', brand: 'ClearView', price: 79,  rating: 4.3, inStock: true,  description: 'Lightweight TR-90 frame with polarized lenses that eliminate road glare for cyclists and runners.', tags: ['sunglasses', 'polarized', 'sport'], releaseDate: new Date('2024-05-22') } },
  { id: '15', item: { name: 'Introduction to Algorithms', category: 'Books', brand: 'MIT Press', price: 65,  rating: 4.9, inStock: true,  description: 'The definitive reference for algorithm analysis — covers sorting, graphs, dynamic programming, and more.', tags: ['algorithms', 'computer-science', 'textbook'], releaseDate: new Date('2022-04-05') } },
  { id: '16', item: { name: 'Clean Code', category: 'Books', brand: 'Prentice Hall', price: 45,  rating: 4.7, inStock: true,  description: 'Robert C. Martin\'s guide to writing readable, maintainable software through naming, functions, and testing.', tags: ['programming', 'software-engineering', 'best-practices'], releaseDate: new Date('2008-08-01') } },
  { id: '17', item: { name: 'The Pragmatic Programmer', category: 'Books', brand: 'Addison-Wesley', price: 49,  rating: 4.8, inStock: true,  description: 'Timeless advice on craftsmanship, automation, and professional growth for software developers.', tags: ['programming', 'career', 'best-practices'], releaseDate: new Date('2019-09-23') } },
  { id: '18', item: { name: 'Designing Data-Intensive Applications', category: 'Books', brand: "O'Reilly", price: 59,  rating: 4.9, inStock: true,  description: 'Deep dive into distributed systems, databases, and the trade-offs behind building reliable data infrastructure.', tags: ['distributed-systems', 'databases', 'architecture'], releaseDate: new Date('2017-03-16') } },
  { id: '19', item: { name: 'System Design Interview Vol. 2', category: 'Books', brand: 'Byte by Byte', price: 39,  rating: 4.5, inStock: false, description: 'Covers large-scale system design patterns including sharding, CDNs, rate limiting, and consistent hashing.', tags: ['system-design', 'interview', 'architecture'], releaseDate: new Date('2022-01-18') } },
  { id: '20', item: { name: 'Extra-Thick Yoga Mat', category: 'Sports', brand: 'ZenFlex', price: 39,  rating: 4.4, inStock: true,  description: '6mm TPE foam yoga mat with alignment lines, non-slip surface, and carrying strap included.', tags: ['yoga', 'mat', 'fitness'], releaseDate: new Date('2023-07-11') } },
  { id: '21', item: { name: 'Resistance Bands Set (5-pack)', category: 'Sports', brand: 'PowerBand', price: 29,  rating: 4.3, inStock: true,  description: 'Five resistance levels from 10–50 lbs — great for strength training, rehab, and stretching.', tags: ['resistance', 'bands', 'strength'], releaseDate: new Date('2023-04-18') } },
  { id: '22', item: { name: 'Doorframe Pull-Up Bar', category: 'Sports', brand: 'IronGrip', price: 55,  rating: 4.2, inStock: true,  description: 'No-screw doorframe pull-up bar with foam grips, supports up to 300 lbs, installs in seconds.', tags: ['pullup', 'bodyweight', 'strength'], releaseDate: new Date('2022-11-30') } },
  { id: '23', item: { name: 'Adjustable Dumbbells 5–52.5 lbs', category: 'Sports', brand: 'FlexLift', price: 299, rating: 4.7, inStock: false, description: 'Replace 15 sets of weights — quick-select dial adjusts from 5 to 52.5 lbs in 2.5 lb increments.', tags: ['dumbbells', 'adjustable', 'strength'], releaseDate: new Date('2023-01-10') } },
  { id: '24', item: { name: 'Speed Jump Rope', category: 'Sports', brand: 'QuickPulse', price: 19,  rating: 4.1, inStock: true,  description: 'Ball-bearing speed rope with adjustable cable length and ergonomic foam handles.', tags: ['jump-rope', 'cardio', 'speed'], releaseDate: new Date('2022-06-05') } },
  { id: '25', item: { name: 'Gym Duffle Bag 40L', category: 'Sports', brand: 'CarryAll', price: 65,  rating: 4.3, inStock: true,  description: 'Water-resistant gym bag with separate wet shoe compartment, padded laptop sleeve, and 40L capacity.', tags: ['bag', 'gym', 'travel'], releaseDate: new Date('2023-03-27') } },
  { id: '26', item: { name: 'Single-Origin Coffee Beans 1kg', category: 'Food', brand: 'BrewMaster', price: 24,  rating: 4.6, inStock: true,  description: 'Light-roast Ethiopian Yirgacheffe beans with notes of blueberry, jasmine, and dark chocolate.', tags: ['coffee', 'organic', 'light-roast'], releaseDate: new Date('2024-05-15') } },
  { id: '27', item: { name: 'Whey Protein Powder Vanilla', category: 'Food', brand: 'NutriForce', price: 49,  rating: 4.4, inStock: true,  description: '25g protein per serving, cold-processed whey isolate with no artificial sweeteners. 30 servings.', tags: ['protein', 'supplement', 'vanilla'], releaseDate: new Date('2024-02-28') } },
  { id: '28', item: { name: 'Ceremonial Grade Matcha', category: 'Food', brand: 'TeaHaven', price: 22,  rating: 4.5, inStock: true,  description: 'Stone-ground shade-grown matcha from Uji, Japan — vibrant green with a smooth, umami-rich flavor.', tags: ['matcha', 'tea', 'japanese'], releaseDate: new Date('2023-12-01') } },
  { id: '29', item: { name: 'Mixed Nuts 1kg Bag', category: 'Food', brand: 'NutCo', price: 18,  rating: 4.2, inStock: true,  description: 'Dry-roasted cashews, almonds, walnuts, and pistachios — lightly salted with no added oils.', tags: ['nuts', 'snack', 'healthy'], releaseDate: new Date('2023-09-15') } },
  { id: '30', item: { name: 'Dark Chocolate 72% Cacao Bar', category: 'Food', brand: 'CacaoBliss', price: 12,  rating: 4.7, inStock: true,  description: 'Single-origin Ecuadorian cacao, stone-ground with raw cane sugar. Bold, complex, and low in sugar.', tags: ['chocolate', 'dark', 'organic'], releaseDate: new Date('2024-01-30') } },
];

const engine = new SearchEngine<Product>();
for (const { id, item } of PRODUCTS) engine.add(id, item);

// ── State ──
let sortBy      = 'relevance';
let currentPage = 1;
let perPage     = 12;

// ── DOM refs ──
const searchInput   = document.getElementById('search')          as HTMLInputElement;
const suggestionsEl = document.getElementById('suggestions')!;
const categoryEl    = document.getElementById('category-filter') as HTMLSelectElement;
const priceMinEl    = document.getElementById('price-min')       as HTMLInputElement;
const priceMaxEl    = document.getElementById('price-max')       as HTMLInputElement;
const ratingEl      = document.getElementById('rating-min')      as HTMLInputElement;
const ratingDisplay = document.getElementById('rating-display')!;
const instockEl     = document.getElementById('instock-filter')  as HTMLInputElement;
const sortEl        = document.getElementById('sort-select')     as HTMLSelectElement;
const perPageEl     = document.getElementById('per-page-select') as HTMLSelectElement;
const resultsEl     = document.getElementById('results')!;
const paginationEl  = document.getElementById('pagination')!;
const countEl       = document.getElementById('result-count')!;
const showingEl     = document.getElementById('showing-range')!;
const timeEl        = document.getElementById('search-time')!;
const clearBtn      = document.getElementById('clear-btn')!;

function sortResults(results: SearchResult<Product>[]): SearchResult<Product>[] {
  const s = [...results];
  switch (sortBy) {
    case 'price-asc':  return s.sort((a, b) => a.item.price - b.item.price);
    case 'price-desc': return s.sort((a, b) => b.item.price - a.item.price);
    case 'rating':     return s.sort((a, b) => b.item.rating - a.item.rating);
    case 'name':       return s.sort((a, b) => a.item.name.localeCompare(b.item.name));
    case 'newest':     return s.sort((a, b) => b.item.releaseDate.getTime() - a.item.releaseDate.getTime());
    default:           return s; // relevance — already scored by engine
  }
}

function renderPagination(total: number): void {
  const totalPages = Math.ceil(total / perPage);
  if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

  const pages: (number | '…')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('…');
    const lo = Math.max(2, currentPage - 1);
    const hi = Math.min(totalPages - 1, currentPage + 1);
    for (let i = lo; i <= hi; i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('…');
    pages.push(totalPages);
  }

  paginationEl.innerHTML = `<div class="pagination">
    <button class="page-btn" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>←</button>
    ${pages.map(p =>
      p === '…'
        ? `<span class="page-ellipsis">…</span>`
        : `<button class="page-btn ${p === currentPage ? 'active' : ''}" data-page="${p}">${p}</button>`
    ).join('')}
    <button class="page-btn" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>→</button>
  </div>`;

  paginationEl.querySelectorAll<HTMLButtonElement>('.page-btn:not(:disabled)').forEach(btn => {
    btn.addEventListener('click', () => {
      currentPage = Number(btn.dataset.page);
      runSearch();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}

function stars(rating: number): string {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(empty) + ` ${rating.toFixed(1)}`;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}

function runSearch(): void {
  const t0 = performance.now();
  const filters: Filter[] = [];

  const cat = categoryEl.value;
  if (cat) filters.push({ kind: 'exact', field: 'category', value: cat });

  const pMin = priceMinEl.value ? Number(priceMinEl.value) : undefined;
  const pMax = priceMaxEl.value ? Number(priceMaxEl.value) : undefined;
  if (pMin !== undefined || pMax !== undefined) {
    filters.push({ kind: 'range', field: 'price', min: pMin, max: pMax });
  }

  const minRating = Number(ratingEl.value);
  if (minRating > 0) {
    filters.push({ kind: 'range', field: 'rating', min: minRating });
  }

  if (instockEl.checked) {
    filters.push({ kind: 'exact', field: 'inStock', value: true });
  }

  // Get all matching results, then sort and paginate client-side
  const allResults = sortResults(engine.search({
    text: searchInput.value || undefined,
    filters,
  }));

  const elapsed   = (performance.now() - t0).toFixed(2);
  const total     = allResults.length;
  const totalPages = Math.ceil(total / perPage);

  // Clamp page after filter changes can reduce total
  if (currentPage > totalPages && totalPages > 0) currentPage = totalPages;

  const start   = (currentPage - 1) * perPage;
  const end     = Math.min(start + perPage, total);
  const page    = allResults.slice(start, end);

  countEl.innerHTML = `<span>${total}</span> result${total !== 1 ? 's' : ''}`;
  showingEl.textContent = total > 0 ? `Showing ${start + 1}–${end} of ${total}` : '';
  timeEl.textContent    = `${elapsed} ms`;

  if (total === 0) {
    resultsEl.innerHTML = `
      <div class="empty">
        <div class="empty-icon">🔍</div>
        <h3>No results found</h3>
        <p>Try a different search term or adjust your filters.</p>
      </div>`;
    paginationEl.innerHTML = '';
    return;
  }

  resultsEl.innerHTML = page.map(({ item: p }) => `
    <div class="card">
      <div class="card-top">
        <div class="card-name">${p.name}</div>
        <div class="card-price">$${p.price}</div>
      </div>
      <div class="card-meta">
        <span class="badge badge-category">${p.category}</span>
        <span class="badge badge-brand">${p.brand}</span>
        <span class="badge ${p.inStock ? 'badge-instock' : 'badge-outstock'}">${p.inStock ? 'In stock' : 'Out of stock'}</span>
      </div>
      <div class="card-stars">${stars(p.rating)}</div>
      <div class="card-desc">${p.description}</div>
      <div class="card-meta">${p.tags.map(t => `<span class="badge badge-tag">${t}</span>`).join('')}</div>
      <div class="card-date">${formatDate(p.releaseDate)}</div>
    </div>
  `).join('');

  renderPagination(total);
}

function resetPage(): void { currentPage = 1; }

// ── Rating slider: update label + CSS gradient ──
ratingEl.addEventListener('input', () => {
  const v = Number(ratingEl.value);
  ratingDisplay.textContent = v === 0 ? '★ Any' : `★ ${v.toFixed(1)}+`;
  ratingEl.style.setProperty('--pct', `${(v / 5) * 100}%`);
  resetPage(); runSearch();
});

// ── Sort ──
sortEl.addEventListener('change', () => { sortBy = sortEl.value; resetPage(); runSearch(); });

// ── Per page ──
perPageEl.addEventListener('change', () => { perPage = Number(perPageEl.value); resetPage(); runSearch(); });

// ── Clear button ──
clearBtn.addEventListener('click', () => {
  suggestionsEl.style.display = 'none';
  searchInput.value         = '';
  categoryEl.value          = '';
  priceMinEl.value          = '';
  priceMaxEl.value          = '';
  ratingEl.value            = '0';
  ratingDisplay.textContent = '★ Any';
  ratingEl.style.setProperty('--pct', '0%');
  instockEl.checked         = false;
  sortEl.value              = 'relevance';
  sortBy                    = 'relevance';
  perPageEl.value           = '12';
  perPage                   = 12;
  resetPage(); runSearch();
});

// ── Autocomplete ──
function showSuggestions(suggestions: string[]): void {
  if (suggestions.length === 0) { suggestionsEl.style.display = 'none'; return; }
  suggestionsEl.innerHTML = suggestions.slice(0, 6).map(s =>
    `<div class="suggestion-item">${s}</div>`
  ).join('');
  suggestionsEl.style.display = 'block';
  suggestionsEl.querySelectorAll<HTMLDivElement>('.suggestion-item').forEach(item => {
    item.addEventListener('mousedown', e => {
      e.preventDefault();
      const words = searchInput.value.trimEnd().split(/\s+/);
      words[words.length - 1] = item.textContent!;
      searchInput.value = words.join(' ') + ' ';
      suggestionsEl.style.display = 'none';
      resetPage(); runSearch();
    });
  });
}

searchInput.addEventListener('blur', () => { suggestionsEl.style.display = 'none'; });

// ── Debounce text input, instant for everything else ──
let debounceTimer: ReturnType<typeof setTimeout>;
searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const words = searchInput.value.trimEnd().split(/\s+/);
  const lastWord = words[words.length - 1];
  showSuggestions(lastWord.length >= 2 ? engine.autocomplete(lastWord) : []);
  debounceTimer = setTimeout(() => { resetPage(); runSearch(); }, 120);
});

categoryEl.addEventListener('change', () => { resetPage(); runSearch(); });
priceMinEl.addEventListener('input',  () => { resetPage(); runSearch(); });
priceMaxEl.addEventListener('input',  () => { resetPage(); runSearch(); });
instockEl .addEventListener('change', () => { resetPage(); runSearch(); });

runSearch();
