import TasksAndSlack from "@/components/dashboard/TasksAndSlack";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const [tasks, products, slackMessages] = await Promise.all([
    prisma.task.findMany({
      include: {
        product: { select: { id: true, name: true, emoji: true, color: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { priority: "desc" }, { dueDate: "asc" }],
    }),
    prisma.product.findMany({ orderBy: { name: "asc" } }),
    prisma.slackMessage.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <TasksAndSlack
      initialTasks={tasks as any}
      products={products}
      initialMessages={slackMessages}
    />
  );
}
