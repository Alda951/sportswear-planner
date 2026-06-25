import { prisma } from "@/lib/db";
import ProductGrid from "@/components/dashboard/ProductGrid";
import StatsRow from "@/components/dashboard/StatsRow";

export const dynamic = "force-dynamic";

async function getData() {
  const products = await prisma.product.findMany({
    include: {
      tasks: { select: { id: true, status: true, priority: true, dueDate: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const withProgress = products.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const inProgress = p.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const inReview = p.tasks.filter((t) => t.status === "IN_REVIEW").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...p, progress, taskStats: { total, done, inProgress, inReview } };
  });

  const totalTasks = withProgress.reduce((s, p) => s + p.taskStats.total, 0);
  const doneTasks = withProgress.reduce((s, p) => s + p.taskStats.done, 0);
  const inProgressTasks = withProgress.reduce((s, p) => s + p.taskStats.inProgress, 0);
  const launched = withProgress.filter((p) => p.status === "LAUNCHED").length;

  return { products: withProgress, stats: { totalTasks, doneTasks, inProgressTasks, launched, totalProducts: products.length } };
}

export default async function DashboardPage() {
  const { products, stats } = await getData();

  return (
    <div className="space-y-6 animate-fade-in">
      <StatsRow stats={stats} />
      <ProductGrid products={products} />
    </div>
  );
}
