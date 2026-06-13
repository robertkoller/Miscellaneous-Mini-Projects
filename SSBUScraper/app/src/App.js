import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { CharacterSearch } from './components/CharacterSearch';
import { CharacterStats } from './components/CharacterStats';
import { CompareView } from './components/CompareView';
// Import data — run the scraper first to generate this file, then copy to app/src/data/
import matchupsJson from './data/matchups.json';
const ALL_CHARACTERS = matchupsJson.characters ?? [];
export function App() {
    const [mode, setMode] = useState('single');
    const [selected, setSelected] = useState(null);
    const [charA, setCharA] = useState(null);
    const [charB, setCharB] = useState(null);
    const noData = ALL_CHARACTERS.length === 0;
    return (_jsxs("div", { style: { minHeight: '100vh', background: '#f0f2f5', fontFamily: 'system-ui, sans-serif', color: '#111827' }, children: [_jsxs("div", { style: { background: 'white', borderBottom: '1px solid #e5e7eb', padding: '1rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem' }, children: [_jsx("span", { style: { fontWeight: 800, fontSize: '1.3rem', color: '#2563eb' }, children: "SSBU Matchup Explorer" }), _jsx("span", { style: { fontSize: '0.78rem', color: '#9ca3af' }, children: "eventhubs community data" }), _jsx("div", { style: { marginLeft: 'auto', display: 'flex', gap: '0.5rem' }, children: ['single', 'compare'].map(m => (_jsx("button", { onClick: () => setMode(m), style: {
                                padding: '0.4rem 1rem', borderRadius: 8, border: '1.5px solid',
                                borderColor: mode === m ? '#2563eb' : '#e5e7eb',
                                background: mode === m ? '#2563eb' : 'white',
                                color: mode === m ? 'white' : '#374151',
                                fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer',
                            }, children: m === 'single' ? 'Single Character' : 'Compare' }, m))) })] }), _jsx("div", { style: { maxWidth: 1100, margin: '0 auto', padding: '1.5rem' }, children: noData ? (_jsxs("div", { style: {
                        background: 'white', borderRadius: 14, padding: '3rem 2rem', textAlign: 'center',
                        border: '1.5px solid #e5e7eb',
                    }, children: [_jsx("div", { style: { fontSize: '2rem', marginBottom: '0.75rem' }, children: "\u26A0\uFE0F" }), _jsx("h3", { style: { fontWeight: 700, marginBottom: '0.5rem' }, children: "No data yet" }), _jsx("p", { style: { color: '#6b7280', fontSize: '0.9rem' }, children: "Run the scraper first to generate matchups.json:" }), _jsx("code", { style: {
                                display: 'block', marginTop: '0.75rem', background: '#f3f4f6',
                                padding: '0.6rem 1rem', borderRadius: 8, fontSize: '0.85rem', color: '#374151',
                            }, children: "cd SSBU_Scraper && venv/bin/python scraper.py" }), _jsx("p", { style: { color: '#9ca3af', fontSize: '0.8rem', marginTop: '0.5rem' }, children: "Then copy matchups.json into app/src/data/ and restart the dev server." })] })) : mode === 'single' ? (_jsxs("div", { children: [_jsx("div", { style: { background: 'white', borderRadius: 14, padding: '1.25rem', border: '1.5px solid #e5e7eb', marginBottom: '1.25rem' }, children: _jsx(CharacterSearch, { characters: ALL_CHARACTERS, selected: selected, onSelect: setSelected, placeholder: "Search a character\u2026" }) }), selected && (_jsx("div", { style: { background: 'white', borderRadius: 14, padding: '1.5rem', border: '1.5px solid #e5e7eb' }, children: _jsx(CharacterStats, { character: selected }) })), !selected && (_jsx("div", { style: { textAlign: 'center', color: '#9ca3af', padding: '4rem', fontSize: '0.9rem' }, children: "Select a character to see their matchup data." }))] })) : (_jsx("div", { style: { background: 'white', borderRadius: 14, padding: '1.5rem', border: '1.5px solid #e5e7eb' }, children: _jsx(CompareView, { characters: ALL_CHARACTERS, charA: charA, charB: charB, onSelectA: setCharA, onSelectB: setCharB }) })) })] }));
}
