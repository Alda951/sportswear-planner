import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(["PLANNING", "IN_DEVELOPMENT", "IN_REVIEW", "LAUNCHED", "ON_HOLD"]).optional(),
  color: z.string().optional(),
  emoji: z.string().optional(),
  targetDate: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const products = await prisma.product.findMany({
    include: {
      tasks: {
        select: { id: true, status: true, priority: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Compute progress per product
  const withProgress = products.map((p) => {
    const total = p.tasks.length;
    const done = p.tasks.filter((t) => t.status === "DONE").length;
    const inProgress = p.tasks.filter((t) => t.status === "IN_PROGRESS").length;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;
    return { ...p, progress, taskStats: { total, done, inProgress } };
  });

  return NextResponse.json({ products: withProgress });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const product = await prisma.product.create({
      data: {
        ...data,
        targetDate: data.targetDate ? new Date(data.targetDate) : undefined,
      },
    });

    return NextResponse.json({ product }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
