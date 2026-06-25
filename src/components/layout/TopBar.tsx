"use client";

import { usePathname } from "next/navigation";
import { Bell, RefreshCw, Sheet } from "lucide-react";
import { useState } from "react";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard": { title: "Overview", subtitle: "Product development at a glance" },
  "/kanban":    { title: "Progress", subtitle: "Drag tasks across stages" },
  "/roadmap":   { title: "Roadmap", subtitle: "Timeline view of all products" },
  "/tasks":     { title: "Tasks & Slack", subtitle: "All tasks + #product-development feed" },
};

interface Props {
  user?: { name?: string | null } | null;
}

export default function TopBar({ user }: Props) {
  const pathname = usePathname();
  const [syncingSlack, setSyncingSlack]   = useState(false);
  const [syncingSheets, setSyncingSheets] = useState(false);
  const [syncMsg, setSyncMsg]             = useState("");

  const meta = PAGE_TITLES[pathname] ?? { title: "Dashboard", subtitle: "" };

  function showMsg(msg: string) {
    setSyncMsg(msg);
    setTimeout(() => setSyncMsg(""), 5000);
  }

  async function handleSlackSync() {
    setSyncingSlack(true);
    try {
      const res  = await fetch("/api/slack/sync", { method: "POST" });
      const data = await res.json();
      showMsg(data.message || `Synced ${data.synced ?? 0} Slack messages`);
    } catch {
      showMsg("Slack sync failed");
    } finally {
      setSyncingSlack(false);
    }
  }

  async function handleSheetsSync() {
    setSyncingSheets(true);
    try {
      const res  = await fetch("/api/sheets/sync", { method: "POST" });
      const data = await res.json();
      if (data.error) {
        showMsg(`❌ ${data.error}`);
      } else {
        showMsg(data.message || "Sheets synced");
        // Reload the page to show new products/tasks
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      showMsg("Sheets sync failed");
    } finally {
      setSyncingSheets(false);
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
          <span className="text-xs text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 max-w-xs truncate">
            {syncMsg}
          </span>
        )}

        {/* Google Sheets sync */}
        <button
          onClick={handleSheetsSync}
          disabled={syncingSheets}
          title="Sync from Google Sheets"
          className="flex items-center gap-1.5 text-xs font-medium text-emerald-400 hover:text-white bg-emerald-500/10 hover:bg-emerald-500/20 px-3 py-1.5 rounded-lg transition-colors border border-emerald-500/30 disabled:opacity-50"
        >
          <Sheet className={`w-3.5 h-3.5 ${syncingSheets ? "animate-pulse" : ""}`} />
          {syncingSheets ? "Syncing…" : "Sync Sheets"}
        </button>

        {/* Slack sync */}
        <button
          onClick={handleSlackSync}
          disabled={syncingSlack}
          title="Sync Slack #product-development"
          className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg transition-colors border border-slate-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${syncingSlack ? "animate-spin" : ""}`} />
          {syncingSlack ? "Syncing…" : "Sync Slack"}
        </button>

        <button className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 transition-colors border border-slate-700">
          <Bell className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
}
