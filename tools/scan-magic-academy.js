#!/usr/bin/env node
/**
 * Magic Academy scanner: maps your local PDFs to the canonical #1–#31 list.
 *
 * Usage:
 *   node tools/scan-magic-academy.js "MAfiles" [--csv out/magic-academy-scan.csv]
 *
 * Notes:
 * - Handles accents/punctuation variants (e.g., “Agresivo, Combo y Control”).
 * - Prints a Have/Missing list and a proposed archive filename per hit.
 */
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
if (!args[0]) {
  console.error("Usage: node tools/scan-magic-academy.js <folder> [--csv out.csv]");
  process.exit(1);
}
const srcDir = args[0];
const csvPath = (() => {
  const i = args.indexOf("--csv");
  return i > -1 ? args[i + 1] : null;
})();

// --- Canonical #1–#31 (best-known ordering/titles) ---
// If we learn a better title later, just tweak this list (numbers are implicit by index).
const CANON = [
  "Your First Tournament",                                // 1
  "Introduction to Mana Base, Part 2",                    // 2 (you have ✅)
  "Your First Sealed Deck",                               // 3
  "What Are the Formats?",                                // 4
  "Ten Beginner Mistakes",                                // 5
  "Card Evaluation",                                      // 6
  "What Is the Metagame?",                                // 7
  "Introducing Sideboards",                               // 8
  "Introduction to Bluffing",                             // 9
  "Introduction to Innovation",                           // 10
  "Introduction to Inevitability",                        // 11
  "Managing Mana Screw",                                  // 12
  "Seven Steps to a Better Mana Base",                    // 13
  "Introduction to Mana Base, Part 1",                    // 14
  "Mana Base Walkthrough",                                // 15
  "Strategies and Techniques for Booster Draft",          // 16
  "Sealed Deck Walkthrough",                              // 17
  "Getting Better at Sealed",                             // 18
  "Playing Against Control",                              // 19
  "Tactical Protocol: Introduction to Information & Resources", // 20
  "Tactical Protocol: Your Own Turn",                     // 21
  "Tactical Protocol: Your Opponent's Turn",              // 22
  "Aggro, Combo, and Control",                            // 23 (aka “Agresivo, Combo y Control”)
  "Lessons Learned",                                      // 24
  // The remaining slots 25–31 are placeholders—adjust if/when we confirm exact titles
  "Placeholder 25",                                       // 25
  "Placeholder 26",                                       // 26
  "Placeholder 27",                                       // 27
  "Placeholder 28",                                       // 28
  "Placeholder 29",                                       // 29
  "Placeholder 30",                                       // 30
  "Placeholder 31"                                        // 31
];

// Map friendly aliases → canonical titles (helps fuzzy match)
const ALIASES = new Map([
  ["agresivo combo y control", "Aggro, Combo, and Control"],
  ["introduccion a la baraja de mana", "Introduction to Mana Base, Part 1"],
  ["introducción a base de mana", "Introduction to Mana Base, Part 1"],
  ["introduction to mana base", "Introduction to Mana Base, Part 1"],
  ["introduction to mana base part 1", "Introduction to Mana Base, Part 1"],
  ["introduction to mana base part 2", "Introduction to Mana Base, Part 2"],
  ["what are the formats", "What Are the Formats?"],
  ["what is the metagame", "What Is the Metagame?"],
  ["tactical protocol introduction to information resources", "Tactical Protocol: Introduction to Information & Resources"],
  ["tactical protocol your opponents turn", "Tactical Protocol: Your Opponent's Turn"],
  ["tactical protocol your own turn", "Tactical Protocol: Your Own Turn"],
]);

function slugify(s) {
  return String(s)
    .toLowerCase()
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/&/g, "and")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Simple fuzzy score: overlap of words
function scoreMatch(query, candidate) {
  const qa = slugify(query).split(/\s+/);
  const ca = slugify(candidate).split(/\s+/);
  const cq = new Set(ca);
  let hit = 0;
  qa.forEach(w => { if (cq.has(w)) hit++; });
  return hit / Math.max(qa.length, ca.length);
}

function bestCanonical(titleLike) {
  const raw = slugify(titleLike);
  const alias = ALIASES.get(raw) || ALIASES.get(raw.replace(/\s+/g, " ")) || null;
  const probe = alias || titleLike;

  let best = { idx: -1, title: "", score: 0 };
  CANON.forEach((t, i) => {
    const s = scoreMatch(probe, t);
    if (s > best.score) best = { idx: i, title: t, score: s };
  });
  return best; // { idx, title, score }
}

function proposeArchiveName(idx, canonTitle) {
  const n = String(idx + 1).padStart(2, "0");
  const base = slugify(canonTitle).replace(/\s+/g, "-");
  return `${n}-${base}.pdf`;
}

// --- Scan source folder
const files = fs.readdirSync(srcDir).filter(f => f.toLowerCase().endsWith(".pdf"));
const rows = [];

files.forEach(f => {
  const full = path.join(srcDir, f);
  const titleLike = path.basename(f, path.extname(f));
  const { idx, title, score } = bestCanonical(titleLike);

  rows.push({
    file: f,
    canonicalIndex: idx >= 0 ? idx + 1 : "",
    canonicalTitle: idx >= 0 ? title : "(unmatched)",
    score: score.toFixed(2),
    proposedArchiveName: idx >= 0 ? proposeArchiveName(idx, title) : ""
  });
});

// Build have/missing against CANON
const have = new Set(rows.filter(r => r.canonicalIndex).map(r => Number(r.canonicalIndex)));
const missing = [];
for (let i = 1; i <= CANON.length; i++) {
  if (!have.has(i)) missing.push({ num: i, title: CANON[i-1] });
}

// --- Output
console.log(`Scanned: ${files.length} PDF(s) in ${srcDir}\n`);

console.log("Have:");
rows
  .filter(r => r.canonicalIndex)
  .sort((a,b) => Number(a.canonicalIndex) - Number(b.canonicalIndex))
  .forEach(r => {
    console.log(
      `  #${String(r.canonicalIndex).padStart(2,"0")}  ${r.canonicalTitle}   —   ${r.file}   (→ ${r.proposedArchiveName}, score ${r.score})`
    );
  });

console.log("\nMissing:");
missing.forEach(m => {
  console.log(`  #${String(m.num).padStart(2,"0")}  ${m.title}`);
});

// Optional CSV
if (csvPath) {
  const header = "file,canonical_index,canonical_title,score,proposed_archive_name\n";
  const body = rows.map(r =>
    [
      JSON.stringify(r.file),
      r.canonicalIndex || "",
      JSON.stringify(r.canonicalTitle),
      r.score,
      JSON.stringify(r.proposedArchiveName)
    ].join(",")
  ).join("\n");
  fs.mkdirSync(path.dirname(csvPath), { recursive: true });
  fs.writeFileSync(csvPath, header + body, "utf8");
  console.log(`\nCSV written: ${csvPath}`);
}