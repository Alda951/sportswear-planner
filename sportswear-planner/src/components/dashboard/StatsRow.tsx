import { CheckCircle2, Zap, Package, Rocket } from "lucide-react";

interface Stats {
  totalTasks: number;
  doneTasks: number;
  inProgressTasks: number;
  launched: number;
  totalProducts: number;
}

const STATS = (s: Stats) => [
  {
    label: "Total Products",
    value: s.totalProducts,
    icon: Package,
    color: "text-brand-400",
    bg: "bg-brand-500/10",
  },
  {
    label: "Tasks Done",
    value: `${s.doneTasks} / ${s.totalTasks}`,
    icon: CheckCircle2,
    color: "text-emerald-400",
    bg: "bg-emerald-500/10",
  },
  {
    label: "In Progress",
    value: s.inProgressTasks,
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10",
  },
  {
    label: "Launched",
    value: s.launched,
    icon: Rocket,
    color: "text-sky-400",
    bg: "bg-sky-500/10",
  },
];

export default function StatsRow({ stats }: { stats: Stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {STATS(stats).map(({ label, value, icon: Icon, color, bg }) => (
        <div
          key={label}
          className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center gap-4"
        >
          <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
          <div>
            <p className="text-xl font-bold text-white">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
