import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { computeStats, getCategory, CATEGORY_META } from '../utils';
import { MatchupList } from './MatchupList';
function StatBox({ label, value }) {
    return (_jsxs("div", { style: {
            background: '#f9fafb', borderRadius: 10, padding: '0.75rem 1rem',
            textAlign: 'center', flex: 1, minWidth: 90,
        }, children: [_jsx("div", { style: { fontSize: '0.65rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }, children: label }), _jsx("div", { style: { fontSize: '1.1rem', fontWeight: 700, color: '#111827' }, children: value })] }));
}
export function CharacterStats({ character, highlightOpponent }) {
    const stats = computeStats(character.matchups);
    const tierColor = {
        'S+': '#ef4444', 'S': '#f97316', 'S-': '#f59e0b',
        'A+': '#84cc16', 'A': '#22c55e', 'A-': '#14b8a6',
        'B+': '#3b82f6', 'B-': '#6366f1',
        'C+': '#a855f7', 'C-': '#ec4899',
        'D': '#78716c', 'E': '#9ca3af',
    };
    return (_jsxs("div", { children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }, children: [character.image && (_jsx("img", { src: character.image, alt: character.name, style: { width: 56, height: 56, objectFit: 'contain', borderRadius: 8, background: '#f3f4f6', flexShrink: 0 } })), _jsx("h2", { style: { fontSize: '1.4rem', fontWeight: 800, color: '#111827' }, children: character.name }), _jsx("span", { style: {
                            fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.6rem',
                            borderRadius: 99, background: tierColor[character.tier] ?? '#9ca3af',
                            color: 'white',
                        }, children: character.tier }), _jsxs("span", { style: { fontSize: '0.8rem', color: '#9ca3af' }, children: ["Rank #", character.rank] })] }), character.matchup_error && (_jsx("div", { style: { background: '#fee2e2', color: '#b91c1c', padding: '0.6rem 0.9rem', borderRadius: 8, marginBottom: '1rem', fontSize: '0.8rem' }, children: "Scrape error \u2014 no matchup data available." })), stats ? (_jsxs(_Fragment, { children: [_jsxs("div", { style: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }, children: [_jsx(StatBox, { label: "Avg", value: stats.avg.toFixed(3) }), _jsx(StatBox, { label: "Median", value: stats.median.toFixed(3) }), _jsx(StatBox, { label: "Std Dev", value: stats.stdDev.toFixed(3) }), _jsx(StatBox, { label: "Matchups", value: String(stats.count) })] }), _jsx("div", { style: { display: 'flex', gap: '0.5rem', marginBottom: '1.25rem' }, children: [
                            { label: 'Best matchup', entry: stats.best },
                            { label: 'Worst matchup', entry: stats.worst },
                        ].map(({ label, entry }) => {
                            const cat = getCategory(entry.score);
                            const meta = CATEGORY_META[cat];
                            return (_jsxs("div", { style: {
                                    flex: 1, background: meta.bg, borderRadius: 10,
                                    padding: '0.6rem 0.9rem',
                                }, children: [_jsx("div", { style: { fontSize: '0.65rem', color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, marginBottom: 3 }, children: label }), _jsx("div", { style: { fontWeight: 700, color: '#111827', fontSize: '0.9rem' }, children: entry.opponent }), _jsx("div", { style: { fontWeight: 800, color: meta.color, fontSize: '1rem' }, children: entry.score.toFixed(2) })] }, label));
                        }) }), _jsx("div", { style: { fontWeight: 700, color: '#374151', marginBottom: '0.6rem', fontSize: '0.85rem' }, children: "All matchups" }), _jsx(MatchupList, { matchups: character.matchups, highlight: highlightOpponent })] })) : !character.matchup_error ? (_jsx("div", { style: { color: '#9ca3af', fontSize: '0.85rem' }, children: "No matchup data." })) : null] }));
}
