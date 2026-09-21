"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { BrandMark } from "@/components/BrandMark";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let ctx: any;
    import("gsap").then((gsapPkg) => {
      const gsap = gsapPkg.default;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReducedMotion) return;
      
      ctx = gsap.context(() => {
        gsap.fromTo(
          ".login-box",
          { opacity: 0, y: 20, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power2.out" }
        );
      }, containerRef);
    });
    return () => {
      if (ctx) ctx.revert();
    };
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const supabase = getSupabaseBrowserClient();
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        throw new Error("Invalid email or password. Please try again.");
      }

      router.push("/dashboard");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(message);
      setLoading(false);
    }
  };

  return (
    <div ref={containerRef} className="min-h-screen bg-cloud flex flex-col items-center justify-center p-6 selection:bg-cyan/30">
      <Link href="/" className="absolute top-6 left-6 focus-ring rounded-sm transition-transform hover:scale-105 active:scale-95">
        <BrandMark />
      </Link>

      <main className="login-box w-full max-w-md bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-mist">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-heading font-bold text-navy mb-3 tracking-tight">Responder Login</h1>
          <p className="text-sm text-ink/70">Sign in to coordinate disaster response.</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-immediate/10 text-immediate border border-immediate/20 rounded-lg text-sm font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-1.5">
            <label htmlFor="email" className="block text-sm font-semibold text-ink">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2.5 bg-cloud border border-mist rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-teal/50 transition-shadow disabled:opacity-50"
              placeholder="responder@example.com"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="block text-sm font-semibold text-ink">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2.5 bg-cloud border border-mist rounded-lg text-ink focus:outline-none focus:ring-2 focus:ring-teal/50 transition-shadow disabled:opacity-50"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-navy text-white font-semibold rounded-lg hover:bg-navy/90 transition-colors focus-ring disabled:opacity-70 flex justify-center items-center h-[48px]"
          >
            {loading ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ink/60">
          Access is restricted to authorized personnel only. Contact your administrator if you need an account.
        </p>
      </main>
    </div>
  );
}
