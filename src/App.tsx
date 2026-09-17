/**
 * The shell: sidebar, header, and whichever route is showing.
 *
 * The sidebar used to be five `<button>`s with no `onClick` and `active: true` hardcoded on the
 * first — decoration that looked like navigation. They are `NavLink`s now, so the highlight follows
 * the URL instead of being asserted.
 */

import { FileImage, Gauge, Megaphone, ShieldCheck } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";
import { mediaApiUrl } from "./lib/api/client";
import { operatorId } from "./lib/operator";

const NAV = [
  { to: "/intake", label: "Batch intake", Icon: FileImage },
  { to: "/review", label: "Review queue", Icon: ShieldCheck },
  { to: "/batches", label: "Batches", Icon: Gauge },
  { to: "/published", label: "Published", Icon: Megaphone },
] as const;

export default function App() {
  return (
    <div className="min-h-screen bg-background text-text">
      <aside className="fixed left-0 top-0 hidden h-full w-[260px] flex-col bg-frame text-white lg:flex">
        <div className="flex h-16 items-center px-6 text-lg font-bold">LankaListings</div>
        <nav aria-label="Main navigation" className="space-y-1 px-3">
          {NAV.map(({ to, label, Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex w-full items-center gap-3 rounded px-4 py-3 text-left text-sm transition-colors ${
                  isActive
                    ? "border-l-4 border-emerald bg-white/10 font-bold text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
        <p className="mt-auto px-6 py-4 font-mono text-[11px] text-white/40">{mediaApiUrl}</p>
      </aside>

      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-line bg-surface/90 px-5 backdrop-blur lg:px-8">
          <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto lg:hidden">
            {NAV.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded px-3 py-1.5 text-sm ${
                    isActive ? "bg-frame font-bold text-white" : "text-subtle"
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto text-right">
            <p className="text-sm font-bold">{operatorId()}</p>
            <p className="text-xs uppercase text-subtle">Reviewer</p>
          </div>
        </header>

        <main className="p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
