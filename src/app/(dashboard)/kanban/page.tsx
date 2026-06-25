import KanbanBoard from "@/components/dashboard/KanbanBoard";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function KanbanPage({
  searchParams,
}: {
  searchParams: { product?: string };
}) {
  const [products, tasks, users] = await Promise.all([
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.task.findMany({
      select: {
        id: true, title: true, description: true, status: true,
        priority: true, dueDate: true, slackSynced: true, position: true,
        product:  { select: { id: true, name: true, emoji: true, color: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    prisma.user.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <KanbanBoard
      initialTasks={tasks as any}
      products={products}
      users={users}
      initialProduct={searchParams.product ?? "all"}
    />
  );
}
