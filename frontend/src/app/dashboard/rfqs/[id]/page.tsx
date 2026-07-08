"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const STATUS_STYLES: Record<string, { bg: string; color: string }> = {
  draft:     { bg: "oklch(0.5 0.04 265 / 15%)",  color: "oklch(0.65 0.05 265)" },
  sent:      { bg: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.75 0.18 265)" },
  awarded:   { bg: "oklch(0.72 0.2 155 / 15%)",  color: "oklch(0.72 0.2 155)"  },
  closed:    { bg: "oklch(0.6 0.18 200 / 15%)",  color: "oklch(0.7 0.15 200)"  },
  cancelled: { bg: "oklch(0.62 0.22 25 / 15%)",  color: "oklch(0.7 0.18 25)"   },
};

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLES[status] || STATUS_STYLES.draft;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold capitalize" style={{background: s.bg, color: s.color}}>
      <span className="w-1.5 h-1.5 rounded-full" style={{background: s.color}} />
      {status}
    </span>
  );
}

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(star => (
        <button key={star} type="button" onClick={() => onChange(star)}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill={star <= value ? "oklch(0.8 0.18 80)" : "none"} stroke="oklch(0.8 0.18 80)" strokeWidth="2" className="transition-transform hover:scale-110"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        </button>
      ))}
    </div>
  );
}

