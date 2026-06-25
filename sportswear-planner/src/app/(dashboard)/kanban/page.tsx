import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KanbanPage() {
  const [products, tasks] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      include: {
        product: { select: { id: true, name: true, emoji: true, color: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
  ]);

  return <KanbanBoard initialTasks={tasks as any} products={products} />;
}
