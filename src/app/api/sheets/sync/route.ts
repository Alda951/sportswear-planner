import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

const SHEET_ID = "1qLUmtg8aPz9aO2vL83E6XRrC2sO7vMihH7133FKjGbI";
const CSV_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv`;

// Products seeded by hand (live in the sheet's merged top block — can't be parsed via CSV).
// Never auto-delete these even if they don't appear in sheet rows.
const SEED_ONLY_IDS = new Set([
  "hockey-premium-jersey",
  "new-womens-v-neck-cut",
  "mock-neck-flag-jersey",
  "crewneck-flag-jersey",
  "flag-football-shorts",
]);

// Colors by category
const CATEGORY_COLORS: Record<string, string> = {
  uniform:     "#0891b2",
  tracksuit:   "#8b5cf6",
  compression: "#06b6d4",
};
function categoryColor(cat: string) {
  return CATEGORY_COLORS[cat.trim().toLowerCase()] ?? "#f97316";
}

// Map sheet status text → ProductStatus enum
function mapStatus(raw: string): "IN_DEVELOPMENT" | "IN_MANUFACTURE" | "IN_REVIEW" | "LAUNCHED" {
  const s = raw.toLowerCase();
  if (s.includes("launched") || s.includes("done") || s.includes("complete")) return "LAUNCHED";
  if (s.includes("review")   || s.includes("confirm") || s.includes("awaiting")) return "IN_REVIEW";
  if (s.includes("manufactur") || s.includes("samples") || s.includes("sending") || s.includes("production")) return "IN_MANUFACTURE";
  return "IN_DEVELOPMENT";
}

// Valid sport names
const VALID_SPORTS = new Set([
  "Hockey","Basketball","Football","Flag Football",
  "Volleyball","Soccer","Track & Field","Running",
  "Lacrosse","Rugby","Baseball",
]);
function normalizeSport(raw: string): string | null {
  if (!raw || raw.toLowerCase() === "all" || !raw.trim()) return null;
  for (const s of VALID_SPORTS) {
    if (raw.trim().toLowerCase() === s.toLowerCase()) return s;
  }
  return null;
}

function parseDate(raw: string): Date | null {
  if (!raw || raw.toLowerCase() === "tba" || !raw.trim()) return null;
  const d = new Date(raw.trim());
  return isNaN(d.getTime()) ? null : d;
}

// Deterministic slug from product name — guarantees idempotent upserts
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")       // remove apostrophes
    .replace(/[^a-z0-9]+/g, "-") // non-alphanumeric → dash
    .replace(/^-+|-+$/g, "");    // trim leading/trailing dashes
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let inQuote = false;
  let cur = "";
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"' && !inQuote)  { inQuote = true; continue; }
    if (ch === '"' && inQuote)   {
      if (line[i + 1] === '"')   { cur += '"'; i++; }
      else inQuote = false;
      continue;
    }
    if (ch === "," && !inQuote)  { cells.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  cells.push(cur.trim());
  return cells;
}

export async function POST() {
  try {
    const res = await fetch(`${CSV_URL}&t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return NextResponse.json({ error: "Failed to fetch Google Sheet" }, { status: 500 });

    const csv = await res.text();
    if (!csv.trim()) return NextResponse.json({ error: "Sheet is empty" }, { status: 500 });

    const lines = csv.trim().split("\n");

    // ── Step 1: parse clean rows ──────────────────────────────────────────────
    interface SheetRow {
      slug:       string;
      name:       string;
      category:   string;
      sport:      string | null;
      status:     "IN_DEVELOPMENT" | "IN_MANUFACTURE" | "IN_REVIEW" | "LAUNCHED";
      targetDate: Date | null;
      color:      string;
    }

    const sheetRows: SheetRow[] = [];
    const seenSlugs = new Set<string>();

    for (const line of lines) {
      const cells = parseCsvLine(line);
      if (cells.length < 2) continue;

      const [nameCell, catCell = "", sportCell = "", statusCell = "", dateCell = ""] = cells;
      const name = nameCell.trim();

      // Skip header rows, empty rows, or section-label rows
      if (!name) continue;
      if (name.toUpperCase().startsWith("PRODUCT NAME")) continue;
      if (name.toUpperCase().startsWith("CATEGORY"))     continue;
      // Skip rows where the name looks like a pure header (all caps, no spaces typical of data)
      if (name === name.toUpperCase() && !name.includes(" ") && name.length < 4) continue;

      const slug = toSlug(name);
      if (!slug || seenSlugs.has(slug)) continue; // deduplicate within same sheet fetch
      seenSlugs.add(slug);

      sheetRows.push({
        slug,
        name,
        category:   catCell.trim() || "Uniform",
        sport:      normalizeSport(sportCell),
        status:     mapStatus(statusCell),
        targetDate: parseDate(dateCell),
        color:      categoryColor(catCell || "Uniform"),
      });
    }

    // ── Step 2: upsert every row — create if new, update if exists ────────────
    // Each row is processed independently — one failure never blocks the others.
    let created = 0;
    let updated = 0;
    const errors: string[] = [];

    for (const row of sheetRows) {
      try {
        // Find by name (case-insensitive) in case the product has a different ID
        const existing = await prisma.product.findFirst({
          where: { name: { equals: row.name, mode: "insensitive" } },
        });

        if (existing) {
          await prisma.product.update({
            where: { id: existing.id },
            data: {
              category:   row.category,
              sport:      row.sport,
              status:     row.status,
              targetDate: row.targetDate,
              color:      row.color,
            },
          });
          updated++;
        } else {
          // New product — deterministic slug ID guarantees no duplicates on re-sync
          await prisma.product.create({
            data: {
              id:         row.slug,
              name:       row.name,
              emoji:      "",
              category:   row.category,
              sport:      row.sport,
              status:     row.status,
              targetDate: row.targetDate,
              color:      row.color,
            },
          });
          created++;
        }
      } catch (rowErr: any) {
        console.error(`Sync error for "${row.name}":`, rowErr.message);
        errors.push(row.name);
      }
    }

    // ── Step 3: delete products removed from sheet (skip seed-only) ───────────
    const allProducts  = await prisma.product.findMany({ select: { id: true, name: true } });
    const sheetNameSet = new Set(sheetRows.map(r => r.name.toLowerCase()));
    const sheetSlugSet = new Set(sheetRows.map(r => r.slug));

    const toDelete = allProducts.filter(p =>
      !SEED_ONLY_IDS.has(p.id) &&
      !sheetNameSet.has(p.name.toLowerCase()) &&
      !sheetSlugSet.has(p.id)
    );

    let deleted = 0;
    for (const p of toDelete) {
      await prisma.task.deleteMany({ where: { productId: p.id } });
      await prisma.product.delete({ where: { id: p.id } });
      deleted++;
    }

    const errNote = errors.length ? ` (⚠️ skipped: ${errors.join(", ")})` : "";
    return NextResponse.json({
      success: true,
      message: `✅ ${created} added, ${updated} updated, ${deleted} removed${errNote}`,
      created,
      updated,
      deleted,
      errors,
    });
  } catch (err: any) {
    console.error("Sheets sync error:", err);
    return NextResponse.json({ error: err.message ?? "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ status: "Sheets sync ready. POST to sync." });
}
