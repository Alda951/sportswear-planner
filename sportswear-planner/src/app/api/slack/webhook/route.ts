import { NextRequest, NextResponse } from "next/server";
import { syncSlackMessages, getChannelId, SLACK_CHANNEL_NAME } from "@/lib/slack";
import crypto from "crypto";

// Verify Slack request signature
function verifySlackSignature(req: NextRequest, body: string): boolean {
  const signingSecret = process.env.SLACK_SIGNING_SECRET;
  if (!signingSecret) return false;

  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");
  if (!timestamp || !signature) return false;

  // Prevent replay attacks (5 min window)
  if (Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) return false;

  const baseString = `v0:${timestamp}:${body}`;
  const hmac = crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");
  const expected = `v0=${hmac}`;

  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verifySlackSignature(req, rawBody)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // Handle URL verification challenge
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }

  // Handle events
  if (payload.type === "event_callback") {
    const event = payload.event;

    // New message in the channel — trigger a sync
    if (event.type === "message" && !event.subtype) {
      const channelId = await getChannelId(SLACK_CHANNEL_NAME);
      if (channelId && event.channel === channelId) {
        // Async sync — don't block the response
        syncSlackMessages(channelId).catch(console.error);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
