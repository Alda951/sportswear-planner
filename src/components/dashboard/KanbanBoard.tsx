"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Plus, CalendarDays, Slack, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import TaskDetailPanel from "./TaskDetailPanel";
import { clsx } from "clsx";

type Status = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";
type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: Status;
  priority: Priority;
  dueDate: Date | null;
  slackSynced: boolean;
  product: { id: string; name: string; emoji: string; color: string };
  assignee: { id: string; name: string } | null;
}

interface Product { id: string; name: string; emoji: string; }
interface User   { id: string; name: string; }

const COLUMNS: { id: Status; label: string; accent: string }[] = [
  { id: "TODO",        label: "To Do",       accent: "border-slate-500" },
  { id: "IN_PROGRESS", label: "In Progress", accent: "border-yellow-500" },
  { id: "IN_REVIEW",   label: "In Review",   accent: "border-sky-500" },
  { id: "DONE",        label: "Done",        accent: "border-emerald-500" },
];

const DIFFICULTY: Record<Priority, { label: string; color: string; bg: string }> = {
  LOW:    { label: "Easy",   color: "text-emerald-400", bg: "bg-emerald-400/10" },
  MEDIUM: { label: "Medium", color: "text-yellow-400",  bg: "bg-yellow-400/10" },
  HIGH:   { label: "Hard",   color: "text-orange-400",  bg: "bg-orange-400/10" },
  URGENT: { label: "Expert", color: "text-red-400",     bg: "bg-red-400/10" },
};

const AVATAR_COLORS: Record<string, string> = {
  Aldair: "bg-brand-500/20 text-brand-400",
  Seamus: "bg-sky-500/20 text-sky-400",
  Justin: "bg-emerald-500/20 text-emerald-400",
};

