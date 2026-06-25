"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Search, Filter, Plus, Slack, RefreshCw,
  ChevronUp, ChevronDown, ExternalLink, Hash
} from "lucide-react";
import { clsx } from "clsx";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  status: Status;
  priority: Priority;
  dueDate: Date | null;
  slackSynced: boolean;
  product: { id: string; name: string; emoji: string; color: string };
  assignee: { id: string; name: string } | null;
}

interface SlackMessage {
  id: string;
  ts: string;
  text: string;
  username: string | null;
  isTask: boolean;
  taskId: string | null;
  createdAt: Date;
}

const STATUS_MAP: Record<Status, { label: string; color: string; bg: string }> = {
  TODO:        { label: "To Do",      color: "text-slate-400",  bg: "bg-slate-400/10" },
  IN_PROGRESS: { label: "In Progress",color: "text-yellow-400", bg: "bg-yellow-400/10" },
  IN_REVIEW:   { label: "In Review",  color: "text-sky-400",    bg: "bg-sky-400/10" },
  DONE:        { label: "Done",       color: "text-emerald-400",bg: "bg-emerald-400/10" },
};

const PRIORITY_MAP: Record<Priority, { label: string; color: string }> = {
  LOW:    { label: "Low",    color: "text-slate-400" },
  MEDIUM: { label: "Medium", color: "text-yellow-400" },
  HIGH:   { label: "High",   color: "text-orange-400" },
  URGENT: { label: "Urgent", color: "text-red-400" },
};

export default function TasksAndSlack({
  initialTasks,
  products,
  initialMessages,
}: {
  initialTasks: Task[];
  products: { id: string; name: string; emoji: string }[];
  initialMessages: SlackMessage[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [messages, setMessages] = useState<SlackMessage[]>(initialMessages);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<Status | "all">("all");
  const [filterProduct, setFilterProduct] = useState("all");
  const [syncing, setSyncing] = useState(false);
  const [sortBy, setSortBy] = useState<"priority" | "dueDate" | "status">("priority");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = tasks
    .filter((t) => {
      if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (filterProduct !== "all" && t.product.id !== filterProduct) return false;
      return true;
    })
    .sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortBy === "priority") {
        const order = { URGENT: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        return (order[a.priority] - order[b.priority]) * dir;
      }
      if (sortBy === "dueDate") {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) * dir;
      }
      return a.status.localeCompare(b.status) * dir;
    });

  async function updateStatus(taskId: string, status: Status) {
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, status } : t)));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  async function syncSlack() {
    setSyncing(true);
    try {
      await fetch("/api/slack/sync", { method: "POST" });
      const res = await fetch("/api/slack/sync");
      const data = await res.json();
      setMessages(data.messages ?? []);
    } finally {
      setSyncing(false);
    }
  }

  function toggleSort(col: typeof sortBy) {
    if (sortBy === col) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortBy(col); setSortDir("asc"); }
  }

  const SortIcon = ({ col }: { col: typeof sortBy }) =>
    sortBy === col
      ? sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
      : <ChevronUp className="w-3 h-3 opacity-20" />;

  return (
    <div className="flex gap-5 h-full">
      {/* Task table (left) */}
      <div className="flex-1 min-w-0 flex flex-col gap-4">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[160px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks..."
              className="input w-full pl-8 text-xs"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="input text-xs py-1.5 pr-6"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_MAP).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>

          <select
            value={filterProduct}
            onChange={(e) => setFilterProduct(e.target.value)}
            className="input text-xs py-1.5 pr-6"
          >
            <option value="all">All products</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>
            ))}
          </select>
        </div>

        {/* Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-950/40">
                  <th className="text-left px-4 py-2.5 text-slate-500 font-medium">Task</th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Product</th>
                  <th
                    className="text-left px-3 py-2.5 text-slate-500 font-medium cursor-pointer hover:text-slate-300"
                    onClick={() => toggleSort("status")}
                  >
                    <span className="flex items-center gap-1">Status <SortIcon col="status" /></span>
                  </th>
                  <th
                    className="text-left px-3 py-2.5 text-slate-500 font-medium cursor-pointer hover:text-slate-300"
                    onClick={() => toggleSort("priority")}
                  >
                    <span className="flex items-center gap-1">Priority <SortIcon col="priority" /></span>
                  </th>
                  <th
                    className="text-left px-3 py-2.5 text-slate-500 font-medium cursor-pointer hover:text-slate-300"
                    onClick={() => toggleSort("dueDate")}
                  >
                    <span className="flex items-center gap-1">Due <SortIcon col="dueDate" /></span>
                  </th>
                  <th className="text-left px-3 py-2.5 text-slate-500 font-medium">Assignee</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((task) => {
                  const sm = STATUS_MAP[task.status];
                  const pm = PRIORITY_MAP[task.priority];
                  return (
                    <tr key={task.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          {task.slackSynced && <Slack className="w-3 h-3 text-purple-400 flex-shrink-0" />}
                          <span className="text-white font-medium truncate max-w-[200px]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="text-[11px] px-1.5 py-0.5 rounded font-medium"
                          style={{ backgroundColor: `${task.product.color}20`, color: task.product.color }}
                        >
                          {task.product.emoji} {task.product.name}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <select
                          value={task.status}
                          onChange={(e) => updateStatus(task.id, e.target.value as Status)}
                          className={`${sm.bg} ${sm.color} border-0 bg-transparent text-[11px] font-medium rounded px-1 py-0.5 cursor-pointer outline-none`}
                        >
                          {Object.entries(STATUS_MAP).map(([k, v]) => (
                            <option key={k} value={k}>{v.label}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`font-medium ${pm.color}`}>{pm.label}</span>
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "—"}
                      </td>
                      <td className="px-3 py-2.5 text-slate-400">
                        {task.assignee?.name ?? "—"}
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                      No tasks match your filters
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-2 border-t border-slate-800 text-xs text-slate-600">
            {filtered.length} of {tasks.length} tasks
          </div>
        </div>
      </div>

      {/* Slack feed (right) */}
      <div className="w-72 flex-shrink-0 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <Hash className="w-4 h-4 text-purple-400" />
            product-development
          </div>
          <button
            onClick={syncSlack}
            disabled={syncing}
            className="btn-ghost py-1 px-2 text-[11px] flex items-center gap-1"
          >
            <RefreshCw className={clsx("w-3 h-3", syncing && "animate-spin")} />
            Sync
          </button>
        </div>

        <div className="flex-1 space-y-2 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-center py-8 text-slate-500 text-xs">
              <Slack className="w-8 h-8 mx-auto mb-2 opacity-30" />
              No messages yet. Click Sync to load from Slack.
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={clsx(
                  "bg-slate-900 border rounded-lg p-3 text-xs",
                  msg.isTask
                    ? "border-purple-500/30 bg-purple-500/5"
                    : "border-slate-800"
                )}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded bg-purple-500/20 flex items-center justify-center flex-shrink-0">
                    <span className="text-[9px] font-bold text-purple-400">
                      {(msg.username ?? "?")[0]?.toUpperCase()}
                    </span>
                  </div>
                  <span className="font-medium text-slate-300 truncate">{msg.username ?? "Unknown"}</span>
                  <span className="ml-auto text-[10px] text-slate-600">
                    {format(new Date(msg.createdAt), "MMM d")}
                  </span>
                </div>
                <p className="text-slate-400 leading-relaxed line-clamp-3">{msg.text}</p>
                {msg.isTask && (
                  <span className="inline-flex items-center gap-1 mt-1.5 text-[10px] text-purple-400 bg-purple-500/10 px-1.5 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                    Imported as task
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
