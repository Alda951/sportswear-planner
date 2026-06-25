"use client";

import { usePathname } from "next/navigation";
import { Bell, RefreshCw } from "lucide-react";
import { useState } from "react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Product development at a glance" },
  "/kanban":    { title: "Kanban Board", subtitle: "Drag tasks across stages" },
  "/roadmap":   { title: "Roadmap", subtitle: "Timeline view of all products" },
  "/tasks":     { title: "Tasks & Slack", subtitle: "All tasks + #product-development feed" },
};

interface Props {
  user?: { name?: string | null } | null;
}

export default function TopBar({ user }: Props) {
  const pathname = usePathname();
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState("");

  const meta = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  async function handleSlackSync() {
    setSyncing(true);
    setSyncMsg("");
    try {
      const res = await fetch("/api/slack/sync", { method: "POST" });
      const data = await res.json();
      setSyncMsg(data.message || `Synced ${data.synced ?? 0} messages`);
    } catch {
      setSyncMsg("Sync failed");
    } finally {
      setSyncing(false);
      setTimeout(() => setSyncMsg(""), 4000);
    }
  }

  return (
    <header className="h-14 flex-shrink-0 flex items-center justify-between px-6 border-b border-slate-800/60 bg-slate-950/80 backdrop-blur-sm">
      <div>
        <h1 className="text-sm font-semibold text-white">{meta.title}</h1>
        <p className="text-[11px] text-slate-500">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-2">
        {syncMsg && (
          <span className="text-xs text-brand-400 bg-brand-500/10 px-3 py-1 rounded-full border border-brand-500/20">
            {syncMsg}
          </span>
        )}

        <button
          onClick={handleSlackSync}
          disabled={syncing}
          title="Sync Slack #product-development"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
          Sync Slack
        </button>

        <button className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700">
          <Bell className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
