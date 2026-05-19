"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";

const NAV_LINKS = [
  { href: "/", label: "Predictor", icon: "🔍" },
  { href: "/analytics", label: "Analytics", icon: "📊" },
  { href: "/batch", label: "Batch Scoring", icon: "📂" },
  { href: "/explorer", label: "Explorer", icon: "🗂️" },
];

export default function PageLayout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at 20% 50%, rgba(99,102,241,0.07) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(139,92,246,0.06) 0%, transparent 55%), #020617",
      }}
    >
      {/* Header */}
      <header
        className="sticky top-0 z-50 border-b"
        style={{
          background: "rgba(2,6,23,0.88)",
          borderColor: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
        }}
      >
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-lg text-sm"
                style={{ background: "linear-gradient(135deg, #6366f1, #8b5cf6)" }}
              >
                🛒
              </div>
              <span className="text-sm font-bold text-white">
                Retail Churn
              </span>
            </Link>

            <nav className="flex items-center gap-1">
              {NAV_LINKS.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all duration-150"
                    style={
                      isActive
                        ? {
                            background: "rgba(99,102,241,0.18)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(99,102,241,0.3)",
                          }
                        : {
                            color: "rgba(255,255,255,0.45)",
                            border: "1px solid transparent",
                          }
                    }
                    onMouseEnter={(e) => {
                      if (!isActive)
                        e.currentTarget.style.color = "rgba(255,255,255,0.8)";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        e.currentTarget.style.color = "rgba(255,255,255,0.45)";
                    }}
                  >
                    <span>{link.icon}</span>
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Right: badges */}
          <div className="flex items-center gap-3">
            <div
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1"
              style={{
                background: "rgba(16,185,129,0.08)",
                borderColor: "rgba(16,185,129,0.2)",
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full bg-emerald-400"
                style={{ boxShadow: "0 0 5px #10b981" }}
              />
              <span className="text-xs font-medium text-emerald-400">
                Model Online
              </span>
            </div>
            <span
              className="hidden text-xs sm:block"
              style={{ color: "rgba(255,255,255,0.25)" }}
            >
              UCI Online Retail · 4,338 customers
            </span>
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="mx-auto max-w-screen-xl px-6 py-8">{children}</main>

      <footer
        className="border-t py-6 text-center text-xs"
        style={{
          borderColor: "rgba(255,255,255,0.06)",
          color: "rgba(255,255,255,0.2)",
        }}
      >
        IDSS Phase 5 · Retail Churn Predictor · UCI Online Retail Dataset
      </footer>
    </div>
  );
}
