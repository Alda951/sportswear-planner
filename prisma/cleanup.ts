import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// IDs that the current seed creates — keep these
const KEEP_IDS = [
  "hockey-premium-jersey",
  "mock-neck-flag-jersey",
  "crewneck-flag-jersey",
  "flag-football-shorts",
  "cozy-tracksuit",
  "quantum-tearaway",
  "compression-bottoms",
  "st-marys-football",
];

async function main() {
  // Delete tasks for products we're about to remove
  const oldProducts = await prisma.product.findMany({
    where: { id: { notIn: KEEP_IDS } },
    select: { id: true, name: true },
  });

  if (oldProducts.length === 0) {
    console.log("✅ No duplicate products found — DB is already clean!");
    return;
  }

  console.log(`🧹 Removing ${oldProducts.length} old/duplicate products:`);
  for (const p of oldProducts) console.log(`   - ${p.name} (${p.id})`);

  const oldIds = oldProducts.map(p => p.id);
  await prisma.task.deleteMany({ where: { productId: { in: oldIds } } });
  await prisma.product.deleteMany({ where: { id: { in: oldIds } } });

  console.log("🎉 Done — only current products remain.");
}

main().catch(console.error).finally(() => prisma.$disconnect());
