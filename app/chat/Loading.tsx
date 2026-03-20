// app/chat/loading.tsx
// Place this file at: app/chat/loading.tsx
// Next.js will automatically show it while the page is loading/switching threads

export default function ChatLoading() {
  return (
    <main
      style={{
        height: "100svh",
        overflow: "hidden",
        background: "linear-gradient(135deg,#1a1c25 0%,#23263a 60%,#1a1e2e 100%)",
      }}
    >
      <style>{`
        @keyframes shimmer {
          0% { background-position: -600px 0; }
          100% { background-position: 600px 0; }
        }
        .sk {
          background: linear-gradient(90deg,
            rgba(255,255,255,0.04) 25%,
            rgba(255,255,255,0.10) 50%,
            rgba(255,255,255,0.04) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 6px;
        }
        .sk-light {
          background: linear-gradient(90deg,
            rgba(0,0,0,0.05) 25%,
            rgba(0,0,0,0.11) 50%,
            rgba(0,0,0,0.05) 75%);
          background-size: 600px 100%;
          animation: shimmer 1.5s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      <div style={{ maxWidth: 920, margin: "0 auto", display: "flex", flexDirection: "column", height: "100%", padding: "0 12px 12px" }}>

        {/* Top bar */}
        <div style={{ height: 44, flexShrink: 0, background: "#23252f", borderRadius: "10px 10px 0 0", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sk" style={{ width: 24, height: 24, borderRadius: 4 }} />
            <div className="sk" style={{ width: 72, height: 11 }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="sk" style={{ width: 22, height: 22, borderRadius: "50%" }} />
            <div className="sk" style={{ width: 22, height: 22, borderRadius: "50%" }} />
            <div className="sk" style={{ width: 22, height: 22, borderRadius: "50%" }} />
          </div>
        </div>

        {/* Shell */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)", borderTop: "none", borderRadius: "0 0 12px 12px" }}>

          {/* Sidebar */}
          <div style={{ width: 215, flexShrink: 0, background: "#23252f", display: "flex", flexDirection: "column" }}>
            {[1, 0.7, 0.5].map((op, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", opacity: op }}>
                <div className="sk" style={{ width: 36, height: 36, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="sk" style={{ width: "65%", height: 11 }} />
                  <div className="sk" style={{ width: "45%", height: 9 }} />
                </div>
              </div>
            ))}
          </div>

          {/* Chat panel */}
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#e9eaee" }}>

            {/* Contact header */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid rgba(0,0,0,0.08)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div className="sk-light" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="sk-light" style={{ width: 100, height: 12 }} />
                <div className="sk-light" style={{ width: 140, height: 10 }} />
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, padding: "20px 20px", display: "flex", flexDirection: "column", gap: 14, overflow: "hidden" }}>
              {/* Contact */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div className="sk-light" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div className="sk-light" style={{ width: 50, height: 9 }} />
                  <div className="sk-light" style={{ width: 200, height: 36, borderRadius: "14px 14px 14px 4px" }} />
                </div>
              </div>
              {/* User */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                  <div className="sk-light" style={{ width: 50, height: 9 }} />
                  <div className="sk-light" style={{ width: 130, height: 32, borderRadius: "14px 14px 4px 14px" }} />
                </div>
                <div className="sk-light" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
              </div>
              {/* Contact long */}
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div className="sk-light" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                  <div className="sk-light" style={{ width: 50, height: 9 }} />
                  <div className="sk-light" style={{ width: 260, height: 52, borderRadius: "14px 14px 14px 4px" }} />
                </div>
              </div>
              {/* User */}
              <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "flex-end", gap: 8 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
                  <div className="sk-light" style={{ width: 50, height: 9 }} />
                  <div className="sk-light" style={{ width: 170, height: 32, borderRadius: "14px 14px 4px 14px" }} />
                </div>
                <div className="sk-light" style={{ width: 32, height: 32, borderRadius: "50%", flexShrink: 0 }} />
              </div>
            </div>

            {/* Input */}
            <div style={{ flexShrink: 0, padding: "8px 10px 10px", background: "#dfe0e5", borderTop: "1px solid rgba(0,0,0,0.08)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#f5f5f7", border: "1px solid rgba(0,0,0,0.11)", borderRadius: 12, padding: "6px 6px" }}>
                <div className="sk-light" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
                <div className="sk-light" style={{ flex: 1, height: 14 }} />
                <div className="sk-light" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}