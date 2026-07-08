"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

export default function NewRFQPage() {
  const router = useRouter();
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendors, setSelectedVendors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    product_name: "",
    quantity: 1,
    specifications: "",
    delivery_requirements: "",
    warranty_requirements: "",
    submission_deadline: ""
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/vendors`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    })
      .then(res => res.json())
      .then(data => setVendors(data));
  }, []);

  const handleCheckboxChange = (vendorId: string) => {
    setSelectedVendors(prev =>
      prev.includes(vendorId) ? prev.filter(id => id !== vendorId) : [...prev, vendorId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const rfqRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`
        },
        body: JSON.stringify({
          ...formData,
          submission_deadline: new Date(formData.submission_deadline).toISOString()
        })
      });

      if (!rfqRes.ok) throw new Error("Failed to create RFQ");
      const rfq = await rfqRes.json();

      if (selectedVendors.length > 0) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${rfq.id}/invite-vendors`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`
          },
          body: JSON.stringify({ vendor_ids: selectedVendors })
        });

        await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/rfqs/${rfq.id}/send`, {
          method: "POST",
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        });
      }

      router.push("/dashboard/rfqs");
    } catch (err) {
      alert("Error creating RFQ");
    } finally {
      setLoading(false);
    }
  };

  const inputClass = "bg-muted/60 border-border/60 h-10 rounded-xl focus:border-primary/60 text-sm";
  const labelClass = "text-sm font-medium text-foreground/80";

  return (
    <div className="max-w-3xl mx-auto space-y-6 fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight gradient-text">Create RFQ</h1>
        <p className="text-muted-foreground mt-1 text-sm">Fill in the details to request quotes from your vendors</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Basic Details */}
        <div className="glass-card rounded-2xl p-6 space-y-5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background: "oklch(0.65 0.22 265 / 15%)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.75 0.18 265)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
            </div>
            <h2 className="font-semibold text-foreground">RFQ Details</h2>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="product" className={labelClass}>Product Name *</Label>
              <Input id="product" required placeholder="e.g., Industrial Laptop" value={formData.product_name} onChange={e => setFormData({...formData, product_name: e.target.value})} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qty" className={labelClass}>Quantity *</Label>
              <Input id="qty" type="number" min={1} required value={formData.quantity} onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})} className={inputClass} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="deadline" className={labelClass}>Submission Deadline *</Label>
            <Input id="deadline" type="datetime-local" required value={formData.submission_deadline} onChange={e => setFormData({...formData, submission_deadline: e.target.value})} className={inputClass} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="specs" className={labelClass}>Specifications</Label>
            <Textarea id="specs" placeholder="Detailed product specifications, technical requirements..." value={formData.specifications} onChange={e => setFormData({...formData, specifications: e.target.value})} className="bg-muted/60 border-border/60 rounded-xl resize-none text-sm" rows={3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="delivery" className={labelClass}>Delivery Requirements</Label>
              <Input id="delivery" placeholder="e.g., Within 30 days to NY" value={formData.delivery_requirements} onChange={e => setFormData({...formData, delivery_requirements: e.target.value})} className={inputClass} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="warranty" className={labelClass}>Warranty Requirements</Label>
              <Input id="warranty" placeholder="e.g., 2 years comprehensive" value={formData.warranty_requirements} onChange={e => setFormData({...formData, warranty_requirements: e.target.value})} className={inputClass} />
            </div>
          </div>
        </div>

        {/* Vendor Selection */}
        <div className="glass-card rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{background: "oklch(0.72 0.2 155 / 15%)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="oklch(0.72 0.2 155)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </div>
            <div>
              <h2 className="font-semibold text-foreground">Select Vendors</h2>
              <p className="text-xs text-muted-foreground">{selectedVendors.length} vendor{selectedVendors.length !== 1 ? "s" : ""} selected</p>
            </div>
          </div>

          {vendors.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-center" style={{borderRadius: "12px", border: "1px dashed oklch(0.3 0.03 265 / 50%)"}}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="oklch(0.45 0.04 265)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <p className="text-sm text-muted-foreground">No vendors found. Add vendors in the Vendor Directory first.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {vendors.map(vendor => {
                const selected = selectedVendors.includes(vendor.id);
                return (
                  <label key={vendor.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all" style={{background: selected ? "oklch(0.65 0.22 265 / 10%)" : "oklch(0.16 0.02 265 / 60%)", border: selected ? "1px solid oklch(0.65 0.22 265 / 30%)" : "1px solid transparent"}}>
                    <Checkbox
                      id={`vendor-${vendor.id}`}
                      checked={selected}
                      onCheckedChange={() => handleCheckboxChange(vendor.id)}
                    />
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0" style={{background: "oklch(0.65 0.22 265 / 15%)", color: "oklch(0.75 0.18 265)"}}>
                      {vendor.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{vendor.name}</p>
                      <p className="text-xs text-muted-foreground">{vendor.email}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.back()} className="rounded-xl border-border/60">Cancel</Button>
          <Button
            type="submit"
            disabled={loading}
            className="rounded-xl font-semibold px-6"
            style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 4px 16px oklch(0.65 0.22 265 / 30%)"}}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                Creating...
              </span>
            ) : "Create & Send Invitations"}
          </Button>
        </div>
      </form>
    </div>
  );
}
