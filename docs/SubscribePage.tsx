/**
 * SubscribePage.tsx
 * Zudoku custom page — drop into src/SubscribePage.tsx
 *
 * Wiring (zudoku.config.tsx):
 *   import { SubscribePage } from "./src/SubscribePage";
 *   navigation: [
 *     { type: "custom-page", path: "/subscribe", label: "API Access", element: <SubscribePage />, display: "auth" },
 *     { type: "custom-page", path: "/my-subscriptions", label: "My Subscriptions", element: <SubscribePage initialView="subscriptions" />, display: "auth" },
 *   ]
 *
 * In production:
 *   - Replace DEMO_MODE = false and wire ZUPLO_API_KEY_BUCKET + endpoint
 *   - The "admin approval" webhook would flip subscription.status → "active" and provision a real API key
 */

import { useState, useEffect } from "react";
import { Head } from "zudoku/components";

// ─── Types ────────────────────────────────────────────────────────────────────

type PlanTier = "basic" | "pro" | "enterprise";
type SubStatus = "none" | "pending" | "active" | "revoked";

interface Plan {
  id: PlanTier;
  name: string;
  tagline: string;
  rateLimit: string;
  quota: string;
  sla: string;
  approval: "auto" | "manual";
  highlight?: boolean;
}

interface Subscription {
  id: string;
  planId: PlanTier;
  status: SubStatus;
  requestedAt: string;
  approvedAt?: string;
  apiKey?: string;
}

// ─── Config ───────────────────────────────────────────────────────────────────

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    tagline: "Explore the platform",
    rateLimit: "100 req / min",
    quota: "50,000 req / month",
    sla: "Best-effort",
    approval: "auto",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Production-ready access",
    rateLimit: "1,000 req / min",
    quota: "5M req / month",
    sla: "99.9% uptime SLA",
    approval: "manual",
    highlight: true,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Unlimited scale & support",
    rateLimit: "Unlimited",
    quota: "Unlimited",
    sla: "99.99% uptime SLA",
    approval: "manual",
  },
];

// ─── Demo helpers (replace with real Zuplo API calls in production) ───────────

const STORAGE_KEY = "zudoku_demo_subscriptions";

