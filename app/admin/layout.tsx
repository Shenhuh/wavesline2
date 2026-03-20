"use client";

import Link from "next/link";
import { ReactNode, useState } from "react";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin", label: "Dashboard", icon: "M3 13l2-2m0 0l7-7 7 7M5 11v8a1 1 0 001 1h3m10-9l2 2m-2-2v8a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" },
  { href: "/admin/characters", label: "Characters", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
  { href: "/admin/relationships", label: "Relationships", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" },
  { href: "/admin/lore", label: "Lore", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { href: "/admin/events", label: "Events", icon: "M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" },
  { href: "/admin/monsters", label: "Monsters", icon: "M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
  { href: "/admin/stickers", label: "Stickers", icon: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14" },
];

function Sidebar({ pathname, onClose }: { pathname: string; onClose?: () => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#23252f", color: "rgba(255,255,255,0.5)" }}>
      {/* Brand */}
      <div style={{ padding: "18px 18px 14px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 24, height: 24, borderRadius: 4, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <rect x="1" y="2.5" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.1" />
                <path d="M1 4L6 7.5L11 4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.1" />
              </svg>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)", letterSpacing: "-0.2px" }}>WavesLine</span>
          </div>
          {onClose && (
            <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", padding: 4 }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M3 3L13 13M13 3L3 13" stroke="rgba(255,255,255,0.4)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", margin: "4px 0 0 32px" }}>Admin Panel</p>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, overflowY: "auto", padding: "10px 10px" }}>
        {adminLinks.map((link) => {
          const active = link.href === "/admin"
            ? pathname === "/admin"
            : pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <Link
              key={link.href}
              href={link.href}
              onClick={onClose}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                borderRadius: 8,
                padding: "9px 11px",
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                textDecoration: "none",
                background: active ? "#ffffff" : "transparent",
                color: active ? "#23252f" : "rgba(255,255,255,0.5)",
                transition: "background 0.15s",
              }}
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, opacity: active ? 0.9 : 0.6 }}>
                <path d={link.icon} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Back to chat */}
      <div style={{ padding: 10, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
        <Link href="/chat" style={{ display: "flex", alignItems: "center", gap: 10, borderRadius: 8, padding: "9px 11px", fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)", textDecoration: "none" }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
            <path d="M10 19l-7-7m0 0l7-7m-7 7h18" stroke="rgba(255,255,255,0.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Chat
        </Link>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f0f2f5" }}>
      <style>{`
        @media (max-width: 767px) { .admin-sidebar { display: none !important; } }
        @media (min-width: 768px) { .admin-drawer-backdrop { display: none !important; } .admin-drawer { display: none !important; } .admin-mobile-bar { display: none !important; } }
      `}</style>

      {/* Desktop sidebar */}
      <aside className="admin-sidebar" style={{ width: 220, flexShrink: 0 }}>
        <Sidebar pathname={pathname} />
      </aside>

      {/* Mobile top bar — burger LEFT, title RIGHT */}
      <div className="admin-mobile-bar" style={{
        position: "fixed", top: 0, left: 0, right: 0, zIndex: 30,
        height: 52, background: "#23252f",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <button
          onClick={() => setDrawerOpen(true)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 6, marginLeft: -6 }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <line x1="2" y1="5" x2="18" y2="5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="2" y1="10" x2="18" y2="10" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" strokeLinecap="round" />
            <line x1="2" y1="15" x2="18" y2="15" stroke="rgba(255,255,255,0.6)" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, borderRadius: 4, background: "rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
              <rect x="1" y="2.5" width="10" height="7" rx="1.5" stroke="rgba(255,255,255,0.6)" strokeWidth="1.1" />
              <path d="M1 4L6 7.5L11 4" stroke="rgba(255,255,255,0.6)" strokeWidth="1.1" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "rgba(255,255,255,0.85)" }}>WavesLine Admin</span>
        </div>
      </div>

      {/* Mobile drawer backdrop */}
      {drawerOpen && (
        <div
          className="admin-drawer-backdrop"
          onClick={() => setDrawerOpen(false)}
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
        />
      )}

      {/* Mobile drawer */}
      <div className="admin-drawer" style={{
        position: "fixed", top: 0, left: 0, bottom: 0, zIndex: 50,
        width: 240,
        transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
        transition: "transform 0.25s ease",
      }}>
        <Sidebar pathname={pathname} onClose={() => setDrawerOpen(false)} />
      </div>

      {/* Main content */}
      <main style={{ flex: 1, overflow: "auto", padding: "24px 16px", background: "#f0f2f5" }}>
        {/* Mobile top padding so content isn't behind fixed bar */}
        <div className="admin-mobile-bar" style={{ height: 52, display: "block" }} />
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          {children}
        </div>
      </main>
    </div>
  );
}