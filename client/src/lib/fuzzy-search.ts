/**
 * Smart fuzzy search that handles:
 * - Typos (extra/missing/swapped letters)
 * - Plural forms (pastel → pasteles, rol → roles)
 * - Accent-insensitive matching
 * - Partial matching
 */

// Remove accents/diacritics
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Simple Levenshtein distance
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,      // deletion
        dp[i][j - 1] + 1,      // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }
  return dp[m][n];
}

// Generate singular/plural variants for Spanish
function getVariants(word: string): string[] {
  const variants = [word];

  // If ends in 's', try without it (plural → singular)
  if (word.endsWith("es")) {
    variants.push(word.slice(0, -2)); // pasteles → pastel
    variants.push(word.slice(0, -1)); // roles → role (just in case)
  } else if (word.endsWith("s")) {
    variants.push(word.slice(0, -1)); // postres → postre
  }

  // If doesn't end in 's', try adding it (singular → plural)
  if (!word.endsWith("s")) {
    variants.push(word + "s");   // pastel → pastels
    variants.push(word + "es");  // pastel → pasteles
  }

  // Common Spanish diminutives/augmentatives
  if (word.endsWith("ito") || word.endsWith("ita")) {
    variants.push(word.slice(0, -3)); // cafecito → cafec → not great, but helps
  }

  return variants;
}

/**
 * Check if a query fuzzy-matches a target string.
 * Returns a score from 0 (no match) to 1 (perfect match).
 */
function fuzzyScore(query: string, target: string): number {
  const nq = normalize(query);
  const nt = normalize(target);

  // Exact match
  if (nt === nq) return 1;

  // Target contains query as substring
  if (nt.includes(nq)) return 0.9;

  // Query contains target as substring (searching a longer term)
  if (nq.includes(nt)) return 0.7;

  // Word-level matching: check each word in query against words in target
  const queryWords = nq.split(/\s+/).filter(w => w.length > 0);
  const targetWords = nt.split(/\s+/).filter(w => w.length > 0);

  let totalScore = 0;
  let matchedWords = 0;

  for (const qw of queryWords) {
    let bestWordScore = 0;
    const qVariants = getVariants(qw);

    for (const tw of targetWords) {
      const tVariants = getVariants(tw);

      for (const qv of qVariants) {
        for (const tv of tVariants) {
          // Substring check
          if (tv.includes(qv) || qv.includes(tv)) {
            bestWordScore = Math.max(bestWordScore, 0.85);
          }

          // Starts with
          if (tv.startsWith(qv) || qv.startsWith(tv)) {
            bestWordScore = Math.max(bestWordScore, 0.88);
          }

          // Levenshtein for typo tolerance
          const maxLen = Math.max(qv.length, tv.length);
          if (maxLen > 0) {
            const dist = levenshtein(qv, tv);
            const threshold = Math.max(1, Math.floor(maxLen * 0.35)); // Allow ~35% errors
            if (dist <= threshold) {
              const score = 1 - (dist / maxLen);
              bestWordScore = Math.max(bestWordScore, score * 0.8);
            }
          }
        }
      }
    }

    if (bestWordScore > 0) matchedWords++;
    totalScore += bestWordScore;
  }

  if (queryWords.length === 0) return 0;

  // Weight: partial matches count, but all words matching is better
  const avgScore = totalScore / queryWords.length;
  const coverage = matchedWords / queryWords.length;

  return avgScore * (0.5 + 0.5 * coverage);
}

export interface SearchableProduct {
  id: number;
  name: string;
  description: string;
  category: string;
  [key: string]: any;
}

/**
 * Filter and rank products by fuzzy search query.
 * Returns products sorted by relevance.
 */
export function fuzzySearchProducts<T extends SearchableProduct>(
  products: T[],
  query: string,
  minScore = 0.3
): T[] {
  if (!query || query.trim().length === 0) return products;

  const scored = products
    .map((product) => {
      const nameScore = fuzzyScore(query, product.name);
      const categoryScore = fuzzyScore(query, product.category) * 0.8;
      const descScore = fuzzyScore(query, product.description) * 0.5;
      const bestScore = Math.max(nameScore, categoryScore, descScore);
      return { product, score: bestScore };
    })
    .filter(({ score }) => score >= minScore)
    .sort((a, b) => b.score - a.score);

  return scored.map(({ product }) => product);
}