export default function RFQDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [rfq, setRfq] = useState<any>(null);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [recommendation, setRecommendation] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [recommending, setRecommending] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingVendorId, setRatingVendorId] = useState("");
  const [ratingData, setRatingData] = useState({ delivery: 5, quality: 5, comms: 5, support: 5, comments: "" });

  const fetchData = async () => {
    const token = localStorage.getItem("token");
    const [rfqRes, qtRes] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}`, { headers: { Authorization: `Bearer ${token}` } }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}/quotations`, { headers: { Authorization: `Bearer ${token}` } })
    ]);
    if (rfqRes.ok) setRfq(await rfqRes.json());
    if (qtRes.ok) setQuotations(await qtRes.json());
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [id]);

  const handleRecommend = async () => {
    setRecommending(true);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}/ai/recommend`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      setRecommendation(await res.json());
    } else {
      alert("Failed to generate recommendation. Make sure quotations exist.");
    }
    setRecommending(false);
  };

  const handleApprove = async (vendorId: string) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}/approve?vendor_id=${vendorId}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) {
      alert("Vendor approved! Purchase Order generated.");
      fetchData();
    }
  };

  const handleSendEmails = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}/send`, {
      method: "POST",
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    if (res.ok) { alert("Emails sent to vendors!"); fetchData(); }
  };

  const submitRating = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${id}/rate-vendor`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({
        vendor_id: ratingVendorId,
        delivery_score: ratingData.delivery,
        quality_score: ratingData.quality,
        communication_score: ratingData.comms,
        support_score: ratingData.support,
        comments: ratingData.comments
      })
    });
    if (res.ok) { setRatingOpen(false); alert("Vendor rated successfully!"); }
  };

  if (loading) {
    return (
      <div className="space-y-6 fade-in">
        <div className="shimmer h-10 w-64 rounded-xl" />
        <div className="grid grid-cols-2 gap-6">
          <div className="shimmer h-48 rounded-2xl" />
          <div className="shimmer h-48 rounded-2xl" />
        </div>
        <div className="shimmer h-64 rounded-2xl" />
      </div>
    );
  }
  if (!rfq) return <div className="text-muted-foreground">RFQ not found.</div>;

  return (
    <div className="space-y-6 fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl font-bold tracking-tight gradient-text">{rfq.product_name}</h1>
            <StatusBadge status={rfq.status} />
          </div>
          <p className="text-muted-foreground text-sm">Request for Quotation — AI analysis powered by CascadeFlow</p>
        </div>
        <div className="flex gap-2">
          {rfq.status === "draft" && (
            <Button variant="outline" onClick={handleSendEmails} className="rounded-xl border-border/60">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Send Invitations
            </Button>
          )}
          <Button
            onClick={handleRecommend}
            disabled={recommending}
            className="rounded-xl font-semibold"
            style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 4px 16px oklch(0.65 0.22 265 / 30%)"}}
          >
            {recommending ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Analyzing...
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
                Generate AI Recommendation
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Info + AI Rec */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Requirements */}
        <div className="glass-card rounded-2xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 265)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            Requirements
          </h3>
          <div className="space-y-3">
            {[
              { label: "Quantity", value: rfq.quantity },
              { label: "Deadline", value: new Date(rfq.submission_deadline).toLocaleString() },
              { label: "Specifications", value: rfq.specifications || "None" },
              { label: "Delivery", value: rfq.delivery_requirements || "None" },
              { label: "Warranty", value: rfq.warranty_requirements || "None" },
            ].map(item => (
              <div key={item.label} className="flex gap-3 text-sm">
                <span className="text-muted-foreground w-28 shrink-0">{item.label}</span>
                <span className="text-foreground font-medium">{item.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* AI Recommendation */}
        {recommendation ? (
          <div className="rounded-2xl p-5 fade-in" style={{background: "oklch(0.65 0.22 265 / 8%)", border: "1px solid oklch(0.65 0.22 265 / 25%)", boxShadow: "0 0 32px oklch(0.65 0.22 265 / 10%)"}}>
            <h3 className="font-semibold mb-4 flex items-center gap-2" style={{color: "oklch(0.78 0.18 265)"}}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
              AI Recommendation
              <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{background: "oklch(0.65 0.22 265 / 20%)", color: "oklch(0.75 0.18 265)"}}>CascadeFlow</span>
            </h3>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Reasoning</p>
                <p className="text-sm text-foreground/90 leading-relaxed">{recommendation.reasoning}</p>
              </div>
              {recommendation.negotiation_suggestions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Negotiation Suggestions</p>
                  <ul className="space-y-2">
                    {recommendation.negotiation_suggestions.map((s: string, i: number) => (
                      <li key={i} className="flex gap-2 text-sm text-foreground/90">
                        <span className="mt-0.5 shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-xs font-bold" style={{background: "oklch(0.65 0.22 265 / 20%)", color: "oklch(0.75 0.18 265)"}}>{i + 1}</span>
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-2xl p-5 flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{background: "oklch(0.65 0.22 265 / 10%)"}}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 265)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg>
            </div>
            <p className="text-foreground font-medium text-sm">No AI analysis yet</p>
            <p className="text-muted-foreground text-xs mt-1">Click Generate AI Recommendation to analyze vendor quotations</p>
          </div>
        )}
      </div>

      {/* Quotations Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b" style={{borderColor: "oklch(0.25 0.03 265 / 40%)"}}>
          <h3 className="font-semibold text-foreground">Quotations</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Compare vendor quotations and approve the winner</p>
        </div>
        {quotations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-6">
            <p className="text-muted-foreground text-sm">No quotations received yet.</p>
          </div>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-6 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b" style={{borderColor: "oklch(0.18 0.02 265 / 60%)"}}>
              <span className="col-span-2">Vendor</span>
              <span>Status</span>
              <span>Price</span>
              <span>Delivery</span>
              <span>AI Risks</span>
            </div>
            {quotations.map(q => {
              const isRecommended = recommendation?.recommended_vendor_id === q.vendor_id;
              return (
                <div key={q.vendor_id} className="grid grid-cols-6 px-6 py-4 items-start border-b transition-colors hover:bg-muted/20" style={{borderColor: "oklch(0.18 0.02 265 / 60%)", ...(isRecommended ? {background: "oklch(0.65 0.22 265 / 6%)"} : {})}}>
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold" style={{background: isRecommended ? "oklch(0.65 0.22 265 / 25%)" : "oklch(0.2 0.03 265)", color: isRecommended ? "oklch(0.78 0.18 265)" : "oklch(0.6 0.04 265)"}}>
                      {q.vendor_name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{q.vendor_name}</p>
                      {isRecommended && (
                        <span className="inline-flex items-center gap-1 text-xs mt-0.5" style={{color: "oklch(0.78 0.18 265)"}}>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          AI Recommended
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="capitalize text-sm text-muted-foreground pt-1">{q.status}</div>
                  <div className="text-sm font-semibold text-foreground pt-1">{q.quotation?.price ? `$${q.quotation.price.toLocaleString()}` : "—"}</div>
                  <div className="text-sm text-muted-foreground pt-1">{q.quotation?.delivery_timeline || "—"}</div>
                  <div className="text-xs pt-1">
                    {q.quotation?.ai_risk_flags?.risks?.length > 0 ? (
                      <ul className="space-y-0.5">
                        {q.quotation.ai_risk_flags.risks.map((r: string, i: number) => (
                          <li key={i} className="flex gap-1 items-start" style={{color: "oklch(0.7 0.18 25)"}}>
                            <span className="mt-0.5">⚠</span> {r}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="flex items-center gap-1" style={{color: "oklch(0.72 0.2 155)"}}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                        No risks
                      </span>
                    )}
                  </div>
                  {/* Actions row */}
                  <div className="col-span-6 flex gap-2 mt-3 pt-3 border-t" style={{borderColor: "oklch(0.18 0.02 265 / 40%)"}}>
                    {rfq.status !== "awarded" && q.status === "submitted" && (
                      <Button size="sm" className="rounded-xl text-xs h-7" onClick={() => handleApprove(q.vendor_id)} style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))"}}>
                        Approve Vendor
                      </Button>
                    )}
                    {rfq.status === "awarded" && (
                      <Button size="sm" variant="outline" className="rounded-xl text-xs h-7 border-border/60" onClick={() => { setRatingVendorId(q.vendor_id); setRatingOpen(true); }}>
                        Rate Performance
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onOpenChange={setRatingOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl" style={{background: "oklch(0.13 0.025 265)", border: "1px solid oklch(0.25 0.03 265 / 60%)"}}>
          <DialogHeader>
            <DialogTitle className="text-foreground">Rate Vendor Performance</DialogTitle>
            <DialogDescription className="text-muted-foreground">Your rating updates the vendor&apos;s trust score in AI hindsight memory.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submitRating} className="space-y-5 py-2">
            <div className="grid grid-cols-2 gap-5">
              {[
                { label: "Delivery", key: "delivery" as const },
                { label: "Quality", key: "quality" as const },
                { label: "Communication", key: "comms" as const },
                { label: "Support", key: "support" as const },
              ].map(({ label, key }) => (
                <div key={key} className="space-y-2">
                  <Label className="text-sm font-medium text-foreground/80">{label}</Label>
                  <StarRating value={ratingData[key]} onChange={v => setRatingData({...ratingData, [key]: v})} />
                </div>
              ))}
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground/80">Comments</Label>
              <Textarea
                value={ratingData.comments}
                onChange={e => setRatingData({...ratingData, comments: e.target.value})}
                placeholder="Share your experience with this vendor..."
                className="bg-muted/60 border-border/60 rounded-xl resize-none"
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setRatingOpen(false)} className="rounded-xl border-border/60">Cancel</Button>
              <Button type="submit" className="rounded-xl" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))"}}>Submit Rating</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
