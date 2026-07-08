"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function QuotationPage() {
  const params = useParams();
  const token = params.token as string;
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    price: "",
    delivery_timeline: "",
    warranty_terms: "",
    payment_terms: "",
    notes: ""
  });
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/public/quotation/${token}`)
      .then(res => {
        if (!res.ok) throw new Error("Invalid or expired token");
        return res.json();
      })
      .then(d => {
        setData(d);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    const form = new FormData();
    form.append("price", formData.price);
    form.append("delivery_timeline", formData.delivery_timeline);
    form.append("warranty_terms", formData.warranty_terms);
    form.append("payment_terms", formData.payment_terms);
    form.append("notes", formData.notes);
    if (file) {
      form.append("file", file);
    }

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/public/quotation/${token}/submit`, {
        method: "POST",
        body: form
      });

      if (!res.ok) throw new Error("Submission failed");
      setSuccess(true);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (success) return <div className="p-8 text-center text-green-600 text-2xl font-bold mt-10">Quotation Submitted Successfully!</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <Card>
        <CardHeader className="bg-primary/5 border-b">
          <CardTitle className="text-2xl">Request for Quotation</CardTitle>
          <CardDescription>
            {data.company.name} is requesting a quote from {data.vendor.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="py-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><strong>Product:</strong> {data.rfq.product_name}</div>
            <div><strong>Quantity:</strong> {data.rfq.quantity}</div>
            <div><strong>Deadline:</strong> {new Date(data.rfq.submission_deadline).toLocaleString()}</div>
          </div>
          <div><strong>Specifications:</strong> {data.rfq.specifications || "N/A"}</div>
          <div><strong>Delivery Requirements:</strong> {data.rfq.delivery_requirements || "N/A"}</div>
          <div><strong>Warranty Requirements:</strong> {data.rfq.warranty_requirements || "N/A"}</div>
        </CardContent>
      </Card>

      <Card>
        <form onSubmit={handleSubmit}>
          <CardHeader>
            <CardTitle>Submit Your Quotation</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="price">Total Price</Label>
              <Input id="price" type="number" step="0.01" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="delivery">Delivery Timeline</Label>
              <Input id="delivery" required value={formData.delivery_timeline} onChange={e => setFormData({...formData, delivery_timeline: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="warranty">Warranty Terms</Label>
              <Input id="warranty" required value={formData.warranty_terms} onChange={e => setFormData({...formData, warranty_terms: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payment">Payment Terms</Label>
              <Input id="payment" required value={formData.payment_terms} onChange={e => setFormData({...formData, payment_terms: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Additional Notes</Label>
              <Textarea id="notes" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="file">Upload Quotation Document / Contract (PDF)</Label>
              <Input id="file" type="file" onChange={e => setFile(e.target.files?.[0] || null)} />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={submitting}>{submitting ? "Submitting..." : "Submit Quotation"}</Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
