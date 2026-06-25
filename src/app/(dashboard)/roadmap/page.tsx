import RoadmapView from "@/components/dashboard/RoadmapView";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const products = await prisma.product.findMany({
    include: {
      tasks: {
        where: { dueDate: { not: null } },
        select: { id: true, title: true, status: true, priority: true, startDate: true, dueDate: true },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return <RoadmapView products={products as any} />;
}
