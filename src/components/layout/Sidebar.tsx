"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Columns3,
  Map,
  ListTodo,
  LogOut,
} from "lucide-react";
import { clsx } from "clsx";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
  { href: "/kanban",    icon: Columns3,        label: "Progress" },
  { href: "/roadmap",  icon: Map,             label: "Roadmap" },
  { href: "/tasks",    icon: ListTodo,        label: "Tasks & Slack" },
];

interface Props {
  user?: { name?: string | null; email?: string | null; image?: string | null } | null;
}

export default function Sidebar({ user }: Props) {
  const pathname = usePathname();

  return (
    <aside className="w-60 flex-shrink-0 flex flex-col bg-slate-950 border-r border-slate-800/60 h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2.5">
          <svg className="w-8 h-8 flex-shrink-0" viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
            <rect width="32" height="32" rx="7" fill="black"/>
            {/* Top-left cube */}
            <polygon points="8,2 13.2,5 13.2,11 8,14 2.8,11 2.8,5" fill="white"/>
            <line x1="8" y1="8" x2="8"    y2="2"  stroke="black" strokeWidth="1.2"/>
            <line x1="8" y1="8" x2="13.2" y2="11" stroke="black" strokeWidth="1.2"/>
            <line x1="8" y1="8" x2="2.8"  y2="11" stroke="black" strokeWidth="1.2"/>
            {/* Top-right cube */}
            <polygon points="24,2 29.2,5 29.2,11 24,14 18.8,11 18.8,5" fill="white"/>
            <line x1="24" y1="8" x2="24"   y2="2"  stroke="black" strokeWidth="1.2"/>
            <line x1="24" y1="8" x2="29.2" y2="11" stroke="black" strokeWidth="1.2"/>
            <line x1="24" y1="8" x2="18.8" y2="11" stroke="black" strokeWidth="1.2"/>
            {/* Bottom-left cube */}
            <polygon points="8,18 13.2,21 13.2,27 8,30 2.8,27 2.8,21" fill="white"/>
            <line x1="8" y1="24" x2="8"    y2="18" stroke="black" strokeWidth="1.2"/>
            <line x1="8" y1="24" x2="13.2" y2="27" stroke="black" strokeWidth="1.2"/>
            <line x1="8" y1="24" x2="2.8"  y2="27" stroke="black" strokeWidth="1.2"/>
            {/* Bottom-right cube */}
            <polygon points="24,18 29.2,21 29.2,27 24,30 18.8,27 18.8,21" fill="white"/>
            <line x1="24" y1="24" x2="24"   y2="18" stroke="black" strokeWidth="1.2"/>
            <line x1="24" y1="24" x2="29.2" y2="27" stroke="black" strokeWidth="1.2"/>
            <line x1="24" y1="24" x2="18.8" y2="27" stroke="black" strokeWidth="1.2"/>
          </svg>
          <div>
            <p className="text-sm font-bold text-white leading-tight">Sportswear</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider">Planner</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] uppercase tracking-widest text-slate-600 px-3 mb-2 font-medium">
          Navigation
        </p>
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || (href !== "/dashboard" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                active
                  ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800/70"
              )}
            >
              <Icon className={clsx("w-4 h-4", active ? "text-brand-400" : "text-slate-500")} />
              {label}
              {active && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-brand-500" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* User */}
      <div className="px-3 py-4 border-t border-slate-800/60 space-y-1">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
          <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-brand-400">
              {user?.name?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? "U"}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-200 truncate">{user?.name ?? "User"}</p>
            <p className="text-[10px] text-slate-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
