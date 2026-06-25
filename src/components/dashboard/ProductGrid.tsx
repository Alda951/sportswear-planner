"use client";

import { useState, useMemo, useRef } from "react";
import { format } from "date-fns";
import Link from "next/link";
import { CalendarDays, ArrowRight, CheckCircle2, Circle, Clock, Rocket, RotateCcw, X, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

const STATUS_CONFIG = {
  IN_DEVELOPMENT: { label: "In Development", color: "text-yellow-400",  bg: "bg-yellow-400/10",  dot: "bg-yellow-400" },
  IN_MANUFACTURE: { label: "In Manufacture", color: "text-orange-400",  bg: "bg-orange-400/10",  dot: "bg-orange-400" },
  IN_REVIEW:      { label: "In Review",      color: "text-sky-400",     bg: "bg-sky-400/10",     dot: "bg-sky-400" },
  LAUNCHED:       { label: "Launched",       color: "text-emerald-400", bg: "bg-emerald-400/10", dot: "bg-emerald-400" },
};

type ProductStatus = keyof typeof STATUS_CONFIG;

interface Product {
  id:         string;
  name:       string;
  emoji:      string;
  color:      string;
  status:     ProductStatus;
  category:   string | null;
  sport:      string | null;
  targetDate: Date | null;
  progress:   number;
  taskStats:  { total: number; done: number; inProgress: number; inReview: number };
}

type SortKey = "none" | "date-asc" | "date-desc" | "name";

// ─── Confirm modal ────────────────────────────────────────────────────────────
function ConfirmModal({
  product,
  action,
  onConfirm,
  onCancel,
}: {
  product:   Product;
  action:    "launch" | "revert";
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  const isLaunch = action === "launch";
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-sm p-6 animate-fade-in">
        {/* Icon */}
        <div className={clsx(
          "w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4",
          isLaunch ? "bg-emerald-500/10" : "bg-slate-700"
        )}>
          {isLaunch
            ? <Rocket className="w-6 h-6 text-emerald-400" />
            : <RotateCcw className="w-6 h-6 text-slate-400" />
          }
        </div>

        <h3 className="text-white font-semibold text-center mb-1">
          {isLaunch ? "Mark as Launched?" : "Revert to In Review?"}
        </h3>
        <p className="text-slate-400 text-sm text-center mb-6">
          {isLaunch
            ? <><span className="text-white font-medium">{product.name}</span> will be marked as shipped and live. You can revert this anytime.</>
            : <><span className="text-white font-medium">{product.name}</span> will go back to In Review status.</>
          }
        </p>

        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2 rounded-lg text-sm font-medium text-slate-400 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={clsx(
              "flex-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors",
              isLaunch ? "bg-emerald-600 hover:bg-emerald-500" : "bg-slate-600 hover:bg-slate-500"
            )}
          >
            {isLaunch ? "Yes, launch it 🚀" : "Revert"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Filter chip ─────────────────────────────────────────────────────────────
function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "px-3 py-1 rounded-lg text-xs font-medium transition-all border",
        active
          ? "bg-orange-500/20 text-orange-400 border-orange-500/40"
          : "bg-slate-800 text-slate-400 hover:text-white border-slate-700 hover:border-slate-600"
      )}
    >
      {children}
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ProductGrid({ products: initialProducts }: { products: Product[] }) {
  const [products,       setProducts]       = useState<Product[]>(initialProducts);
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterSport,    setFilterSport]    = useState("all");
  const [sortKey,        setSortKey]        = useState<SortKey>("none");
  const [confirm, setConfirm] = useState<{ product: Product; action: "launch" | "revert" } | null>(null);
  const catScrollRef   = useRef<HTMLDivElement>(null);
  const sportScrollRef = useRef<HTMLDivElement>(null);

  const categories = useMemo(() =>
    ["all", ...Array.from(new Set(products.map(p => p.category ?? "").filter(Boolean)))],
    [products]
  );
  const sports = useMemo(() =>
    ["all", ...Array.from(new Set(products.map(p => p.sport ?? "").filter(Boolean)))],
    [products]
  );

  const filtered = useMemo(() => {
    let r = products;
    if (filterCategory !== "all") r = r.filter(p => p.category === filterCategory);
    if (filterSport    !== "all") r = r.filter(p => p.sport    === filterSport);
    if (sortKey === "date-asc")  r = [...r].sort((a, b) => (!a.targetDate ? 1 : !b.targetDate ? -1 : new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime()));
    if (sortKey === "date-desc") r = [...r].sort((a, b) => (!a.targetDate ? 1 : !b.targetDate ? -1 : new Date(b.targetDate).getTime() - new Date(a.targetDate).getTime()));
    if (sortKey === "name")      r = [...r].sort((a, b) => a.name.localeCompare(b.name));
    // Always push Launched products to the bottom
    r = [...r].sort((a, b) => {
      if (a.status === "LAUNCHED" && b.status !== "LAUNCHED") return 1;
      if (b.status === "LAUNCHED" && a.status !== "LAUNCHED") return -1;
      return 0;
    });
    return r;
  }, [products, filterCategory, filterSport, sortKey]);

  async function changeStatus(product: Product, status: ProductStatus) {
    // Optimistic update
    setProducts(prev => prev.map(p => p.id === product.id ? { ...p, status } : p));
    setConfirm(null);
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
  }

  if (products.length === 0) {
    return (
      <div className="text-center py-20 text-slate-500">
        <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-600">
          <Circle className="w-6 h-6" />
        </div>
        <p className="font-medium text-slate-300 mb-1">No products yet</p>
        <p className="text-sm">Sync your Google Sheet or add a product manually.</p>
      </div>
    );
  }

  return (
    <>
      {/* Confirm modal */}
      {confirm && (
        <ConfirmModal
          product={confirm.product}
          action={confirm.action}
          onConfirm={() => changeStatus(
            confirm.product,
            confirm.action === "launch" ? "LAUNCHED" : "IN_REVIEW"
          )}
          onCancel={() => setConfirm(null)}
        />
      )}

      <div className="space-y-4">
        {/* Filter / sort bar */}
        <div className="flex items-center gap-2 min-w-0">

          {/* Label + count */}
          <h2 className="text-sm font-semibold text-white flex-shrink-0">Products</h2>
          <span className="text-xs text-slate-500 flex-shrink-0">{filtered.length}/{products.length}</span>

          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

          {/* Category — independent scroll */}
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold flex-shrink-0">Category</span>
          <button
            onClick={() => catScrollRef.current?.scrollBy({ left: -140, behavior: "smooth" })}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <div ref={catScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ maxWidth: "260px" }}>
            {categories.map(cat => (
              <Chip key={cat} active={filterCategory === cat} onClick={() => setFilterCategory(cat)}>
                {cat === "all" ? "All" : cat}
              </Chip>
            ))}
          </div>
          <button
            onClick={() => catScrollRef.current?.scrollBy({ left: 140, behavior: "smooth" })}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

          {/* Sport — independent scroll */}
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold flex-shrink-0">Sport</span>
          <button
            onClick={() => sportScrollRef.current?.scrollBy({ left: -140, behavior: "smooth" })}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <div ref={sportScrollRef} className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide" style={{ maxWidth: "260px" }}>
            {sports.map(s => (
              <Chip key={s} active={filterSport === s} onClick={() => setFilterSport(s)}>
                {s === "all" ? "All" : s === "Flag Football" ? "Flag" : s}
              </Chip>
            ))}
          </div>
          <button
            onClick={() => sportScrollRef.current?.scrollBy({ left: 140, behavior: "smooth" })}
            className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors border border-slate-700"
          >
            <ChevronRight className="w-3 h-3" />
          </button>

          <div className="w-px h-4 bg-slate-700 flex-shrink-0" />

          {/* Sort — always visible, fixed right */}
          <span className="text-[10px] text-slate-500 uppercase tracking-wide font-semibold flex-shrink-0">Sort</span>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <Chip active={sortKey === "date-asc"}  onClick={() => setSortKey(sortKey === "date-asc"  ? "none" : "date-asc")}>Date ↑</Chip>
            <Chip active={sortKey === "date-desc"} onClick={() => setSortKey(sortKey === "date-desc" ? "none" : "date-desc")}>Date ↓</Chip>
            <Chip active={sortKey === "name"}      onClick={() => setSortKey(sortKey === "name"      ? "none" : "name")}>A–Z</Chip>
          </div>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-500 py-10 text-center">No products match the selected filters.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map(product => (
              <ProductCard
                key={product.id}
                product={product}
                onLaunch={() => setConfirm({ product, action: "launch" })}
                onRevert={() => setConfirm({ product, action: "revert" })}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Product card ─────────────────────────────────────────────────────────────
function ProductCard({
  product, onLaunch, onRevert,
}: {
  product:  Product;
  onLaunch: () => void;
  onRevert: () => void;
}) {
  const sc      = STATUS_CONFIG[product.status] ?? STATUS_CONFIG.IN_DEVELOPMENT;
  const { total, done, inProgress } = product.taskStats;
  const initial = (product.category ?? product.name).charAt(0).toUpperCase();
  const isLaunched = product.status === "LAUNCHED";

  return (
    <div className={clsx(
      "group bg-slate-900 border rounded-xl overflow-hidden transition-all duration-200",
      isLaunched
        ? "border-emerald-500/30 opacity-80 hover:opacity-100"
        : "border-slate-800 hover:border-slate-700"
    )}>
      {/* Category colour bar */}
      <div className="h-1 w-full" style={{ backgroundColor: product.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm"
              style={{ backgroundColor: `${product.color}22`, color: product.color }}
            >
              {initial}
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm leading-tight">{product.name}</h3>
              <div className="flex items-center gap-2 mt-0.5">
                {product.category && <span className="text-[11px] text-slate-500">{product.category}</span>}
                {product.sport && product.sport !== "All" && (
                  <>
                    <span className="text-slate-700">·</span>
                    <span className="text-[11px] text-slate-500">{product.sport}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <span className={`badge ${sc.bg} ${sc.color} whitespace-nowrap`}>
            <span className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
            {sc.label}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs text-slate-500">Progress</span>
            <span className="text-xs font-bold" style={{ color: product.color }}>{product.progress}%</span>
          </div>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${product.progress}%`, backgroundColor: product.color }} />
          </div>
        </div>

        {/* Task stats */}
        <div className="flex items-center gap-4 mb-4 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />{done} done
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-yellow-400" />{inProgress} active
          </span>
          <span className="flex items-center gap-1.5">
            <Circle className="w-3.5 h-3.5 text-slate-600" />{total - done - inProgress} todo
          </span>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2">
          {product.targetDate ? (
            <span className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <CalendarDays className="w-3 h-3" />
              {format(new Date(product.targetDate), "MMM d, yyyy")}
            </span>
          ) : (
            <span className="text-[11px] text-slate-600">No date set</span>
          )}

          <div className="flex items-center gap-2">
            {/* Launch / Revert button */}
            {isLaunched ? (
              <button
                onClick={onRevert}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors"
                title="Revert to In Review"
              >
                <RotateCcw className="w-3 h-3" /> Revert
              </button>
            ) : (
              <button
                onClick={onLaunch}
                className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-400 transition-colors group-hover:text-emerald-400"
                title="Mark as Launched"
              >
                <Rocket className="w-3 h-3" /> Launch
              </button>
            )}

            <span className="text-slate-700">·</span>

            <Link
              href={`/kanban?product=${product.id}`}
              className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-orange-400 transition-colors"
            >
              Tasks <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
