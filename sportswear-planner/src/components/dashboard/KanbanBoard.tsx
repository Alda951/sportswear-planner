"use client";

import { useState, useCallback } from "react";
import { format } from "date-fns";
import { Plus, GripVertical, CalendarDays, Slack } from "lucide-react";
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

interface Product {
  id: string;
  name: string;
  emoji: string;
}

const COLUMNS: { id: Status; label: string; color: string }[] = [
  { id: "TODO",        label: "To Do",      color: "border-slate-600" },
  { id: "IN_PROGRESS", label: "In Progress", color: "border-yellow-500" },
  { id: "IN_REVIEW",   label: "In Review",  color: "border-sky-500" },
  { id: "DONE",        label: "Done",       color: "border-emerald-500" },
];

const PRIORITY_CONFIG: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:    { label: "Low",    color: "text-slate-400",  bg: "bg-slate-400/10" },
  MEDIUM: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-400/10" },
  HIGH:   { label: "High",   color: "text-orange-400", bg: "bg-orange-400/10" },
  URGENT: { label: "Urgent", color: "text-red-400",    bg: "bg-red-400/10" },
};

export default function KanbanBoard({
  initialTasks,
  products,
}: {
  initialTasks: Task[];
  products: Product[];
}) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks);
  const [filterProduct, setFilterProduct] = useState<string>("all");
  const [dragging, setDragging] = useState<string | null>(null);
  const [addingTo, setAddingTo] = useState<Status | null>(null);
  const [newTitle, setNewTitle] = useState("");

  const filtered = filterProduct === "all"
    ? tasks
    : tasks.filter((t) => t.product.id === filterProduct);

  const byStatus = (status: Status) => filtered.filter((t) => t.status === status);

  async function moveTask(taskId: string, newStatus: Status) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  async function addTask(status: Status) {
    if (!newTitle.trim()) return;
    const productId = filterProduct !== "all" ? filterProduct : products[0]?.id;
    if (!productId) return;

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle, status, productId }),
    });
    const data = await res.json();
    if (data.task) {
      setTasks((prev) => [...prev, data.task]);
    }
    setNewTitle("");
    setAddingTo(null);
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => setFilterProduct("all")}
          className={clsx(
            "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
            filterProduct === "all"
              ? "bg-brand-500 text-white"
              : "bg-slate-800 text-slate-400 hover:text-white"
          )}
        >
          All products
        </button>
        {products.map((p) => (
          <button
            key={p.id}
            onClick={() => setFilterProduct(p.id)}
            className={clsx(
              "px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterProduct === p.id
                ? "bg-slate-700 text-white border border-slate-600"
                : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            {p.emoji} {p.name}
          </button>
        ))}
      </div>

      {/* Board */}
      <div className="flex-1 grid grid-cols-4 gap-4 min-h-0 overflow-x-auto">
        {COLUMNS.map(({ id, label, color }) => {
          const col = byStatus(id);
          return (
            <div
              key={id}
              className="flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 min-w-[220px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const taskId = e.dataTransfer.getData("taskId");
                if (taskId) moveTask(taskId, id);
              }}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-3 border-b ${color} border-b-2 border-l-0 border-r-0 border-t-0`}>
                <span className="text-xs font-semibold text-white">{label}</span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">
                  {col.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDragStart={() => setDragging(task.id)}
                    onDragEnd={() => setDragging(null)}
                    isDragging={dragging === task.id}
                  />
                ))}

                {/* Add card inline */}
                {addingTo === id ? (
                  <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                    <textarea
                      autoFocus
                      rows={2}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Task title..."
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTask(id); }
                        if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); }
                      }}
                    />
                    <div className="flex gap-1 mt-1">
                      <button onClick={() => addTask(id)} className="text-[11px] bg-brand-500 text-white px-2 py-0.5 rounded font-medium">Add</button>
                      <button onClick={() => { setAddingTo(null); setNewTitle(""); }} className="text-[11px] text-slate-500 hover:text-white px-2 py-0.5">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingTo(id)}
                    className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-slate-600 hover:text-slate-400 hover:bg-slate-800/50 rounded-lg transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskCard({
  task,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  task: Task;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  const pc = PRIORITY_CONFIG[task.priority];

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      className={clsx(
        "bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all group",
        isDragging && "opacity-40 rotate-1"
      )}
    >
      {/* Product tag */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${task.product.color}20`, color: task.product.color }}
        >
          {task.product.emoji} {task.product.name}
        </span>
        {task.slackSynced && (
          <span title="From Slack">
            <Slack className="w-3 h-3 text-purple-400" />
          </span>
        )}
        <GripVertical className="w-3 h-3 text-slate-700 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      <p className="text-xs text-white font-medium leading-snug mb-2">{task.title}</p>

      <div className="flex items-center gap-2">
        <span className={`badge ${pc.bg} ${pc.color}`}>{pc.label}</span>
        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
            <CalendarDays className="w-3 h-3" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>

      {task.assignee && (
        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-700/50">
          <div className="w-4 h-4 rounded-full bg-brand-500/20 flex items-center justify-center">
            <span className="text-[9px] font-bold text-brand-400">
              {task.assignee.name?.[0]?.toUpperCase()}
            </span>
          </div>
          <span className="text-[10px] text-slate-500">{task.assignee.name}</span>
        </div>
      )}
    </div>
  );
}
