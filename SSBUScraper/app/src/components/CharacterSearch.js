import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useRef, useEffect } from 'react';
export function CharacterSearch({ characters, selected, onSelect, placeholder = 'Search character…' }) {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const ref = useRef(null);
    const filtered = query.trim()
        ? characters.filter(c => c.name.toLowerCase().includes(query.toLowerCase()))
        : characters;
    useEffect(() => {
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);
    function handleSelect(c) {
        onSelect(c);
        setQuery('');
        setOpen(false);
    }
    return (_jsxs("div", { ref: ref, style: { position: 'relative', width: '100%' }, children: [_jsxs("div", { onClick: () => setOpen(o => !o), style: {
                    padding: '0.6rem 1rem', border: '2px solid #e5e7eb', borderRadius: 10,
                    background: 'white', cursor: 'pointer', display: 'flex',
                    alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem',
                    fontSize: '0.9rem', fontWeight: selected ? 600 : 400,
                    color: selected ? '#111827' : '#9ca3af',
                }, children: [_jsx("span", { children: selected ? `${selected.name} (${selected.tier})` : placeholder }), _jsx("span", { style: { color: '#9ca3af' }, children: open ? '▲' : '▼' })] }), open && (_jsxs("div", { style: {
                    position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 100,
                    background: 'white', border: '1.5px solid #e5e7eb', borderRadius: 10,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.12)', maxHeight: 300, overflow: 'auto',
                }, children: [_jsx("div", { style: { padding: '0.5rem' }, children: _jsx("input", { autoFocus: true, value: query, onChange: e => setQuery(e.target.value), placeholder: "Type to filter\u2026", style: {
                                width: '100%', padding: '0.4rem 0.6rem', border: '1.5px solid #e5e7eb',
                                borderRadius: 7, fontSize: '0.85rem', outline: 'none',
                            } }) }), filtered.map(c => (_jsxs("div", { onMouseDown: () => handleSelect(c), style: {
                            padding: '0.5rem 1rem', cursor: 'pointer', fontSize: '0.85rem',
                            display: 'flex', justifyContent: 'space-between',
                            background: selected?.name === c.name ? '#eff6ff' : undefined,
                            color: selected?.name === c.name ? '#2563eb' : '#111827',
                        }, onMouseEnter: e => { e.currentTarget.style.background = '#f9fafb'; }, onMouseLeave: e => { e.currentTarget.style.background = selected?.name === c.name ? '#eff6ff' : ''; }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: '0.5rem' }, children: [c.image && _jsx("img", { src: c.image, alt: c.name, style: { width: 24, height: 24, objectFit: 'contain' } }), _jsx("span", { children: c.name })] }), _jsxs("span", { style: { color: '#9ca3af', fontSize: '0.75rem' }, children: ["#", c.rank, " \u00B7 ", c.tier] })] }, c.name))), filtered.length === 0 && (_jsx("div", { style: { padding: '0.75rem 1rem', color: '#9ca3af', fontSize: '0.85rem' }, children: "No results" }))] }))] }));
}
