"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const STATUS_STYLES: Record<string, { bg: string; color: string; dot: string }> = {
  draft:     { bg: "oklch(0.5 0.04 265 / 15%)", color: "oklch(0.65 0.05 265)", dot: "oklch(0.55 0.04 265)" },
  sent:      { bg: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.75 0.18 265)", dot: "oklch(0.65 0.22 265)" },
  closed:    { bg: "oklch(0.6 0.18 200 / 15%)", color: "oklch(0.7 0.15 200)", dot: "oklch(0.65 0.18 200)" },
  awarded:   { bg: "oklch(0.72 0.2 155 / 15%)", color: "oklch(0.72 0.2 155)", dot: "oklch(0.72 0.2 155)" },
  cancelled: { bg: "oklch(0.62 0.22 25 / 15%)", color: "oklch(0.7 0.18 25)", dot: "oklch(0.62 0.22 25)" },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium capitalize" style={{background: s.bg, color: s.color}}>
      <span className="w-1.5 h-1.5 rounded-full" style={{background: s.dot}} />
      {status}
    </span>
  );
}

export default function RFQsPage() {
  const [rfqs, setRfqs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRfqs = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      setRfqs(await res.json());
    }
    setLoading(false);
  };

  useEffect(() => { fetchRfqs(); }, []);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">RFQs</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage your Requests for Quotation</p>
        </div>
        <Link href="/dashboard/rfqs/new">
          <Button className="rounded-xl font-semibold" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 4px 16px oklch(0.65 0.22 265 / 30%)"}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            New RFQ
          </Button>
        </Link>
      </div>

      {/* Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center justify-between" style={{borderColor: "oklch(0.25 0.03 265 / 40%)"}}>
          <p className="text-sm font-medium text-foreground">{rfqs.length} request{rfqs.length !== 1 ? "s" : ""}</p>
        </div>

        {loading ? (
          <div className="p-6 space-y-3">
            {[1,2,3].map(i => <div key={i} className="shimmer h-14 rounded-xl" />)}
          </div>
        ) : rfqs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{background: "oklch(0.65 0.22 265 / 10%)"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 265)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <p className="text-foreground font-medium">No RFQs yet</p>
            <p className="text-muted-foreground text-sm mt-1">Create your first RFQ to get started</p>
            <Link href="/dashboard/rfqs/new" className="mt-4">
              <Button size="sm" variant="outline" className="rounded-xl">Create RFQ</Button>
            </Link>
          </div>
        ) : (
          <div className="divide-y" style={{borderColor: "oklch(0.18 0.02 265 / 60%)"}}>
            {/* Header row */}
            <div className="grid grid-cols-5 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="col-span-2">Product</span>
              <span>Quantity</span>
              <span>Deadline</span>
              <span>Status</span>
            </div>
            {rfqs.map((rfq) => (
              <div key={rfq.id} className="grid grid-cols-5 px-6 py-4 items-center transition-colors hover:bg-muted/20 group">
                <div className="col-span-2 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{background: "oklch(0.65 0.22 265 / 15%)"}}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.75 0.18 265)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  </div>
                  <Link href={`/dashboard/rfqs/${rfq.id}`} className="font-medium text-sm text-foreground hover:text-primary transition-colors group-hover:underline">
                    {rfq.product_name}
                  </Link>
                </div>
                <span className="text-sm text-muted-foreground">{rfq.quantity}</span>
                <span className="text-sm text-muted-foreground">{new Date(rfq.submission_deadline).toLocaleDateString()}</span>
                <StatusBadge status={rfq.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
