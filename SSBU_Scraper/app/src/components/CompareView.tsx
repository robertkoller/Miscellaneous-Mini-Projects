import { getCategory, CATEGORY_META, getRank, findMatchup } from '../utils';
import { CharacterStats } from './CharacterStats';
import { CharacterSearch } from './CharacterSearch';
import type { Character } from '../types';

interface Props {
  characters: Character[];
  charA: Character | null;
  charB: Character | null;
  onSelectA: (c: Character) => void;
  onSelectB: (c: Character) => void;
}

function HeadToHeadScore({ char, opponent }: { char: Character; opponent: Character }) {
  const entry = findMatchup(char.matchups, opponent.name);
  if (!entry) {
    return (
      <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }}>
        No direct matchup data
      </div>
    );
  }

  const cat = getCategory(entry.score);
  const meta = CATEGORY_META[cat];
  const { rank, total } = getRank(char.matchups, entry.score);
  const pct = Math.round(((total - rank + 1) / total) * 100);

  return (
    <div style={{
      background: meta.bg, borderRadius: 12, padding: '0.9rem 1.2rem', textAlign: 'center',
    }}>
      <div style={{ fontSize: '0.65rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }}>
        {char.name} vs {opponent.name}
      </div>
      <div style={{ fontSize: '2rem', fontWeight: 900, color: meta.color, lineHeight: 1.2 }}>
        {entry.score.toFixed(2)}
      </div>
      <div style={{ fontSize: '0.75rem', color: meta.color, fontWeight: 600 }}>
        {meta.label}
      </div>
      <div style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: 6 }}>
        #{rank} of {total} in {char.name}'s chart — {pct}th percentile
      </div>
    </div>
  );
}

export function CompareView({ characters, charA, charB, onSelectA, onSelectB }: Props) {
  return (
    <div>
      {/* Selectors */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <CharacterSearch characters={characters} selected={charA} onSelect={onSelectA} placeholder="Character A…" />
        <span style={{ fontWeight: 800, color: '#9ca3af', fontSize: '1.1rem' }}>vs</span>
        <CharacterSearch characters={characters} selected={charB} onSelect={onSelectB} placeholder="Character B…" />
      </div>

      {/* Head-to-head */}
      {charA && charB && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
          <HeadToHeadScore char={charA} opponent={charB} />
          <HeadToHeadScore char={charB} opponent={charA} />
        </div>
      )}

      {/* Side by side character stats */}
      {(charA || charB) && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }}>
            {charA
              ? <CharacterStats character={charA} highlightOpponent={charB?.name} />
              : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>Select character A</div>
            }
          </div>
          <div style={{ background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }}>
            {charB
              ? <CharacterStats character={charB} highlightOpponent={charA?.name} />
              : <div style={{ color: '#9ca3af', textAlign: 'center', padding: '2rem' }}>Select character B</div>
            }
          </div>
        </div>
      )}
    </div>
  );
}
