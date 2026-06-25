import { WebClient } from "@slack/web-api";
import { prisma } from "@/lib/db";

export const slack = new WebClient(process.env.SLACK_BOT_TOKEN);
export const SLACK_CHANNEL_NAME = process.env.SLACK_CHANNEL_NAME || "product-development";

// Resolve channel ID from name
export async function getChannelId(name: string): Promise<string | null> {
  try {
    const res = await slack.conversations.list({ types: "public_channel,private_channel", limit: 200 });
    const channel = res.channels?.find(
      (c) => c.name === name.replace("#", "")
    );
    return channel?.id ?? null;
  } catch {
    return null;
  }
}

// Fetch recent messages from #product-development
export async function syncSlackMessages(channelId: string) {
  const res = await slack.conversations.history({
    channel: channelId,
    limit: 100,
  });

  const messages = res.messages ?? [];
  const saved = [];

  for (const msg of messages) {
    if (!msg.ts || msg.subtype) continue; // skip system messages

    // Upsert into slack_messages
    const saved_msg = await prisma.slackMessage.upsert({
      where: { ts: msg.ts },
      update: {
        text: msg.text ?? "",
        username: (msg as any).username ?? (msg as any).user_profile?.display_name,
      },
      create: {
        ts: msg.ts,
        channelId,
        userId: msg.user ?? null,
        username: (msg as any).username ?? (msg as any).user_profile?.display_name ?? null,
        text: msg.text ?? "",
        isTask: isTaskLike(msg.text ?? ""),
      },
    });

    // Auto-detect tasks and import them
    if (isTaskLike(msg.text ?? "") && !saved_msg.taskId) {
      await importSlackMessageAsTask(saved_msg.id, msg.text ?? "", channelId, msg.ts);
    }

    saved.push(saved_msg);
  }

  return saved;
}

// Heuristic: treat message as a task if it looks like one
function isTaskLike(text: string): boolean {
  const taskPatterns = [
    /^\[task\]/i,
    /^task:/i,
    /^todo:/i,
    /^📌/,
    /^✅/,
    /^🔧/,
    /^\d+\.\s/,
    /^-\s.{10,}/,  // bullet with some text
    /need to|should|must|create|build|design|fix|update|launch|review/i,
  ];
  return taskPatterns.some((p) => p.test(text.trim()));
}

// Parse product name from message
function detectProduct(text: string): string | null {
  const products = [
    "running shorts", "sports bra", "training jacket",
    "compression tights", "hoodie", "tank top", "tracksuit", "socks"
  ];
  const lower = text.toLowerCase();
  return products.find((p) => lower.includes(p)) ?? null;
}

// Import a Slack message as a task
async function importSlackMessageAsTask(
  slackMsgId: string,
  text: string,
  channelId: string,
  ts: string
) {
  // Try to find matching product
  const productName = detectProduct(text);
  let product = productName
    ? await prisma.product.findFirst({
        where: { name: { contains: productName, mode: "insensitive" } },
      })
    : null;

  // Fall back to first product if none detected
  if (!product) {
    product = await prisma.product.findFirst({ orderBy: { createdAt: "asc" } });
  }
  if (!product) return;

  // Clean up the title (remove task prefixes)
  const title = text
    .replace(/^\[task\]/i, "")
    .replace(/^task:/i, "")
    .replace(/^todo:/i, "")
    .replace(/^[📌✅🔧]\s*/, "")
    .trim()
    .slice(0, 200);

  const task = await prisma.task.create({
    data: {
      title,
      description: `Imported from Slack #${SLACK_CHANNEL_NAME}`,
      status: "TODO",
      priority: "MEDIUM",
      productId: product.id,
      slackMessageTs: ts,
      slackChannelId: channelId,
      slackSynced: true,
    },
  });

  // Link back to slack message
  await prisma.slackMessage.update({
    where: { id: slackMsgId },
    data: { taskId: task.id, isTask: true },
  });

  return task;
}

// Post a status update back to Slack when a task changes
export async function postTaskUpdateToSlack(
  channelId: string,
  task: { title: string; status: string; slackThreadTs?: string | null }
) {
  const statusEmoji: Record<string, string> = {
    TODO: "📋",
    IN_PROGRESS: "⚡",
    IN_REVIEW: "🔍",
    DONE: "✅",
  };

  const emoji = statusEmoji[task.status] ?? "🔄";
  const text = `${emoji} *Task updated:* ${task.title}\n> Status → *${task.status.replace("_", " ")}*`;

  await slack.chat.postMessage({
    channel: channelId,
    text,
    thread_ts: task.slackThreadTs ?? undefined,
    unfurl_links: false,
  });
}

// Resolve Slack user display name
export async function getSlackUserName(userId: string): Promise<string> {
  try {
    const res = await slack.users.info({ user: userId });
    return res.user?.profile?.display_name || res.user?.real_name || userId;
  } catch {
    return userId;
  }
}
