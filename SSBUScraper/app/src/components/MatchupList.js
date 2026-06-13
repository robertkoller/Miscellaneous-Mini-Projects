import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { getCategory, CATEGORY_META, CATEGORY_ORDER, findMatchup } from '../utils';
export function MatchupList({ matchups, highlight }) {
    const highlightEntry = highlight ? findMatchup(matchups, highlight) : undefined;
    const valid = matchups.filter(m => m.votes > 0);
    const grouped = {};
    for (const cat of CATEGORY_ORDER) {
        grouped[cat] = [];
    }
    for (const m of valid) {
        grouped[getCategory(m.score)].push(m);
    }
    for (const cat of CATEGORY_ORDER) {
        grouped[cat].sort((a, b) => b.score - a.score);
    }
    return (_jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '1rem' }, children: CATEGORY_ORDER.map(cat => {
            const entries = grouped[cat];
            if (entries.length === 0) {
                return null;
            }
            const meta = CATEGORY_META[cat];
            return (_jsxs("div", { children: [_jsxs("div", { style: {
                            fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.08em', color: meta.color, marginBottom: '0.4rem',
                        }, children: [meta.label, " (", entries.length, ")"] }), _jsx("div", { style: { display: 'flex', flexDirection: 'column', gap: '0.2rem' }, children: entries.map(m => (_jsxs("div", { style: {
                                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                padding: '0.35rem 0.75rem', borderRadius: 7,
                                background: highlightEntry === m ? '#dbeafe' : meta.bg,
                                border: highlightEntry === m ? '1.5px solid #93c5fd' : '1.5px solid transparent',
                                fontWeight: highlightEntry === m ? 700 : 400,
                            }, children: [_jsx("span", { style: { fontSize: '0.85rem', color: '#111827' }, children: m.opponent }), _jsx("span", { style: {
                                        fontSize: '0.82rem', fontWeight: 700, color: meta.color,
                                        minWidth: 32, textAlign: 'right',
                                    }, children: m.score.toFixed(2) })] }, m.opponent))) })] }, cat));
        }) }));
}
