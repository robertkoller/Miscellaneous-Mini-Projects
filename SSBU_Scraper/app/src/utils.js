export function computeStats(matchups) {
    const valid = matchups.filter(m => m.votes > 0);
    if (valid.length === 0) {
        return null;
    }
    const scores = valid.map(m => m.score);
    const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((a, b) => a + (b - avg) ** 2, 0) / scores.length;
    const stdDev = Math.sqrt(variance);
    const sorted = [...scores].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 === 0
        ? (sorted[mid - 1] + sorted[mid]) / 2
        : sorted[mid];
    const best = valid.reduce((a, b) => b.score > a.score ? b : a);
    const worst = valid.reduce((a, b) => b.score < a.score ? b : a);
    return { avg, stdDev, median, best, worst, count: valid.length };
}
export function getCategory(score) {
    if (score >= 6.2) {
        return 'strong-adv';
    }
    if (score >= 5.6) {
        return 'decent-adv';
    }
    if (score >= 5.2) {
        return 'small-adv';
    }
    if (score >= 4.8) {
        return 'even';
    }
    if (score >= 4.4) {
        return 'small-dis';
    }
    if (score >= 3.8) {
        return 'decent-dis';
    }
    return 'strong-dis';
}
export const CATEGORY_META = {
    'strong-adv': { label: 'Strong Advantage', color: '#16a34a', bg: '#dcfce7' },
    'decent-adv': { label: 'Decent Advantage', color: '#15803d', bg: '#bbf7d0' },
    'small-adv': { label: 'Small Advantage', color: '#4d7c0f', bg: '#d9f99d' },
    'even': { label: 'Even', color: '#374151', bg: '#f3f4f6' },
    'small-dis': { label: 'Small Disadvantage', color: '#b45309', bg: '#fef3c7' },
    'decent-dis': { label: 'Decent Disadvantage', color: '#c2410c', bg: '#ffedd5' },
    'strong-dis': { label: 'Strong Disadvantage', color: '#b91c1c', bg: '#fee2e2' },
};
export const CATEGORY_ORDER = [
    'strong-adv', 'decent-adv', 'small-adv', 'even', 'small-dis', 'decent-dis', 'strong-dis',
];
// Eventhubs groups some characters on shared pages under a combined name.
// Maps ssbwiki character name (lowercase) → eventhubs opponent string (lowercase).
const OPPONENT_NAME_MAP = {
    'simon': 'simon / richter',
    'richter': 'simon / richter',
    'peach': 'peach / daisy',
    'daisy': 'peach / daisy',
    'pit': 'pit / dark pit',
    'dark pit': 'pit / dark pit',
    'samus': 'samus / dark samus',
    'dark samus': 'samus / dark samus',
    'pokémon trainer': 'pokemon trainer',
    'banjo & kazooie': 'banjo-kazooie',
    'mr. game & watch': 'mr. game and watch',
    'pyra/mythra': 'pyra / mythra',
};
export function findMatchup(matchups, opponentName) {
    const key = opponentName.toLowerCase();
    const lookup = OPPONENT_NAME_MAP[key] ?? key;
    return matchups.find(m => m.opponent.toLowerCase() === lookup);
}
// Returns 0-100 percentile: what % of matchups score <= given score
export function getPercentile(matchups, score) {
    const scores = matchups.filter(m => m.votes > 0).map(m => m.score);
    if (scores.length === 0) {
        return 0;
    }
    const below = scores.filter(s => s <= score).length;
    return Math.round((below / scores.length) * 100);
}
// Rank position (1 = highest score) of a given score in a matchup list
export function getRank(matchups, score) {
    const scores = matchups.filter(m => m.votes > 0).map(m => m.score).sort((a, b) => b - a);
    const rank = scores.findIndex(s => s <= score) + 1;
    return { rank: rank === 0 ? scores.length : rank, total: scores.length };
}