function loadSubs(): Subscription[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSubs(subs: Subscription[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(subs));
}

function makeDemoKey(plan: PlanTier): string {
  const prefix = { basic: "frbs", pro: "frpr", enterprise: "fren" }[plan];
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}_${Math.random().toString(36).slice(2, 14)}`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Badge({ status }: { status: SubStatus }) {
  const map: Record<SubStatus, { label: string; color: string }> = {
    none: { label: "", color: "" },
    pending: { label: "Pending Approval", color: "#f59e0b" },
    active: { label: "Active", color: "#10b981" },
    revoked: { label: "Revoked", color: "#ef4444" },
  };
  const { label, color } = map[status];
  if (!label) return null;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        color,
        background: `${color}18`,
        border: `1px solid ${color}40`,
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
          animation: status === "pending" ? "pulse 1.8s ease-in-out infinite" : "none",
        }}
      />
      {label}
    </span>
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      onClick={copy}
      style={{
        padding: "4px 12px",
        borderRadius: 6,
        fontSize: 12,
        fontWeight: 600,
        border: "1px solid var(--border, #e2e8f0)",
        background: copied ? "#10b98118" : "transparent",
        color: copied ? "#10b981" : "var(--muted-foreground, #64748b)",
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface SubscribePageProps {
  initialView?: "plans" | "subscriptions";
}

export function SubscribePage({ initialView = "plans" }: SubscribePageProps) {
  const [view, setView] = useState<"plans" | "subscriptions">(initialView);
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [requesting, setRequesting] = useState<PlanTier | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" } | null>(null);

  useEffect(() => {
    setSubs(loadSubs());
  }, []);

  const showToast = (message: string, type: "success" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const subForPlan = (planId: PlanTier) => subs.find((s) => s.planId === planId && s.status !== "revoked");

  const requestAccess = async (plan: Plan) => {
    setRequesting(plan.id);
    await new Promise((r) => setTimeout(r, 900));

    const now = new Date().toISOString();
    let newSub: Subscription;

    if (plan.approval === "auto") {
      newSub = {
        id: `sub_${Date.now()}`,
        planId: plan.id,
        status: "active",
        requestedAt: now,
        approvedAt: now,
        apiKey: makeDemoKey(plan.id),
      };
      showToast(`${plan.name} access granted — your API key is ready.`);
    } else {
      newSub = {
        id: `sub_${Date.now()}`,
        planId: plan.id,
        status: "pending",
        requestedAt: now,
      };
      showToast(`${plan.name} request submitted — awaiting admin approval.`, "info");
    }

    const updated = [...subs.filter((s) => s.planId !== plan.id), newSub];
    setSubs(updated);
    saveSubs(updated);
    setRequesting(null);

    // Simulate async admin approval for demo (manual plans → approved after 8s)
    if (plan.approval === "manual") {
      setTimeout(() => {
        setSubs((prev) => {
          const next = prev.map((s) =>
            s.id === newSub.id
              ? { ...s, status: "active" as SubStatus, approvedAt: new Date().toISOString(), apiKey: makeDemoKey(plan.id) }
              : s
          );
          saveSubs(next);
          return next;
        });
        showToast(`${plan.name} access approved — your API key is ready.`);
      }, 8000);
    }
  };

  const revokeAccess = (sub: Subscription) => {
    const updated = subs.map((s) =>
      s.id === sub.id ? { ...s, status: "revoked" as SubStatus, apiKey: undefined } : s
    );
    setSubs(updated);
    saveSubs(updated);
    showToast("Subscription revoked.", "info");
  };

  return (
    <>
      <Head>
        <title>{view === "plans" ? "API Access Plans" : "My Subscriptions"}</title>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.3; }
          }
          @keyframes slideIn {
            from { transform: translateY(12px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes fadeUp {
            from { transform: translateY(24px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          .plan-card {
            animation: fadeUp 0.4s ease both;
          }
          .plan-card:nth-child(1) { animation-delay: 0.05s; }
          .plan-card:nth-child(2) { animation-delay: 0.12s; }
          .plan-card:nth-child(3) { animation-delay: 0.19s; }
        `}</style>
      </Head>

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: 28,
            right: 28,
            zIndex: 9999,
            padding: "12px 20px",
            borderRadius: 10,
            background: toast.type === "success" ? "#0f172a" : "#1e293b",
            color: "#f8fafc",
            fontSize: 14,
            fontWeight: 500,
            boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
            animation: "slideIn 0.25s ease",
            display: "flex",
            alignItems: "center",
            gap: 10,
            maxWidth: 360,
          }}
        >
          <span style={{ fontSize: 16 }}>{toast.type === "success" ? "✓" : "⏳"}</span>
          {toast.message}
        </div>
      )}

      <div style={{ maxWidth: 960, margin: "0 auto", padding: "48px 24px" }}>
        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div
            style={{
              display: "flex",
              gap: 4,
              marginBottom: 28,
              background: "var(--muted, #f1f5f9)",
              borderRadius: 10,
              padding: 4,
              width: "fit-content",
            }}
          >
            {(["plans", "subscriptions"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: "7px 18px",
                  borderRadius: 7,
                  border: "none",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: view === v ? "var(--background, #fff)" : "transparent",
                  color: view === v ? "var(--foreground, #0f172a)" : "var(--muted-foreground, #64748b)",
                  boxShadow: view === v ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                }}
              >
                {v === "plans" ? "API Plans" : "My Subscriptions"}
                {v === "subscriptions" && subs.filter((s) => s.status !== "revoked").length > 0 && (
                  <span
                    style={{
                      marginLeft: 6,
                      background: "#3b82f6",
                      color: "#fff",
                      borderRadius: 999,
                      fontSize: 11,
                      padding: "1px 6px",
                    }}
                  >
                    {subs.filter((s) => s.status !== "revoked").length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {view === "plans" ? (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "var(--foreground, #0f172a)" }}>
                Forest River API Plans
              </h1>
              <p style={{ fontSize: 15, color: "var(--muted-foreground, #64748b)", margin: 0 }}>
                Choose the access tier that fits your integration. Basic access is auto-approved; Pro and Enterprise require admin review.
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontSize: 28, fontWeight: 700, margin: "0 0 8px", color: "var(--foreground, #0f172a)" }}>
                My Subscriptions
              </h1>
              <p style={{ fontSize: 15, color: "var(--muted-foreground, #64748b)", margin: 0 }}>
                Manage your active API access and credentials.
              </p>
            </>
          )}
        </div>

        {/* Plans View */}
        {view === "plans" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
            {PLANS.map((plan) => {
              const existing = subForPlan(plan.id);
              const isRequesting = requesting === plan.id;

              return (
                <div
                  key={plan.id}
                  className="plan-card"
                  style={{
                    borderRadius: 14,
                    border: plan.highlight
                      ? "2px solid #3b82f6"
                      : "1px solid var(--border, #e2e8f0)",
                    padding: "28px 24px",
                    background: plan.highlight
                      ? "linear-gradient(135deg, #eff6ff 0%, #fff 60%)"
                      : "var(--card, #fff)",
                    position: "relative",
                    display: "flex",
                    flexDirection: "column",
                    gap: 20,
                    boxShadow: plan.highlight
                      ? "0 4px 24px rgba(59,130,246,0.12)"
                      : "0 1px 4px rgba(0,0,0,0.04)",
                  }}
                >
                  {plan.highlight && (
                    <div
                      style={{
                        position: "absolute",
                        top: -1,
                        right: 20,
                        background: "#3b82f6",
                        color: "#fff",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.06em",
                        padding: "4px 12px",
                        borderRadius: "0 0 8px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Recommended
                    </div>
                  )}

                  <div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                      <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0, color: "var(--foreground, #0f172a)" }}>
                        {plan.name}
                      </h2>
                      {existing && <Badge status={existing.status} />}
                    </div>
                    <p style={{ fontSize: 13, color: "var(--muted-foreground, #64748b)", margin: 0 }}>
                      {plan.tagline}
                    </p>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {[
                      { label: "Rate limit", value: plan.rateLimit },
                      { label: "Monthly quota", value: plan.quota },
                      { label: "SLA", value: plan.sla },
                      { label: "Approval", value: plan.approval === "auto" ? "Instant" : "Admin review required" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--muted-foreground, #64748b)" }}>{label}</span>
                        <span style={{ fontWeight: 600, color: "var(--foreground, #0f172a)" }}>{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    disabled={!!existing || isRequesting}
                    onClick={() => requestAccess(plan)}
                    style={{
                      marginTop: "auto",
                      padding: "10px 0",
                      borderRadius: 8,
                      border: "none",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: existing || isRequesting ? "not-allowed" : "pointer",
                      transition: "all 0.15s",
                      background: existing
                        ? "var(--muted, #f1f5f9)"
                        : plan.highlight
                        ? "#3b82f6"
                        : "var(--foreground, #0f172a)",
                      color: existing
                        ? "var(--muted-foreground, #94a3b8)"
                        : "#fff",
                      opacity: isRequesting ? 0.7 : 1,
                    }}
                  >
                    {isRequesting
                      ? "Requesting…"
                      : existing?.status === "pending"
                      ? "Pending approval"
                      : existing?.status === "active"
                      ? "Already subscribed"
                      : "Request access"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Subscriptions View */}
        {view === "subscriptions" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {subs.filter((s) => s.status !== "revoked").length === 0 ? (
              <div
                style={{
                  padding: "60px 24px",
                  textAlign: "center",
                  border: "2px dashed var(--border, #e2e8f0)",
                  borderRadius: 14,
                  color: "var(--muted-foreground, #94a3b8)",
                }}
              >
                <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
                <p style={{ margin: 0, fontSize: 15 }}>No active subscriptions yet.</p>
                <button
                  onClick={() => setView("plans")}
                  style={{
                    marginTop: 16,
                    padding: "8px 20px",
                    borderRadius: 8,
                    border: "1px solid var(--border, #e2e8f0)",
                    background: "transparent",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    color: "var(--foreground, #0f172a)",
                  }}
                >
                  Browse plans →
                </button>
              </div>
            ) : (
              subs
                .filter((s) => s.status !== "revoked")
                .map((sub) => {
                  const plan = PLANS.find((p) => p.id === sub.planId)!;
                  return (
                    <div
                      key={sub.id}
                      style={{
                        borderRadius: 12,
                        border: "1px solid var(--border, #e2e8f0)",
                        padding: "24px",
                        background: "var(--card, #fff)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 16,
                        animation: "fadeUp 0.3s ease both",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <h3 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>
                            {plan.name} Plan
                          </h3>
                          <p style={{ margin: 0, fontSize: 13, color: "var(--muted-foreground, #64748b)" }}>
                            Requested {new Date(sub.requestedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {sub.approvedAt && (
                              <> · Approved {new Date(sub.approvedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</>
                            )}
                          </p>
                        </div>
                        <Badge status={sub.status} />
                      </div>

                      {sub.status === "pending" && (
                        <div
                          style={{
                            background: "#fef3c718",
                            border: "1px solid #f59e0b40",
                            borderRadius: 8,
                            padding: "12px 16px",
                            fontSize: 13,
                            color: "#92400e",
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span style={{ fontSize: 16 }}>⏳</span>
                          Your request is awaiting admin review. You'll receive access once approved — this typically takes less than 1 business day.
                          <br />
                          <span style={{ fontSize: 11, opacity: 0.7 }}>(Demo: auto-approves in ~8 seconds)</span>
                        </div>
                      )}

                      {sub.status === "active" && sub.apiKey && (
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 600, color: "var(--muted-foreground, #64748b)", marginBottom: 6, letterSpacing: "0.04em" }}>
                            API KEY
                          </div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              background: "var(--muted, #f8fafc)",
                              border: "1px solid var(--border, #e2e8f0)",
                              borderRadius: 8,
                              padding: "10px 14px",
                            }}
                          >
                            <code
                              style={{
                                flex: 1,
                                fontSize: 13,
                                fontFamily: "monospace",
                                color: "var(--foreground, #0f172a)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {sub.apiKey}
                            </code>
                            <CopyButton value={sub.apiKey} />
                          </div>
                          <p style={{ margin: "6px 0 0", fontSize: 12, color: "var(--muted-foreground, #94a3b8)" }}>
                            Include as <code style={{ fontSize: 11 }}>Authorization: Bearer {"<key>"}</code> on every request.
                          </p>
                        </div>
                      )}

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: 12,
                          padding: "14px 0",
                          borderTop: "1px solid var(--border, #f1f5f9)",
                        }}
                      >
                        {[
                          { label: "Rate limit", value: plan.rateLimit },
                          { label: "Monthly quota", value: plan.quota },
                          { label: "SLA", value: plan.sla },
                        ].map(({ label, value }) => (
                          <div key={label}>
                            <div style={{ fontSize: 11, color: "var(--muted-foreground, #94a3b8)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 2 }}>
                              {label.toUpperCase()}
                            </div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--foreground, #0f172a)" }}>{value}</div>
                          </div>
                        ))}
                      </div>

                      <div style={{ display: "flex", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => revokeAccess(sub)}
                          style={{
                            padding: "7px 16px",
                            borderRadius: 7,
                            border: "1px solid #fca5a5",
                            background: "transparent",
                            color: "#ef4444",
                            fontSize: 13,
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Revoke access
                        </button>
                      </div>
                    </div>
                  );
                })
            )}

            {/* Revoked history */}
            {subs.some((s) => s.status === "revoked") && (
              <details style={{ marginTop: 8 }}>
                <summary style={{ fontSize: 13, color: "var(--muted-foreground, #94a3b8)", cursor: "pointer" }}>
                  Show revoked subscriptions ({subs.filter((s) => s.status === "revoked").length})
                </summary>
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  {subs
                    .filter((s) => s.status === "revoked")
                    .map((sub) => {
                      const plan = PLANS.find((p) => p.id === sub.planId)!;
                      return (
                        <div
                          key={sub.id}
                          style={{
                            borderRadius: 10,
                            border: "1px solid var(--border, #f1f5f9)",
                            padding: "16px 20px",
                            background: "var(--muted, #f8fafc)",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            opacity: 0.6,
                          }}
                        >
                          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--foreground, #0f172a)" }}>
                            {plan.name} Plan
                          </span>
                          <Badge status="revoked" />
                        </div>
                      );
                    })}
                </div>
              </details>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default SubscribePage;
