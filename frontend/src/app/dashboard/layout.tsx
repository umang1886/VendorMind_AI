"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";

const NAV_ITEMS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    exact: true,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/rfqs",
    label: "RFQs",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: "/dashboard/vendors",
    label: "Vendor Directory",
    exact: false,
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    } else {
      setLoading(false);
    }
  }, [router]);

  if (loading) return null;

  return (
    <div className="flex min-h-screen bg-background relative overflow-hidden">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      {/* Sidebar */}
      <aside className="relative z-10 w-64 flex flex-col shrink-0" style={{background: "oklch(0.11 0.02 265 / 90%)", borderRight: "1px solid oklch(0.25 0.03 265 / 50%)", backdropFilter: "blur(20px)"}}>
        {/* Logo */}
        <div className="p-5 border-b" style={{borderColor: "oklch(0.22 0.03 265 / 50%)"}}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 0 16px oklch(0.65 0.22 265 / 40%)"}}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
              </svg>
            </div>
            <div>
              <p className="font-bold text-sm text-foreground">VendorMind</p>
              <p className="text-xs" style={{color: "oklch(0.65 0.22 265)"}}>AI Procurement</p>
            </div>
          </div>
        </div>

        {/* AI Status pill */}
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{background: "oklch(0.72 0.2 155 / 10%)", border: "1px solid oklch(0.72 0.2 155 / 20%)"}}>
            <span className="pulse-dot" />
            <span style={{color: "oklch(0.72 0.2 155)"}}>CascadeFlow Active</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="px-3 flex-1 space-y-1 py-2">
          <p className="text-xs font-semibold px-3 py-2 uppercase tracking-widest" style={{color: "oklch(0.45 0.04 265)"}}>Navigation</p>
          {NAV_ITEMS.map((item) => {
            const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150"
                style={active ? {
                  background: "oklch(0.65 0.22 265 / 15%)",
                  color: "oklch(0.75 0.18 265)",
                  border: "1px solid oklch(0.65 0.22 265 / 25%)",
                } : {
                  color: "oklch(0.6 0.04 265)",
                  border: "1px solid transparent",
                }}
              >
                <span style={active ? {color: "oklch(0.75 0.18 265)"} : {color: "oklch(0.45 0.04 265)"}}>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t" style={{borderColor: "oklch(0.22 0.03 265 / 50%)"}}>
          <button
            onClick={() => { localStorage.removeItem("token"); router.push("/login"); }}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium w-full transition-all duration-150 hover:bg-muted/40"
            style={{color: "oklch(0.55 0.04 265)"}}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="relative z-10 flex-1 overflow-auto p-8">
        {children}
      </main>
    </div>
  );
}
