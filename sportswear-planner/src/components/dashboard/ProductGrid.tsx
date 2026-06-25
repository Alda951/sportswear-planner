"use client";

import { format } from "date-fns";
import Link from "next/link";
import { CalendarDays, ArrowRight, CheckCircle2, Circle, Clock } from "lucide-react";

const STATUS_CONFIG = {
  PLANNING:       { label: "Planning",        color: "text-slate-400",  bg: "bg-slate-400/10",  dot: "bg-slate-400" },
  IN_DEVELOPMENT: { label: "In Development",  color: "text-yellow-400", bg: "bg-yellow-400/10", dot: "bg-yellow-400" },
  IN_REVIEW:      { label: "In Review",       color: "text-sky-400",    bg: "bg-sky-400/10",    dot: "bg-sky-400" },
  LAUNCHED:       { label: "Launched",        color: "text-emerald-400",bg: "bg-emerald-400/10",dot: "bg-emerald-400" },
  ON_HOLD:        { label: "On Hold",         color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400" },
};

interface Product {
  id: string;
  name: string;
  emoji: string;
  color: string;
  status: keyof typeof STATUS_CONFIG;
  category: string | null;
  targetDate: Date | null;
  progress: number;
  taskStats: { total: number; done: number; inProgress: number; inReview: number };
}

export default function ProductGrid({ products }: { products: Product[] }) {
  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <p className="text-4xl mb-3">👟</p>
        <p className="font-medium text-slate-300 mb-1">No products yet</p>
        <p className="text-sm">Sync Slack to import products, or add one manually.</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-white">Sportswear Products</h2>
        <span className="text-xs text-slate-500">{products.length} products</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}

function ProductCard({ product }: { product: Product }) {
  const sc = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.PLANNING;
  const { total, done, inProgress } = product.taskStats;

  return (
    <div className="group bg-slate-900 border border-slate-800 rounded-xl overflow-hidden hover:border-slate-700 transition-all duration-200">
      {/* Color bar */}
      <div className="h-1 w-full" style={{ backgroundColor: product.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
              style={{ backgroundColor: `${product.color}20` }}
            >
              {product.emoji}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight">{product.name}</h3>
              {product.category && (
                <p className="text-[11px] text-slate-500 mt-0.5">{product.category}</p>
              )}
            </div>
          </div>
          <span className={`badge ${sc.bg} ${sc.color}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot} animate-pulse-soft`} />
            {sc.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-bold" style={{ color: product.color }}>
              {product.progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${product.progress}%`, backgroundColor: product.color }}
            />
          </div>
        </div>

        {/* Task breakdown */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {done} done
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />
            {inProgress} active
          </span>
          <span className="flex items-center gap-1.5">
            <Circle className="w-3.5 h-3.5 text-slate-600" />
            {total - done - inProgress} todo
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          {product.targetDate ? (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CalendarDays className="w-3 h-3" />
              {format(new Date(product.targetDate), "MMM d, yyyy")}
            </span>
          ) : (
            <span />
          )}
          <Link
            href={`/kanban?product=${product.id}`}
            className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-brand-400 transition-colors group-hover:text-brand-400"
          >
            View tasks
            <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
