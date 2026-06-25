"use client";

import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { X, CalendarDays, FileText, Clock, Slack } from "lucide-react";
import { clsx } from "clsx";

type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
type Status   = "TODO" | "IN_PROGRESS" | "IN_REVIEW" | "DONE";

interface Task {
  id:          string;
  title:       string;
  status:      Status;
  priority:    Priority;
  description: string | null;
  dueDate:     Date | null;
  slackSynced: boolean;
  createdAt:   Date;
  product:     { id: string; name: string; color: string };
  assignee:    { id: string; name: string } | null;
}

const AVATAR_COLORS: Record<string, string> = {
  Aldair: "bg-orange-500/20 text-orange-400",
  Seamus: "bg-sky-500/20 text-sky-400",
  Justin: "bg-emerald-500/20 text-emerald-400",
};

export default function TaskDetailPanel({
  task,
  onClose,
  onUpdate,
}: {
  task:     Task;
  onClose:  () => void;
  onUpdate: (patch: Partial<Task>) => void;
}) {
  const [notes,   setNotes]   = useState(task.description ?? "");
  const [dueDate, setDueDate] = useState(
    task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : ""
  );
  const [saving, setSaving]   = useState(false);
  const [saved,  setSaved]    = useState(false);
  const saveTimer             = useRef<NodeJS.Timeout>();

  // Auto-save notes with 800ms debounce
  useEffect(() => {
    if (notes === (task.description ?? "")) return;
    clearTimeout(saveTimer.current);
    setSaved(false);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await fetch(`/api/tasks/${task.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ description: notes }),
      });
      onUpdate({ description: notes } as any);
      setSaving(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [notes]);

  // Save due date immediately on change
  async function handleDueDate(val: string) {
    setDueDate(val);
    const parsed = val ? new Date(val) : null;
    await fetch(`/api/tasks/${task.id}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ dueDate: parsed }),
    });
    onUpdate({ dueDate: parsed } as any);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const avatarCls = AVATAR_COLORS[task.assignee?.name ?? ""] ?? "bg-slate-700 text-slate-400";

  return (
    <>
      {/* Backdrop — click to close */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[400px] max-w-full z-50 flex flex-col bg-slate-950 border-l border-slate-800 shadow-2xl animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-slate-400" />
            <span className="text-sm font-semibold text-white">Task Notes</span>
          </div>
          <div className="flex items-center gap-3">
            {saving && <span className="text-[11px] text-slate-500">Saving…</span>}
            {saved  && <span className="text-[11px] text-emerald-400">Saved ✓</span>}
            <button
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Task title */}
          <div>
            <span
              className="inline-block text-[11px] font-medium px-2 py-0.5 rounded mb-2"
              style={{ backgroundColor: `${task.product.color}22`, color: task.product.color }}
            >
              {task.product.name}
            </span>
            <h2 className="text-base font-semibold text-white leading-snug">{task.title}</h2>
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-3 flex-wrap">
            {task.assignee && (
              <div className="flex items-center gap-1.5">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center ${avatarCls}`}>
                  <span className="text-[9px] font-bold">{task.assignee.name[0]}</span>
                </div>
                <span className="text-xs text-slate-400">{task.assignee.name}</span>
              </div>
            )}
            {task.slackSynced && (
              <div className="flex items-center gap-1 text-[11px] text-purple-400">
                <Slack className="w-3 h-3" /> Slack
              </div>
            )}
            {task.createdAt && (
              <div className="flex items-center gap-1 text-[11px] text-slate-600 ml-auto">
                <Clock className="w-3 h-3" />
                Created {format(new Date(task.createdAt), "MMM d, yyyy")}
              </div>
            )}
          </div>

          <div className="border-t border-slate-800" />

          {/* Due date */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5" /> Due Date
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => handleDueDate(e.target.value)}
              className="input text-sm w-full"
              style={{ colorScheme: "dark" }}
            />
            {dueDate && (
              <button
                onClick={() => handleDueDate("")}
                className="text-[11px] text-slate-600 hover:text-red-400 mt-1.5 transition-colors"
              >
                Clear date
              </button>
            )}
          </div>

          {/* Notes */}
          <div className="flex-1">
            <label className="block text-xs font-medium text-slate-400 mb-2 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" /> Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes, links, context… auto-saves as you type."
              rows={12}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500/40 resize-none transition-all leading-relaxed"
            />
          </div>
        </div>
      </div>
    </>
  );
}
