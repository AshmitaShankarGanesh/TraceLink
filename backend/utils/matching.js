const Fuse = require('fuse.js');

/**
 * TraceLink matching engine — weighted similarity between lost/found items.
 *
 * Weights (must sum to 1):
 * - Tags: 50%
 * - Title + description text: 30%
 * - Location (city + area): 20%
 *
 * Each component returns 0–100; final score is 0–100.
 */

const WEIGHT_TAGS = 0.5;
const WEIGHT_TEXT = 0.3;
const WEIGHT_LOCATION = 0.2;

/** Common English stopwords — removed for keyword overlap scoring */
const STOPWORDS = new Set([
  'a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
  'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been', 'be', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must',
  'this', 'that', 'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they',
  'my', 'your', 'his', 'her', 'its', 'our', 'their', 'me', 'him', 'them',
  'what', 'which', 'who', 'when', 'where', 'why', 'how', 'all', 'each', 'every',
  'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not',
  'only', 'own', 'same', 'so', 'than', 'too', 'very', 'just', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'once', 'here', 'there', 'any', 'if', 'because', 'until', 'while',
  'lost', 'found', 'item', 'items', 'please', 'help', 'thanks',
]);

/**
 * Jaccard similarity for two sets: |A ∩ B| / |A ∪ B|. Returns 0–100.
 */
function jaccardPercent(setA, setB) {
  if (setA.size === 0 && setB.size === 0) return null;
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const x of setA) {
    if (setB.has(x)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;
  return (intersection / union) * 100;
}

function normalizeTagSet(tags) {
  if (!tags || !Array.isArray(tags)) return new Set();
  return new Set(
    tags
      .map((t) => String(t).toLowerCase().trim())
      .filter((t) => t.length > 0)
  );
}

/**
 * Tag similarity (primary signal).
 * Uses Jaccard on normalized tag sets.
 * - Both empty → neutral 50 (no positive/negative signal).
 * - One empty, one not → 0 (mismatch).
 * - Otherwise → Jaccard × 100.
 */
function calculateTagScore(tags1, tags2) {
  const a = normalizeTagSet(tags1);
  const b = normalizeTagSet(tags2);

  if (a.size === 0 && b.size === 0) return 50;
  if (a.size === 0 || b.size === 0) return 0;

  const j = jaccardPercent(a, b);
  return j === null ? 50 : Math.round(j * 100) / 100;
}

function tokenizeForOverlap(text) {
  if (!text || typeof text !== 'string') return new Set();
  const words = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
  return new Set(words);
}

/**
 * Title + description similarity: keyword overlap (Jaccard on word sets).
 * Case-insensitive; stopwords stripped.
 * If both sides have no keywords after filtering → 50 (neutral).
 */
function calculateTextScore(text1, text2) {
  const a = tokenizeForOverlap(text1 || '');
  const b = tokenizeForOverlap(text2 || '');

  if (a.size === 0 && b.size === 0) return 50;
  if (a.size === 0 || b.size === 0) return 0;

  const j = jaccardPercent(a, b);
  const jaccardScore = j === null ? 50 : j;

  // Fuse-based fuzzy overlap: allows near-matches such as "backpack" ~ "bagpack".
  const bTokens = Array.from(b);
  const fuse = new Fuse(bTokens.map((token) => ({ token })), {
    includeScore: true,
    threshold: 0.35,
    keys: ['token'],
    ignoreLocation: true,
  });

  let fuzzyHits = 0;
  for (const token of a) {
    const results = fuse.search(token, { limit: 1 });
    if (results.length > 0) {
      const best = results[0];
      const normalized = 1 - (best.score || 1);
      if (normalized >= 0.55) fuzzyHits += 1;
    }
  }

  const denom = Math.max(a.size, b.size) || 1;
  const fuzzyScore = (fuzzyHits / denom) * 100;

  // Blend exact overlap with fuzzy overlap for stronger text matching.
  const blended = 0.6 * jaccardScore + 0.4 * fuzzyScore;
  return Math.round(blended * 100) / 100;
}

function normalizeLocationBlob(loc) {
  if (!loc) return '';
  const city = typeof loc === 'object' && loc.city != null ? String(loc.city) : '';
  const area = typeof loc === 'object' && loc.area != null ? String(loc.area) : '';
  const combined = `${city} ${area}`.trim();
  return combined
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Location similarity: substring / containment plus word-level Jaccard on the same blob.
 * Handles partial phrases like "Block C" vs "Near Block C".
 */
function calculateLocationScore(loc1, loc2) {
  const s1 = normalizeLocationBlob(loc1);
  const s2 = normalizeLocationBlob(loc2);

  if (!s1 && !s2) return 50;
  if (!s1 || !s2) return 25;

  if (s1 === s2) return 100;

  const longer = s1.length >= s2.length ? s1 : s2;
  const shorter = s1.length >= s2.length ? s2 : s1;
  if (shorter.length >= 3 && longer.includes(shorter)) {
    return 90;
  }

  const wa = new Set(longer.split(' ').filter((w) => w.length > 1));
  const wb = new Set(shorter.split(' ').filter((w) => w.length > 1));
  const j = jaccardPercent(wa, wb);
  const base = j === null ? 0 : j;
  return Math.round(Math.min(100, base + 5) * 100) / 100;
}

/**
 * Full weighted match score between two item-shaped objects.
 * Expects: tags[], title, description, location{ city, area }.
 */
function getMatchScore(itemA, itemB) {
  const tags = calculateTagScore(itemA.tags, itemB.tags);
  const text = calculateTextScore(
    `${itemA.title || ''} ${itemA.description || ''}`,
    `${itemB.title || ''} ${itemB.description || ''}`
  );
  const location = calculateLocationScore(itemA.location, itemB.location);

  const raw =
    WEIGHT_TAGS * tags + WEIGHT_TEXT * text + WEIGHT_LOCATION * location;
  const score = Math.round(Math.min(100, Math.max(0, raw)));

  return {
    score,
    breakdown: {
      tags: Math.round(tags * 100) / 100,
      text: Math.round(text * 100) / 100,
      location: Math.round(location * 100) / 100,
    },
  };
}

function getMatchCategory(score) {
  if (score >= 80) return 'High';
  if (score >= 50) return 'Medium';
  return 'Low';
}

module.exports = {
  calculateTagScore,
  calculateTextScore,
  calculateLocationScore,
  getMatchScore,
  getMatchCategory,
};

