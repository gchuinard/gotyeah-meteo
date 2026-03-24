"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",           icon: "home",          label: "Home" },
  { href: "/search",     icon: "search",        label: "Search" },
  { href: "/favorites",  icon: "favorite",      label: "Favorites" },
  { href: "/alerts",     icon: "notifications", label: "Alerts" },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 w-full z-50 rounded-t-[1.5rem] bg-slate-900/40 backdrop-blur-3xl shadow-[0_-8px_32px_0_rgba(0,30,44,0.06)] bg-gradient-to-t from-white/5 to-transparent">
      <div className="flex justify-around items-center px-4 pb-6 pt-2">
        {NAV_ITEMS.map(({ href, icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={[
                "flex flex-col items-center justify-center px-4 py-2 rounded-xl active:scale-90 transition-all duration-200",
                isActive
                  ? "bg-sky-500/20 text-sky-300"
                  : "text-slate-400 hover:text-slate-200",
              ].join(" ")}
            >
              <span className="material-symbols-outlined">{icon}</span>
              <span className="text-[10px] font-medium uppercase tracking-widest mt-1">
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
