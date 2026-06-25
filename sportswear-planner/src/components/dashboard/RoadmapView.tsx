"use client";

import { useMemo } from "react";
import {
  eachWeekOfInterval,
  format,
  startOfMonth,
  endOfMonth,
  addMonths,
  isWithinInterval,
  differenceInDays,
  startOfDay,
} from "date-fns";
import { clsx } from "clsx";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  startDate: Date | null;
  dueDate: Date | null;
}

interface Product {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: string;
  targetDate: Date | null;
  tasks: Task[];
}

const STATUS_DOT: Record<string, string> = {
  TODO: "bg-slate-500",
  IN_PROGRESS: "bg-yellow-400",
  IN_REVIEW: "bg-sky-400",
  DONE: "bg-emerald-400",
};

export default function RoadmapView({ products }: { products: Product[] }) {
  const today = startOfDay(new Date());
  const rangeStart = startOfMonth(today);
  const rangeEnd = endOfMonth(addMonths(today, 4)); // 5-month window

  const totalDays = differenceInDays(rangeEnd, rangeStart) + 1;

  const months = useMemo(() => {
    const result = [];
    let cur = rangeStart;
    while (cur <= rangeEnd) {
      result.push(cur);
      cur = addMonths(cur, 1);
    }
    return result;
  }, []);

  function dayOffset(date: Date) {
    return Math.max(0, differenceInDays(startOfDay(date), rangeStart));
  }

  function barStyle(task: Task) {
    const start = task.startDate ? startOfDay(new Date(task.startDate)) : startOfDay(new Date(task.dueDate!));
    const end = startOfDay(new Date(task.dueDate!));
    const left = (dayOffset(start) / totalDays) * 100;
    const width = Math.max(1, (differenceInDays(end, start) + 1) / totalDays * 100);
    return { left: `${left}%`, width: `${width}%` };
  }

  const todayLeft = `${(dayOffset(today) / totalDays) * 100}%`;

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-4xl mb-3">🗓</p>
        <p className="text-slate-300 font-medium">No roadmap data yet</p>
        <p className="text-sm mt-1">Add due dates to tasks to see them on the timeline.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-500">
          {format(rangeStart, "MMM yyyy")} – {format(rangeEnd, "MMM yyyy")}
        </p>
        <div className="flex items-center gap-4 text-xs text-slate-500">
          {Object.entries(STATUS_DOT).map(([status, dot]) => (
            <span key={status} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {status.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {/* Month headers */}
        <div className="flex border-b border-slate-800 bg-slate-950/50">
          <div className="w-52 flex-shrink-0 px-4 py-2 border-r border-slate-800">
            <span className="text-xs text-slate-500">Product</span>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <div className="flex">
              {months.map((m) => {
                const daysInMonth = differenceInDays(
                  endOfMonth(m),
                  startOfMonth(m) < rangeStart ? rangeStart : startOfMonth(m)
                ) + 1;
                const pct = (daysInMonth / totalDays) * 100;
                return (
                  <div
                    key={m.toString()}
                    className="border-r border-slate-800/50 py-2 px-2 text-[11px] text-slate-400 font-medium"
                    style={{ width: `${pct}%`, minWidth: "50px" }}
                  >
                    {format(m, "MMM")}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Product rows */}
        {products.map((product) => (
          <div key={product.id} className="border-b border-slate-800/50 last:border-0">
            {/* Product name row */}
            <div className="flex items-center bg-slate-900/80">
              <div className="w-52 flex-shrink-0 px-4 py-3 border-r border-slate-800/50 flex items-center gap-2">
                <span className="text-base">{product.emoji}</span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white truncate">{product.name}</p>
                  <p className="text-[10px] text-slate-500">{product.tasks.length} tasks</p>
                </div>
              </div>
              <div className="flex-1 relative h-10 overflow-hidden">
                {/* Today line */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-brand-500/60 z-10"
                  style={{ left: todayLeft }}
                />
                {/* Target date marker */}
                {product.targetDate && (
                  <div
                    className="absolute top-1 bottom-1 w-0.5 rounded-full opacity-40"
                    style={{ left: `${(dayOffset(new Date(product.targetDate)) / totalDays) * 100}%`, backgroundColor: product.color }}
                    title={`Target: ${format(new Date(product.targetDate), "MMM d")}`}
                  />
                )}
                {/* Product-level progress bar */}
                {product.targetDate && (
                  <div
                    className="absolute top-3.5 h-3 rounded opacity-20"
                    style={{
                      left: 0,
                      width: `${(dayOffset(new Date(product.targetDate)) / totalDays) * 100}%`,
                      backgroundColor: product.color,
                    }}
                  />
                )}
              </div>
            </div>

            {/* Task bars */}
            {product.tasks.filter((t) => t.dueDate).map((task) => (
              <div key={task.id} className="flex items-center hover:bg-slate-800/30 transition-colors">
                <div className="w-52 flex-shrink-0 px-4 py-1.5 border-r border-slate-800/30">
                  <p className="text-[11px] text-slate-400 truncate pl-6">{task.title}</p>
                </div>
                <div className="flex-1 relative h-7">
                  {/* Today line */}
                  <div
                    className="absolute top-0 bottom-0 w-px bg-brand-500/20 z-10"
                    style={{ left: todayLeft }}
                  />
                  {/* Task bar */}
                  <div
                    className="absolute top-1 bottom-1 rounded flex items-center px-1.5 overflow-hidden"
                    style={{
                      ...barStyle(task),
                      backgroundColor: `${product.color}30`,
                      borderLeft: `3px solid ${product.color}`,
                    }}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${STATUS_DOT[task.status] ?? "bg-slate-500"}`}
                    />
                    <span className="text-[9px] text-white/70 ml-1 truncate">{task.title}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Legend: today */}
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="w-4 h-px bg-brand-500/60" />
        <span>Today ({format(today, "MMM d, yyyy")})</span>
      </div>
    </div>
  );
}
