"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });

      if (!response.ok) {
        throw new Error("Invalid credentials");
      }

      const data = await response.json();
      localStorage.setItem("token", data.access_token);
      router.push("/dashboard");
    } catch (err: any) {
      setError(err.message || "Failed to login");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="bg-orb-1" />
      <div className="bg-orb-2" />

      {/* Animated grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(oklch(0.25_0.03_265/30%)_1px,transparent_1px),linear-gradient(90deg,oklch(0.25_0.03_265/30%)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,black,transparent)]" />

      <div className="relative z-10 w-full max-w-md fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4" style={{background: "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: "0 0 32px oklch(0.65 0.22 265 / 40%)"}}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold gradient-text">VendorMind AI</h1>
          <p className="text-muted-foreground text-sm mt-1">AI-powered procurement intelligence</p>
        </div>

        {/* Card */}
        <div className="glass-card rounded-2xl p-8">
          <h2 className="text-xl font-semibold text-foreground mb-1">Welcome back</h2>
          <p className="text-muted-foreground text-sm mb-6">Sign in to your procurement dashboard</p>

          {error && (
            <div className="mb-4 p-3 rounded-xl text-sm flex items-center gap-2" style={{background: "oklch(0.62 0.22 25 / 15%)", border: "1px solid oklch(0.62 0.22 25 / 30%)", color: "oklch(0.75 0.18 25)"}}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-foreground/80">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="bg-muted/60 border-border/60 h-10 rounded-xl focus:border-primary/60"
              />
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-foreground/80">Password</Label>
                <Link href="#" className="text-xs text-primary hover:text-primary/80 transition-colors">Forgot password?</Link>
              </div>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-muted/60 border-border/60 h-10 rounded-xl focus:border-primary/60"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 rounded-xl font-semibold mt-2"
              disabled={loading}
              style={{background: loading ? undefined : "linear-gradient(135deg, oklch(0.55 0.22 265), oklch(0.65 0.2 290))", boxShadow: loading ? undefined : "0 4px 16px oklch(0.65 0.22 265 / 30%)"}}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
                  Signing in...
                </span>
              ) : "Sign In"}
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link href="/register" className="text-primary hover:text-primary/80 font-medium transition-colors">Create account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
