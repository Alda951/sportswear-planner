import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { slack, syncSlackMessages, getChannelId, SLACK_CHANNEL_NAME } from "@/lib/slack";
import { prisma } from "@/lib/db";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const channelId = await getChannelId(SLACK_CHANNEL_NAME);
    if (!channelId) {
      return NextResponse.json(
        { error: `Slack channel #${SLACK_CHANNEL_NAME} not found. Check your SLACK_CHANNEL_NAME env var and bot permissions.` },
        { status: 404 }
      );
    }

    const messages = await syncSlackMessages(channelId);

    // Also extract product names mentioned and create missing products
    const text = messages.map((m) => m.text).join(" ");
    await autoCreateProducts(text);

    return NextResponse.json({
      synced: messages.length,
      channelId,
      message: `Synced ${messages.length} messages from #${SLACK_CHANNEL_NAME}`,
    });
  } catch (err: any) {
    console.error("Slack sync error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const messages = await prisma.slackMessage.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ messages });
}

// Auto-create products found in Slack messages that don't exist yet
async function autoCreateProducts(text: string) {
  const productPatterns = [
    { pattern: /running shorts/i, name: "Running Shorts", emoji: "🩳", color: "#f97316" },
    { pattern: /sports bra/i, name: "Sports Bra", emoji: "👙", color: "#ec4899" },
    { pattern: /training jacket/i, name: "Training Jacket", emoji: "🧥", color: "#3b82f6" },
    { pattern: /compression tights/i, name: "Compression Tights", emoji: "🦵", color: "#8b5cf6" },
    { pattern: /hoodie/i, name: "Performance Hoodie", emoji: "👕", color: "#10b981" },
    { pattern: /tank top/i, name: "Tank Top", emoji: "👚", color: "#f59e0b" },
    { pattern: /tracksuit/i, name: "Tracksuit Set", emoji: "🏃", color: "#06b6d4" },
    { pattern: /socks/i, name: "Athletic Socks", emoji: "🧦", color: "#84cc16" },
  ];

  for (const p of productPatterns) {
    if (p.pattern.test(text)) {
      await prisma.product.upsert({
        where: { id: p.name.toLowerCase().replace(/\s+/g, "-") },
        update: {},
        create: {
          id: p.name.toLowerCase().replace(/\s+/g, "-"),
          name: p.name,
          emoji: p.emoji,
          color: p.color,
          slackImport: true,
          targetDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 90),
        },
      });
    }
  }
}
