import { useState } from 'react';
import type { Character } from './types';
import { CharacterSearch } from './components/CharacterSearch';
import { CharacterStats } from './components/CharacterStats';
import { CompareView } from './components/CompareView';

// Import data — run the scraper first to generate this file, then copy to app/src/data/
import matchupsJson from './data/matchups.json';
const ALL_CHARACTERS: Character[] = (matchupsJson as { characters: Character[] }).characters ?? [];

type Mode = 'single' | 'compare';

export function App() {
  const [mode, setMode] = useState<Mode>('single');
  const [selected, setSelected] = useState<Character | null>(null);
  const [charA, setCharA] = useState<Character | null>(null);
  const [charB, setCharB] = useState<Character | null>(null);

  const noData = ALL_CHARACTERS.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif', color: '#111827' }}>
      {/* Header */}
      <div style={{ background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span style={{ fontWeight: 800, fontSize: '1.3rem', color: '#2563eb' }}>SSBU Matchup Explorer</span>
        <span style={{ fontSize: '0.78rem', color: '#9ca3af' }}>eventhubs community data</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '0.5rem' }}>
          {(['single', 'compare'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                padding: '0.4rem 1rem', borderRadius: 8, border: '1.5px solid',
                borderColor: mode === m ? '#2563eb' : '#e5e7eb',
                background: mode === m ? '#2563eb' : 'white',
                color: mode === m ? 'white' : '#374151',
                fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
              }}
            >
              {m === 'single' ? 'Single Character' : 'Compare'}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }}>
        {noData ? (
          <div style={{
            background: 'white', borderRadius: 14, padding: '3rem 2rem', textAlign: 'center',
            border: '1.5px solid #e5e7eb',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>⚠️</div>
            <h3 style={{ fontWeight: 700, marginBottom: '0.5rem' }}>No data yet</h3>
            <p style={{ color: '#6b7280', fontSize: '0.9rem' }}>
              Run the scraper first to generate matchups.json:
            </p>
            <code style={{
              display: 'block', marginTop: '0.75rem', background: '#f3f4f6',
              padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.85rem', color: '#374151',
            }}>
              cd SSBU_Scraper && venv/bin/python scraper.py
            </code>
            <p style={{ color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }}>
              Then copy matchups.json into app/src/data/ and restart the dev server.
            </p>
          </div>
        ) : mode === 'single' ? (
          <div>
            <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb', marginBottom: '1.25rem' }}>
              <CharacterSearch
                characters={ALL_CHARACTERS}
                selected={selected}
                onSelect={setSelected}
                placeholder="Search a character…"
              />
            </div>
            {selected && (
              <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1.5px solid #e5e7eb' }}>
                <CharacterStats character={selected} />
              </div>
            )}
            {!selected && (
              <div style={{ textAlign: 'center', color: '#9ca3af', padding: '4rem', fontSize: '0.9rem' }}>
                Select a character to see their matchup data.
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'white', borderRadius: 14, padding: '1.5rem', border: '1.5px solid #e5e7eb' }}>
            <CompareView
              characters={ALL_CHARACTERS}
              charA={charA}
              charB={charB}
              onSelectA={setCharA}
              onSelectB={setCharB}
            />
          </div>
        )}
      </div>
    </div>
  );
}
