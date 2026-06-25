import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SEED_PRODUCTS = [
  { name: "Running Shorts", emoji: "🩳", color: "#f97316", category: "Bottoms", status: "IN_DEVELOPMENT" },
  { name: "Sports Bra", emoji: "👙", color: "#ec4899", category: "Tops", status: "IN_REVIEW" },
  { name: "Training Jacket", emoji: "🧥", color: "#3b82f6", category: "Outerwear", status: "PLANNING" },
  { name: "Compression Tights", emoji: "🦵", color: "#8b5cf6", category: "Bottoms", status: "IN_DEVELOPMENT" },
  { name: "Performance Hoodie", emoji: "👕", color: "#10b981", category: "Tops", status: "PLANNING" },
  { name: "Tank Top", emoji: "👚", color: "#f59e0b", category: "Tops", status: "LAUNCHED" },
  { name: "Tracksuit Set", emoji: "🏃", color: "#06b6d4", category: "Sets", status: "IN_DEVELOPMENT" },
  { name: "Athletic Socks", emoji: "🧦", color: "#84cc16", category: "Accessories", status: "LAUNCHED" },
] as const;

async function main() {
  console.log("🌱 Seeding database...");

  // Create admin user
  const hashedPassword = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@sportswear.com" },
    update: {},
    create: {
      email: "admin@sportswear.com",
      name: "Admin",
      password: hashedPassword,
      role: "ADMIN",
    },
  });

  console.log(`✅ Created admin user: ${admin.email}`);

  // Create products
  for (const p of SEED_PRODUCTS) {
    const product = await prisma.product.upsert({
      where: { id: p.name.toLowerCase().replace(/\s+/g, "-") },
      update: {},
      create: {
        id: p.name.toLowerCase().replace(/\s+/g, "-"),
        name: p.name,
        emoji: p.emoji,
        color: p.color,
        category: p.category,
        status: p.status as any,
        targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90), // 90 days
      },
    });

    // Seed some tasks per product
    const taskTemplates = [
      { title: `Design ${p.name} mockups`, status: "DONE", priority: "HIGH" },
      { title: `Source materials for ${p.name}`, status: p.status === "PLANNING" ? "TODO" : "DONE", priority: "HIGH" },
      { title: `Prototype ${p.name}`, status: p.status === "LAUNCHED" ? "DONE" : p.status === "IN_DEVELOPMENT" ? "IN_PROGRESS" : "TODO", priority: "MEDIUM" },
      { title: `Quality testing ${p.name}`, status: p.status === "LAUNCHED" || p.status === "IN_REVIEW" ? "IN_REVIEW" : "TODO", priority: "MEDIUM" },
      { title: `Launch ${p.name}`, status: p.status === "LAUNCHED" ? "DONE" : "TODO", priority: "LOW" },
    ];

    for (let i = 0; i < taskTemplates.length; i++) {
      const t = taskTemplates[i];
      await prisma.task.create({
        data: {
          title: t.title,
          status: t.status as any,
          priority: t.priority as any,
          position: i,
          productId: product.id,
          createdById: admin.id,
          dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * (30 + i * 10)),
        },
      });
    }
    console.log(`✅ Seeded product: ${p.name}`);
  }

  console.log("🎉 Seed complete!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
