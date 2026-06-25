import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { postTaskUpdateToSlack, getChannelId, SLACK_CHANNEL_NAME } from "@/lib/slack";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  productId: z.string(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  startDate: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const productId = searchParams.get("productId");
  const status = searchParams.get("status");

  const tasks = await prisma.task.findMany({
    where: {
      ...(productId ? { productId } : {}),
      ...(status ? { status: status as any } : {}),
    },
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      product: { select: { id: true, name: true, emoji: true, color: true } },
    },
    orderBy: [{ status: "asc" }, { position: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ tasks });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const data = createSchema.parse(body);

    const task = await prisma.task.create({
      data: {
        ...data,
        createdById: session.user?.id,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
      },
      include: {
        product: true,
        assignee: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: err.errors[0].message }, { status: 400 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
