import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const CATEGORY_COLORS: Record<string, string> = {
  Uniform:     "#0891b2",
  Tracksuit:   "#8b5cf6",
  Compression: "#06b6d4",
};
function categoryColor(cat: string): string {
  return CATEGORY_COLORS[cat] ?? "#f97316";
}

// Products permanently in the sheet's merged top block — cannot be parsed by CSV sync
const PRODUCTS = [
  { id: "hockey-premium-jersey",   name: "Hockey Premium Jersey",            category: "Uniform",     sport: "Hockey",        status: "IN_DEVELOPMENT"  as const, targetDate: null },
  { id: "new-womens-v-neck-cut",   name: "New Womens V Neck Cut",            category: "Uniform",     sport: "Volleyball",    status: "IN_MANUFACTURE"  as const, targetDate: null },
  { id: "mock-neck-flag-jersey",   name: "Mock Neck Flag Football Jersey",    category: "Uniform",     sport: "Flag Football", status: "IN_DEVELOPMENT"  as const, targetDate: null },
  { id: "crewneck-flag-jersey",    name: "Crewneck Flag Football Jersey",     category: "Uniform",     sport: "Flag Football", status: "IN_DEVELOPMENT"  as const, targetDate: null },
  { id: "flag-football-shorts",    name: "Two in One Flag Football Shorts",   category: "Uniform",     sport: "Flag Football", status: "IN_MANUFACTURE"  as const, targetDate: null },
  { id: "cozy-tracksuit",          name: "Cozy Tracksuit",                    category: "Tracksuit",   sport: null,            status: "IN_REVIEW"       as const, targetDate: new Date("2026-09-01") },
  { id: "quantum-tearaway",        name: "Quantum Tearaway",                  category: "Tracksuit",   sport: null,            status: "IN_DEVELOPMENT"  as const, targetDate: new Date("2026-09-15") },
  { id: "compression-bottoms",     name: "Compression Bottoms",               category: "Compression", sport: null,            status: "IN_REVIEW"       as const, targetDate: null },
  { id: "st-marys-football",       name: "ST Mary's Football",                category: "Uniform",     sport: "Football",      status: "IN_REVIEW"       as const, targetDate: new Date("2026-07-01") },
];

const TEAM = [
  { email: "admin@sportswear.com",  name: "Aldair", role: "ADMIN"  as const },
  { email: "seamus@sportswear.com", name: "Seamus", role: "MEMBER" as const },
  { email: "justin@sportswear.com", name: "Justin", role: "MEMBER" as const },
];

async function main() {
  console.log("🌱 Seeding users and products (tasks are preserved)...");

  const hashedPassword = await bcrypt.hash("admin123", 12);

  for (const member of TEAM) {
    await prisma.user.upsert({
      where:  { email: member.email },
      update: { name: member.name },
      create: { email: member.email, name: member.name, password: hashedPassword, role: member.role },
    });
    console.log(`👤 ${member.name}`);
  }

  console.log("\n🌱 Seeding products...\n");

  for (const p of PRODUCTS) {
    const data = {
      name:       p.name,
      emoji:      "",
      color:      categoryColor(p.category),
      category:   p.category,
      sport:      p.sport,
      status:     p.status,
      targetDate: p.targetDate,
    };
    await prisma.product.upsert({
      where:  { id: p.id },
      update: data,
      create: { id: p.id, ...data },
    });
    console.log(`  ✅ ${p.name}`);
  }

  console.log("\n🎉 Done — tasks untouched.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
