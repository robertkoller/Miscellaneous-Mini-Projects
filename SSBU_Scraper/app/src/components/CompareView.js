import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getCategory, CATEGORY_META, getRank, findMatchup } from '../utils';
import { CharacterStats } from './CharacterStats';
import { CharacterSearch } from './CharacterSearch';
function HeadToHeadScore({ char, opponent }) {
    const entry = findMatchup(char.matchups, opponent.name);
    if (!entry) {
        return (_jsx("div", { style: { textAlign: 'center', color: '#9ca3af', fontSize: '0.85rem' }, children: "No direct matchup data" }));
    }
    const cat = getCategory(entry.score);
    const meta = CATEGORY_META[cat];
    const { rank, total } = getRank(char.matchups, entry.score);
    const pct = Math.round(((total - rank + 1) / total) * 100);
    return (_jsxs("div", { style: {
            background: meta.bg, borderRadius: 12, padding: '0.9rem 1.2rem', textAlign: 'center',
        }, children: [_jsxs("div", { style: { fontSize: '0.65rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 700 }, children: [char.name, " vs ", opponent.name] }), _jsx("div", { style: { fontSize: '2rem', fontWeight: 900, color: meta.color, lineHeight: 1.2 }, children: entry.score.toFixed(2) }), _jsx("div", { style: { fontSize: '0.75rem', color: meta.color, fontWeight: 600 }, children: meta.label }), _jsxs("div", { style: { fontSize: '0.72rem', color: '#6b7280', marginTop: 6 }, children: ["#", rank, " of ", total, " in ", char.name, "'s chart \u2014 ", pct, "th percentile"] })] }));
}
export function CompareView({ characters, charA, charB, onSelectA, onSelectB }) {
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '1rem', alignItems: 'center', marginBottom: '1.5rem' }, children: [_jsx(CharacterSearch, { characters: characters, selected: charA, onSelect: onSelectA, placeholder: "Character A\u2026" }), _jsx("span", { style: { fontWeight: 800, color: '#9ca3af', fontSize: '1.1rem' }, children: "vs" }), _jsx(CharacterSearch, { characters: characters, selected: charB, onSelect: onSelectB, placeholder: "Character B\u2026" })] }), charA && charB && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }, children: [_jsx(HeadToHeadScore, { char: charA, opponent: charB }), _jsx(HeadToHeadScore, { char: charB, opponent: charA })] })), (charA || charB) && (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }, children: [_jsx("div", { style: { background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }, children: charA
                            ? _jsx(CharacterStats, { character: charA, highlightOpponent: charB?.name })
                            : _jsx("div", { style: { color: '#9ca3af', textAlign: 'center', padding: '2rem' }, children: "Select character A" }) }), _jsx("div", { style: { background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb' }, children: charB
                            ? _jsx(CharacterStats, { character: charB, highlightOpponent: charA?.name })
                            : _jsx("div", { style: { color: '#9ca3af', textAlign: 'center', padding: '2rem' }, children: "Select character B" }) })] }))] }));
}
