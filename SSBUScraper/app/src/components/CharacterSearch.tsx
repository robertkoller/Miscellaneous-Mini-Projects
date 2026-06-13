import { useState, useRef, useEffect } from 'react';
import type { Character } from '../types';

interface Props {
  characters: Character[];
  selected: Character | null;
  onSelect: (c: Character) => void;
  placeholder?: string;
}

export function CharacterSearch({ characters, selected, onSelect, placeholder = 'Search character…' }: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const filtered = query.trim()
    ? characters.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
    : characters;

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(c: Character) {
    onSelect(c);
    setQuery('');
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%' }}>
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          padding: '0.6rem 1rem', border: '2px solid #e5e7eb', borderRadius: 10,
          background: 'white', cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
          fontSize: '0.9rem', fontWeight: selected ? 600 : 400,
          color: selected ? '#111827' : '#9ca3af',
        }}
      >
        <span>{selected ? `${selected.name} (${selected.tier})` : placeholder}</span>
        <span style={{ color: '#9ca3af' }}>{open ? '▲' : '▼'}</span>
      </div>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
          background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 300, overflow: 'auto',
        }}>
          <div style={{ padding: '0.5rem' }}>
            <input
              autoFocus
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Type to filter…"
              style={{
                width: '100%', padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb',
                borderRadius: 7, fontSize: '0.85rem', outline: 'none',
              }}
            />
          </div>
          {filtered.map(c => (
            <div
              key={c.name}
              onMouseDown={() => handleSelect(c)}
              style={{
                padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                display: 'flex', justifyContent: 'space-between',
                background: selected?.name === c.name ? '#eff6ff' : undefined,
                color: selected?.name === c.name ? '#2563eb' : '#111827',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#f9fafb'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = selected?.name === c.name ? '#eff6ff' : ''; }}
            >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {c.image && <img src={c.image} alt={c.name} style={{ width: 24, height: 24, objectFit: 'contain' }} />}
                <span>{c.name}</span>
              </div>
              <span style={{ color: '#9ca3af', fontSize: '0.75rem' }}>#{c.rank} · {c.tier}</span>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }}>No results</div>
          )}
        </div>
      )}
    </div>
  );
}
