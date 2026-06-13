import { computeStats, getCategory, CATEGORY_META } from '../utils';
import { MatchupList } from './MatchupList';
import type { Character } from '../types';

interface Props {
  character: Character;
  highlightOpponent?: string;
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      background: '#f9fafb', borderRadius: 10, padding: '0.75rem 1rem',
      textAlign: 'center', flex: 1, minWidth: 90,
    }}>
      <div style={{ fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#111827' }}>{value}</div>
    </div>
  );
}

export function CharacterStats({ character, highlightOpponent }: Props) {
  const stats = computeStats(character.matchups);

  const tierColor: Record<string, string> = {
    'S+': '#ef4444', 'S': '#f97316', 'S-': '#f59e0b',
    'A+': '#84cc16', 'A': '#22c55e', 'A-': '#14b8a6',
    'B+': '#3b82f6', 'B-': '#6366f1',
    'C+': '#a855f7', 'C-': '#ec4899',
    'D': '#78716c', 'E': '#9ca3af',
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
        {character.image && (
          <img src={character.image} alt={character.name}
            style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#f3f4f6', flexShrink: 0 }} />
        )}
        <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{character.name}</h2>
        <span style={{
          fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.6rem',
          borderRadius: 99, background: tierColor[character.tier] ?? '#9ca3af',
          color: 'white',
        }}>
          {character.tier}
        </span>
        <span style={{ fontSize: '0.8rem', color: '#9ca3af' }}>Rank #{character.rank}</span>
      </div>

      {character.matchup_error && (
        <div style={{ background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 0.9rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8rem' }}>
          Scrape error — no matchup data available.
        </div>
      )}

      {stats ? (
        <>
          {/* Stat grid */}
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <StatBox label="Avg" value={stats.avg.toFixed(3)} />
            <StatBox label="Median" value={stats.median.toFixed(3)} />
            <StatBox label="Std Dev" value={stats.stdDev.toFixed(3)} />
            <StatBox label="Matchups" value={String(stats.count)} />
          </div>

          {/* Best / Worst */}
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }}>
            {[
              { label: 'Best matchup', entry: stats.best },
              { label: 'Worst matchup', entry: stats.worst },
            ].map(({ label, entry }) => {
              const cat = getCategory(entry.score);
              const meta = CATEGORY_META[cat];
              return (
                <div key={label} style={{
                  flex: 1, background: meta.bg, borderRadius: 10,
                  padding: '0.6rem 0.9rem',
                }}>
                  <div style={{ fontSize: '0.65rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }}>
                    {label}
                  </div>
                  <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>{entry.opponent}</div>
                  <div style={{ fontWeight: 800, color: meta.color, fontSize: '1rem' }}>{entry.score.toFixed(2)}</div>
                </div>
              );
            })}
          </div>

          {/* Matchup list */}
          <div style={{ fontWeight: 700, color: '#374151', marginBottom: '0.6rem', fontSize: '0.85rem' }}>
            All matchups
          </div>
          <MatchupList matchups={character.matchups} highlight={highlightOpponent} />
        </>
      ) : !character.matchup_error ? (
        <div style={{ color: '#9ca3af', fontSize: '0.85rem' }}>No matchup data.</div>
      ) : null}
    </div>
  );
}