export default function KanbanBoard({
  initialTasks,
  products,
  users = [],
  initialProduct = "all",
}: {
  initialTasks: Task[];
  products: Product[];
  users?: User[];
  initialProduct?: string;
}) {
  const [tasks, setTasks]           = useState<Task[]>(initialTasks);
  const [filterProduct, setFilter]  = useState(initialProduct);
  const [dragging, setDragging]     = useState<string | null>(null);
  const [detailTask, setDetailTask] = useState<Task | null>(null);
  const scrollRef                   = useRef<HTMLDivElement>(null);
  const [addingTo, setAddingTo]     = useState<Status | null>(null);
  const [newTitle, setNewTitle]     = useState("");
  const [newProductId, setNewProd]  = useState(products[0]?.id ?? "");

  const filtered = filterProduct === "all"
    ? tasks
    : tasks.filter((t) => t.product.id === filterProduct);

  const byStatus = (s: Status) => filtered.filter((t) => t.status === s);

  /* ─── API helpers ─── */
  async function moveTask(taskId: string, status: Status) {
    const prev = tasks.find(t => t.id === taskId)?.status;
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status } : t));
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        // Revert on failure
        setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: prev! } : t));
        console.error("Move failed:", await res.json());
      }
    } catch {
      setTasks((p) => p.map((t) => t.id === taskId ? { ...t, status: prev! } : t));
    }
  }

  async function updateTask(taskId: string, patch: Partial<Task>) {
    setTasks((p) => p.map((t) => t.id === taskId ? { ...t, ...patch } : t));
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
  }

  async function deleteTask(taskId: string) {
    setTasks((p) => p.filter((t) => t.id !== taskId));
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
  }

  async function addTask(status: Status) {
    if (!newTitle.trim()) return;
    const productId = filterProduct !== "all" ? filterProduct : (newProductId || products[0]?.id);
    if (!productId) return;

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newTitle, status, productId }),
      });
      if (res.status === 401) {
        alert("Session expired — please log out and log back in.");
        return;
      }
      const data = await res.json();
      if (data.task) setTasks((p) => [...p, data.task]);
      else if (data.error) alert(`Error: ${data.error}`);
    } catch (e) {
      alert("Network error — check the server is running.");
    }
    setNewTitle("");
    setAddingTo(null);
  }

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Task detail slide-in panel */}
      {detailTask && (
        <TaskDetailPanel
          task={detailTask as any}
          onClose={() => setDetailTask(null)}
          onUpdate={(patch) => {
            setTasks(p => p.map(t => t.id === detailTask.id ? { ...t, ...patch } : t));
            setDetailTask(prev => prev ? { ...prev, ...patch } : null);
          }}
        />
      )}
      {/* Filter bar — scrollable with arrows */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => scrollRef.current?.scrollBy({ left: -160, behavior: "smooth" })}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div ref={scrollRef} className="flex items-center gap-2 overflow-x-auto scrollbar-hide flex-1 px-1">
          <button
            onClick={() => setFilter("all")}
            className={clsx("flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
              filterProduct === "all" ? "bg-orange-500 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            )}
          >
            All products
          </button>
          {products.map((p) => (
            <button key={p.id} onClick={() => setFilter(p.id)}
              className={clsx("flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
                filterProduct === p.id ? "bg-slate-700 text-white border border-slate-600" : "bg-slate-800 text-slate-400 hover:text-white"
              )}
            >
              {p.name}
            </button>
          ))}
        </div>

        <button
          onClick={() => scrollRef.current?.scrollBy({ left: 160, behavior: "smooth" })}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Board */}
      <div className="flex-1 grid grid-cols-4 gap-3 min-h-0 overflow-x-auto">
        {COLUMNS.map(({ id, label, accent }) => {
          const col = byStatus(id);
          return (
            <div
              key={id}
              className="flex flex-col bg-slate-900/50 rounded-xl border border-slate-800 min-w-[220px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const tid = e.dataTransfer.getData("taskId");
                if (tid) moveTask(tid, id);
              }}
            >
              {/* Column header */}
              <div className={`flex items-center gap-2 px-3 py-3 border-b-2 border-l-0 border-r-0 border-t-0 ${accent}`}>
                <span className="text-xs font-semibold text-white">{label}</span>
                <span className="ml-auto text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded-full">{col.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 p-2 space-y-2 overflow-y-auto">
                {col.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    users={users}
                    onDragStart={() => setDragging(task.id)}
                    onDragEnd={() => setDragging(null)}
                    isDragging={dragging === task.id}
                    onDelete={() => deleteTask(task.id)}
                    onUpdate={(patch) => updateTask(task.id, patch)}
                    onOpenDetail={() => setDetailTask(task)}
                  />
                ))}

                {/* Add card */}
                {addingTo === id ? (
                  <div className="bg-slate-800 rounded-lg p-2 border border-slate-700">
                    <textarea
                      autoFocus rows={2} value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="Task title..."
                      className="w-full bg-transparent text-xs text-white placeholder-slate-500 resize-none outline-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); addTask(id); }
                        if (e.key === "Escape") { setAddingTo(null); setNewTitle(""); }
                      }}
                    />
                    {filterProduct === "all" && products.length > 1 && (
                      <select
                        value={newProductId}
                        onChange={(e) => setNewProd(e.target.value)}
                        className="w-full mt-1 bg-slate-700 text-xs text-slate-300 rounded px-1 py-0.5 outline-none border-0"
                      >
                        {products.map((p) => <option key={p.id} value={p.id}>{p.emoji} {p.name}</option>)}
                      </select>
                    )}
                    <div className="flex gap-1 mt-1.5">
                      <button onClick={() => addTask(id)} className="text-[11px] bg-orange-500 text-white px-2 py-0.5 rounded font-medium">Add</button>
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

/* ─── Task Card ─── */
function TaskCard({
  task, users, onDragStart, onDragEnd, isDragging, onDelete, onUpdate, onOpenDetail,
}: {
  task: Task;
  users: User[];
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
  onDelete: () => void;
  onUpdate: (patch: any) => void;
  onOpenDetail: () => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft,   setTitleDraft]   = useState(task.title);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  function startEdit(e: React.MouseEvent) {
    e.stopPropagation();
    setTitleDraft(task.title);
    setEditingTitle(true);
    setTimeout(() => { titleRef.current?.focus(); titleRef.current?.select(); }, 0);
  }

  function saveTitle() {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== task.title) onUpdate({ title: trimmed });
    else setTitleDraft(task.title);
    setEditingTitle(false);
  }

  const diff = DIFFICULTY[task.priority];
  const assigneeColor = AVATAR_COLORS[task.assignee?.name ?? ""] ?? "bg-slate-700 text-slate-400";

  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.setData("taskId", task.id); onDragStart(); }}
      onDragEnd={onDragEnd}
      className={clsx(
        "bg-slate-800/80 rounded-lg p-3 border border-slate-700/50 cursor-grab active:cursor-grabbing hover:border-slate-600 transition-all group relative",
        isDragging && "ring-2 ring-orange-500/50"
      )}
    >
      {/* Top-right action buttons — always visible */}
      <div className="absolute top-2 right-2 flex items-center gap-1.5">
        <button
          onClick={(e) => { e.stopPropagation(); onOpenDetail(); }}
          className="relative text-slate-400 hover:text-orange-400 transition-colors"
          title="Open notes"
        >
          <FileText className="w-3.5 h-3.5" />
          {task.description && task.description.trim().length > 0 && (
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-orange-500 border border-slate-800" />
          )}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="text-slate-400 hover:text-red-400 transition-colors"
          title="Delete task"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Product tag */}
      <div className="flex items-center gap-1.5 mb-2">
        <span
          className="text-[10px] font-medium px-1.5 py-0.5 rounded"
          style={{ backgroundColor: `${task.product.color}20`, color: task.product.color }}
        >
          {task.product.name}
        </span>
        {task.slackSynced && <Slack className="w-3 h-3 text-purple-400" />}
      </div>

      {/* Title — double-click to rename */}
      {editingTitle ? (
        <textarea
          ref={titleRef}
          value={titleDraft}
          rows={2}
          onChange={(e) => setTitleDraft(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); saveTitle(); }
            if (e.key === "Escape") { setTitleDraft(task.title); setEditingTitle(false); }
          }}
          className="w-full bg-slate-700 text-xs text-white font-medium leading-snug mb-3 pr-2 rounded px-2 py-1 resize-none outline-none focus:ring-2 focus:ring-orange-500/40 border border-orange-500/30"
        />
      ) : (
        <p
          onDoubleClick={startEdit}
          className="text-xs text-white font-medium leading-snug mb-3 pr-8 cursor-text"
          title="Double-click to rename"
        >
          {task.title}
        </p>
      )}

      {/* Difficulty selector */}
      <div className="flex items-center gap-2 mb-2">
        <select
          value={task.priority}
          onChange={(e) => onUpdate({ priority: e.target.value })}
          className={`${diff.bg} ${diff.color} border-0 text-[10px] font-medium rounded px-1.5 py-0.5 cursor-pointer outline-none`}
        >
          <option value="LOW">Easy</option>
          <option value="MEDIUM">Medium</option>
          <option value="HIGH">Hard</option>
          <option value="URGENT">Expert</option>
        </select>

        {task.dueDate && (
          <span className="flex items-center gap-1 text-[10px] text-slate-500 ml-auto">
            <CalendarDays className="w-3 h-3" />
            {format(new Date(task.dueDate), "MMM d")}
          </span>
        )}
      </div>

      {/* Assignee selector */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-700/50">
        {task.assignee ? (
          <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${assigneeColor}`}>
            <span className="text-[9px] font-bold">{task.assignee.name[0]}</span>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-slate-700 border border-dashed border-slate-600 flex items-center justify-center flex-shrink-0">
            <span className="text-[9px] text-slate-500">?</span>
          </div>
        )}
        <select
          value={task.assignee?.id ?? ""}
          onChange={(e) => {
            const user = users.find((u) => u.id === e.target.value) ?? null;
            onUpdate({ assigneeId: e.target.value || null, assignee: user });
          }}
          className="flex-1 bg-transparent text-[10px] text-slate-400 outline-none cursor-pointer border-0"
        >
          <option value="">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
