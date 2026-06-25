import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { postTaskUpdateToSlack, getChannelId, SLACK_CHANNEL_NAME } from "@/lib/slack";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    const prev = await prisma.task.findUnique({ where: { id: params.id } });

    // Whitelist only valid Prisma fields — ignore UI-only objects like `assignee`
    const data: Record<string, any> = {};
    const allowed = ["title", "description", "status", "priority", "assigneeId", "position", "productId", "slackSynced"];
    for (const key of allowed) {
      if (body[key] !== undefined) data[key] = body[key];
    }
    if (body.dueDate !== undefined) data.dueDate = body.dueDate ? new Date(body.dueDate) : null;
    if (body.startDate !== undefined) data.startDate = body.startDate ? new Date(body.startDate) : null;

    const task = await prisma.task.update({
      where: { id: params.id },
      data,
      include: {
        product:  { select: { id: true, name: true, emoji: true, color: true } },
        assignee: { select: { id: true, name: true } },
      },
    });

    // Post to Slack if status changed and task was imported from Slack
    if (prev?.status !== task.status && task.slackChannelId && process.env.SLACK_BOT_TOKEN) {
      try {
        await postTaskUpdateToSlack(task.slackChannelId, {
          title: task.title,
          status: task.status,
          slackThreadTs: task.slackThreadTs,
        });
      } catch (e) {
        console.error("Failed to post Slack update:", e);
      }
    }

    return NextResponse.json({ task });
  } catch (err: any) {
    console.error("Task PATCH error:", err);
    return NextResponse.json({ error: err?.message ?? "Update failed" }, { status: 500 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.task.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
