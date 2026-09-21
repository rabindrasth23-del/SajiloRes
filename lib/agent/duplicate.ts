import "server-only";

import { haversine } from "@/lib/geo/haversine";

// English stopwords for Jaccard calculation
const STOPWORDS = new Set([
  "a", "an", "the", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "do", "does", "did", "will", "would", "shall",
  "should", "may", "might", "must", "can", "could", "of", "in", "to",
  "for", "with", "on", "at", "from", "by", "about", "as", "into",
  "through", "during", "before", "after", "above", "below", "between",
  "out", "off", "over", "under", "again", "further", "then", "once",
  "and", "but", "or", "nor", "not", "no", "so", "very", "too", "also",
  "just", "than", "that", "this", "it", "its", "i", "me", "my", "we",
  "our", "you", "your", "he", "him", "his", "she", "her", "they",
  "them", "their", "what", "which", "who", "whom", "where", "when",
  "how", "all", "each", "every", "both", "few", "more", "most", "other",
  "some", "such", "only", "own", "same", "there", "here", "up", "down",
]);

/**
 * Tokenize and strip stopwords from text.
 * Returns a Set of lowercased content tokens.
 */
export function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/**
 * Jaccard similarity between two texts.
 * Returns value in [0, 1].
 */
export function jaccardSimilarity(textA: string, textB: string): number {
  const setA = tokenize(textA);
  const setB = tokenize(textB);

  if (setA.size === 0 && setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }

  const union = setA.size + setB.size - intersection;
  if (union === 0) return 0;

  return intersection / union;
}

export interface DuplicateCandidate {
  id: string;
  incidentType: string | null;
  rawText: string;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
}

export interface DuplicateMatch {
  id: string;
  similarityScore: number;
  reason: string;
}

/**
 * Run the TRD §5.1 duplicate heuristic on a set of candidates.
 *
 * A candidate is a possible duplicate if ALL of:
 * 1. Same incident_type (or both "other")
 * 2. Haversine ≤ DUPLICATE_RADIUS_M, OR both have no location
 * 3. created_at within DUPLICATE_WINDOW_MIN
 * 4. Jaccard token overlap ≥ 0.35
 */
export function runDuplicateHeuristic(
  incident: {
    id: string;
    incidentType: string | null;
    rawText: string;
    latitude: number | null;
    longitude: number | null;
    createdAt: string;
  },
  candidates: DuplicateCandidate[],
  radiusM: number,
  windowMin: number
): DuplicateMatch[] {
  const matches: DuplicateMatch[] = [];
  const incidentTime = new Date(incident.createdAt).getTime();

  for (const candidate of candidates) {
    if (candidate.id === incident.id) continue;

    // 1. Same incident_type
    const incType = incident.incidentType || "other";
    const candType = candidate.incidentType || "other";
    if (incType !== candType) continue;

    // 2. Location check
    const incHasLoc =
      incident.latitude != null && incident.longitude != null;
    const candHasLoc =
      candidate.latitude != null && candidate.longitude != null;

    if (incHasLoc && candHasLoc) {
      const dist = haversine(
        incident.latitude!,
        incident.longitude!,
        candidate.latitude!,
        candidate.longitude!
      );
      if (dist > radiusM) continue;
    } else if (incHasLoc || candHasLoc) {
      // One has location, other doesn't — not a location match
      continue;
    }
    // Both no location — passes location criterion

    // 3. Time window
    const candTime = new Date(candidate.createdAt).getTime();
    const diffMin = Math.abs(incidentTime - candTime) / 60_000;
    if (diffMin > windowMin) continue;

    // 4. Text similarity
    const similarity = jaccardSimilarity(incident.rawText, candidate.rawText);
    if (similarity < 0.35) continue;

    matches.push({
      id: candidate.id,
      similarityScore: Math.round(similarity * 100) / 100,
      reason: `type=${incType}, similarity=${similarity.toFixed(2)}, time_diff=${Math.round(diffMin)}min`,
    });
  }

  return matches;
}
