"use client";

import { useEffect, useState } from "react";

const STAT_ICONS = [
  <svg key="rfq" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>,
  <svg key="active" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  <svg key="vendors" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
];

const STAT_COLORS = [
  "oklch(0.65 0.22 265)",
  "oklch(0.72 0.2 155)",
  "oklch(0.7 0.18 200)",
];

export default function DashboardPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/dashboard/metrics`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      });
  }, []);

  const stats = [
    { label: "Total RFQs", value: metrics?.total_rfqs ?? 0 },
    { label: "Active RFQs", value: metrics?.active_rfqs ?? 0 },
    { label: "Total Vendors", value: metrics?.total_vendors ?? 0 },
  ];

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Dashboard</h1>
        <p className="text-muted-foreground mt-1 text-sm">Your AI-powered procurement command center</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((stat, i) => (
          <div key={stat.label} className="glass-card rounded-2xl p-5 stat-card">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">{stat.label}</p>
                <p className="text-4xl font-bold text-foreground">
                  {loading ? <span className="shimmer inline-block w-16 h-9 rounded-lg" /> : stat.value}
                </p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background: `${STAT_COLORS[i]}18`, color: STAT_COLORS[i]}}>
                {STAT_ICONS[i]}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Top Vendors */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{borderColor: "oklch(0.25 0.03 265 / 40%)"}}>
          <div>
            <h2 className="font-semibold text-foreground">Top Rated Vendors</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Ranked by AI trust score</p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs" style={{background: "oklch(0.65 0.22 265 / 10%)", color: "oklch(0.75 0.18 265)", border: "1px solid oklch(0.65 0.22 265 / 20%)"}}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            Trust Scoring Active
          </div>
        </div>
        {loading ? (
          <div className="p-8 space-y-3">
            {[1,2,3].map(i => <div key={i} className="shimmer h-10 rounded-xl" />)}
          </div>
        ) : !metrics?.top_vendors?.length ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{background: "oklch(0.65 0.22 265 / 10%)"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 265)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <p className="text-muted-foreground text-sm">No rated vendors yet.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Complete RFQs and rate vendors to populate this list.</p>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "oklch(0.2 0.02 265 / 50%)"}}>
            {metrics.top_vendors.map((v: any, i: number) => (
              <div key={v.id} className="flex items-center justify-between px-6 py-3.5 transition-colors hover:bg-muted/20">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-bold w-6 text-center" style={{color: i === 0 ? "oklch(0.8 0.18 80)" : "oklch(0.5 0.04 265)"}}>#{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold" style={{background: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.75 0.18 265)"}}>
                    {v.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-medium text-sm">{v.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(star => (
                      <svg key={star} width="12" height="12" viewBox="0 0 24 24" fill={star <= Math.round(v.trust_score) ? "oklch(0.8 0.18 80)" : "none"} stroke="oklch(0.8 0.18 80)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                    ))}
                  </div>
                  <span className="text-sm font-semibold ml-1" style={{color: v.trust_score >= 4 ? "oklch(0.72 0.2 155)" : v.trust_score >= 3 ? "oklch(0.8 0.18 80)" : "oklch(0.65 0.2 25)"}}>
                    {v.trust_score}/5
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
