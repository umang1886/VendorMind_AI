"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const VENDOR_CATEGORIES = [
  "Electronics & Components","Raw Materials","Logistics & Shipping","IT & Software",
  "Office Supplies","Construction & Infrastructure","Manufacturing","Food & Beverages",
  "Healthcare & Pharma","Professional Services","Textiles & Apparel","Chemicals & Industrial",
  "Marketing & Media","Other",
];

const CATEGORY_COLORS: Record<string, { bg: string; color: string }> = {
  "Electronics & Components": { bg: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.75 0.18 265)" },
  "Raw Materials":            { bg: "oklch(0.7 0.18 60 / 15%)",   color: "oklch(0.75 0.15 60)"  },
  "Logistics & Shipping":     { bg: "oklch(0.68 0.2 310 / 15%)",  color: "oklch(0.75 0.16 310)" },
  "IT & Software":            { bg: "oklch(0.6 0.22 240 / 15%)",  color: "oklch(0.72 0.18 240)" },
  "Office Supplies":          { bg: "oklch(0.5 0.04 265 / 15%)",  color: "oklch(0.65 0.05 265)" },
  "Manufacturing":            { bg: "oklch(0.65 0.2 30 / 15%)",   color: "oklch(0.72 0.16 30)"  },
  "Food & Beverages":         { bg: "oklch(0.72 0.2 155 / 15%)",  color: "oklch(0.72 0.2 155)"  },
  "Healthcare & Pharma":      { bg: "oklch(0.7 0.18 180 / 15%)",  color: "oklch(0.72 0.15 180)" },
  "Professional Services":    { bg: "oklch(0.68 0.18 200 / 15%)", color: "oklch(0.72 0.15 200)" },
  "Textiles & Apparel":       { bg: "oklch(0.68 0.2 340 / 15%)",  color: "oklch(0.72 0.16 340)" },
  "Chemicals & Industrial":   { bg: "oklch(0.7 0.18 80 / 15%)",   color: "oklch(0.73 0.15 80)"  },
  "Marketing & Media":        { bg: "oklch(0.65 0.2 0 / 15%)",    color: "oklch(0.72 0.16 0)"   },
  "Other":                    { bg: "oklch(0.45 0.03 265 / 15%)", color: "oklch(0.6 0.04 265)"  },
  "Construction & Infrastructure": { bg: "oklch(0.65 0.18 45 / 15%)", color: "oklch(0.72 0.14 45)" },
};

type VendorForm = { name: string; email: string; category: string; phone: string; website: string; address: string; city: string; country: string; notes: string; };
const emptyForm: VendorForm = { name: "", email: "", category: "", phone: "", website: "", address: "", city: "", country: "", notes: "" };

function CategoryBadge({ category }: { category: string }) {
  const c = CATEGORY_COLORS[category] || { bg: "oklch(0.45 0.03 265 / 15%)", color: "oklch(0.6 0.04 265)" };
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium" style={{background: c.bg, color: c.color}}>
      {category}
    </span>
  );
}

function TrustScore({ score }: { score: number | null }) {
  if (score === null || score === undefined) return <span className="text-xs text-muted-foreground">Not rated</span>;
  const color = score >= 4 ? "oklch(0.72 0.2 155)" : score >= 3 ? "oklch(0.8 0.18 80)" : "oklch(0.65 0.2 25)";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex gap-0.5">
        {[1,2,3,4,5].map(s => (
          <svg key={s} width="11" height="11" viewBox="0 0 24 24" fill={s <= Math.round(score) ? color : "none"} stroke={color} strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ))}
      </div>
      <span className="text-sm font-semibold" style={{color}}>{score}/5</span>
    </div>
  );
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewVendor, setViewVendor] = useState<any>(null);
  const [formData, setFormData] = useState<VendorForm>(emptyForm);
  const [search, setSearch] = useState("");

  const fetchVendors = async () => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/vendors`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    if (res.ok) setVendors(await res.json());
  };

  useEffect(() => { fetchVendors(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const contact_info = { category: formData.category, phone: formData.phone, website: formData.website, address: formData.address, city: formData.city, country: formData.country, notes: formData.notes };
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/vendors`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token")}` },
      body: JSON.stringify({ name: formData.name, email: formData.email, contact_info }),
    });
    if (res.ok) { setOpen(false); setFormData(emptyForm); fetchVendors(); }
    else { const err = await res.json(); alert(err.detail || "Failed to create vendor"); }
    setLoading(false);
  };

  const ci = (v: any) => v?.contact_info || {};

  const filtered = vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) || v.email.toLowerCase().includes(search.toLowerCase())
  );

  const stats = [
    { label: "Total Vendors", value: vendors.length, icon: "👥", color: "oklch(0.65 0.22 265)" },
    { label: "Categories", value: new Set(vendors.map(v => ci(v).category).filter(Boolean)).size, icon: "🏷️", color: "oklch(0.7 0.18 200)" },
    { label: "Rated Vendors", value: vendors.filter(v => v.trust_score !== null).length, icon: "⭐", color: "oklch(0.8 0.18 80)" },
    {
      label: "Avg Trust Score",
      value: vendors.filter(v => v.trust_score !== null).length > 0
        ? (vendors.reduce((s, v) => s + (v.trust_score || 0), 0) / vendors.filter(v => v.trust_score !== null).length).toFixed(1)
        : "N/A",
      icon: "📊",
      color: "oklch(0.72 0.2 155)"
    },
  ];

  const inputClass = "bg-muted/60 border-border/60 h-9 rounded-xl text-sm";

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Vendor Directory</h1>
          <p className="text-muted-foreground mt-1 text-sm">Manage and track all your company vendors</p>
        </div>

        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setFormData(emptyForm); }}>
          <DialogTrigger render={
            <Button className="rounded-xl font-semibold" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 4px 16px oklch(0.65 0.22 265 / 30%)"}}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              Add Vendor
            </Button>
          } />
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl" style={{background: "oklch(0.13 0.025 265)", border: "1px solid oklch(0.25 0.03 265 / 60%)"}}>
            <DialogHeader>
              <DialogTitle className="text-foreground">Add New Vendor</DialogTitle>
              <DialogDescription className="text-muted-foreground">Fill in vendor details. Category helps the AI filter vendors during RFQ creation.</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreate} className="space-y-5 py-2">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Basic Information</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Vendor Name *</Label>
                    <Input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="Acme Corp" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Primary Email *</Label>
                    <Input type="email" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="vendor@acme.com" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground/80">Category *</Label>
                <Select required value={formData.category} onValueChange={val => setFormData({...formData, category: val})}>
                  <SelectTrigger className={inputClass}><SelectValue placeholder="Select a category" /></SelectTrigger>
                  <SelectContent style={{background: "oklch(0.15 0.025 265)", border: "1px solid oklch(0.25 0.03 265 / 60%)"}}>
                    {VENDOR_CATEGORIES.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Contact Details</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Phone</Label>
                    <Input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="+1 555 000 0000" className={inputClass} />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium text-foreground/80">Website</Label>
                    <Input value={formData.website} onChange={e => setFormData({...formData, website: e.target.value})} placeholder="https://acme.com" className={inputClass} />
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">Address</p>
                <div className="space-y-3">
                  <Input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} placeholder="Street address" className={inputClass} />
                  <div className="grid grid-cols-2 gap-4">
                    <Input value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} placeholder="City" className={inputClass} />
                    <Input value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} placeholder="Country" className={inputClass} />
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-foreground/80">Internal Notes</Label>
                <Textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="Any internal notes about this vendor..." rows={3} className="bg-muted/60 border-border/60 rounded-xl resize-none text-sm" />
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="rounded-xl border-border/60">Cancel</Button>
                <Button type="submit" disabled={loading || !formData.category} className="rounded-xl" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))"}}>
                  {loading ? "Saving..." : "Add Vendor"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="glass-card rounded-2xl p-4 stat-card">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
            <p className="text-3xl font-bold mt-1 text-foreground">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search + Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b flex items-center gap-3" style={{borderColor: "oklch(0.25 0.03 265 / 40%)"}}>
          <div className="relative flex-1 max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search vendors..."
              className="pl-9 pr-4 py-2 text-sm rounded-xl w-full outline-none bg-muted/60 border border-border/60 text-foreground placeholder:text-muted-foreground focus:border-primary/40"
            />
          </div>
          <span className="text-xs text-muted-foreground ml-auto">{filtered.length} vendor{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center px-6">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4" style={{background: "oklch(0.65 0.22 265 / 10%)"}}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="oklch(0.65 0.22 265)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
            </div>
            <p className="text-foreground font-medium">{search ? "No vendors match your search" : "No vendors yet"}</p>
            <p className="text-muted-foreground text-sm mt-1">{search ? "Try a different keyword" : "Click \"Add Vendor\" to get started"}</p>
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div className="grid grid-cols-7 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground border-b" style={{borderColor: "oklch(0.18 0.02 265 / 60%)"}}>
              <span className="col-span-2">Vendor</span>
              <span>Category</span>
              <span>Contact</span>
              <span>Location</span>
              <span>Trust Score</span>
              <span className="text-right">Actions</span>
            </div>
            <div className="divide-y" style={{borderColor: "oklch(0.18 0.02 265 / 60%)"}}>
              {filtered.map(v => (
                <div key={v.id} className="grid grid-cols-7 px-6 py-4 items-center transition-colors hover:bg-muted/20">
                  <div className="col-span-2 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold shrink-0" style={{background: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.78 0.18 265)"}}>
                      {v.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{v.name}</p>
                      <p className="text-xs text-muted-foreground">{v.email}</p>
                    </div>
                  </div>
                  <div>
                    {ci(v).category ? <CategoryBadge category={ci(v).category} /> : <span className="text-muted-foreground text-xs">—</span>}
                  </div>
                  <div className="text-sm text-muted-foreground">{ci(v).phone || "—"}</div>
                  <div className="text-sm text-muted-foreground">{[ci(v).city, ci(v).country].filter(Boolean).join(", ") || "—"}</div>
                  <div><TrustScore score={v.trust_score} /></div>
                  <div className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setViewVendor(v)} className="rounded-xl text-xs h-7 hover:bg-muted/40">
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* View Detail Dialog */}
      <Dialog open={!!viewVendor} onOpenChange={() => setViewVendor(null)}>
        <DialogContent className="sm:max-w-lg rounded-2xl" style={{background: "oklch(0.13 0.025 265)", border: "1px solid oklch(0.25 0.03 265 / 60%)"}}>
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold" style={{background: "oklch(0.65 0.22 265 / 20%)", color: "oklch(0.78 0.18 265)"}}>
                {viewVendor?.name?.charAt(0)?.toUpperCase()}
              </div>
              <div>
                <DialogTitle className="text-foreground">{viewVendor?.name}</DialogTitle>
                {ci(viewVendor).category && <CategoryBadge category={ci(viewVendor).category} />}
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Email", value: viewVendor?.email },
                { label: "Phone", value: ci(viewVendor).phone || "—" },
                { label: "Website", value: ci(viewVendor).website, isLink: true },
                { label: "Added", value: viewVendor && new Date(viewVendor.created_at).toLocaleDateString() },
              ].map(item => (
                <div key={item.label} className="p-3 rounded-xl" style={{background: "oklch(0.16 0.02 265 / 60%)"}}>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{item.label}</p>
                  {item.isLink && item.value ? (
                    <a href={item.value} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">{item.value}</a>
                  ) : (
                    <p className="text-sm text-foreground">{item.value || "—"}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl" style={{background: "oklch(0.16 0.02 265 / 60%)"}}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Trust Score</p>
              <TrustScore score={viewVendor?.trust_score} />
            </div>

            <div className="p-3 rounded-xl" style={{background: "oklch(0.16 0.02 265 / 60%)"}}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Address</p>
              <p className="text-sm text-foreground">{[ci(viewVendor).address, ci(viewVendor).city, ci(viewVendor).country].filter(Boolean).join(", ") || "—"}</p>
            </div>

            {ci(viewVendor).notes && (
              <div className="p-3 rounded-xl" style={{background: "oklch(0.16 0.02 265 / 60%)"}}>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">Internal Notes</p>
                <p className="text-sm text-foreground/90">{ci(viewVendor).notes}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
