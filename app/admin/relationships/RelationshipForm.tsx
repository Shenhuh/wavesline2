// app/admin/relationships/RelationshipForm.tsx
import type { CharacterOption, RelationshipFormValues } from "@/lib/admin/relationships";

type Props = {
  values: RelationshipFormValues;
  characters: CharacterOption[];
  submitLabel: string;
  action: (formData: FormData) => void | Promise<void>;
};

const inputStyle: React.CSSProperties = {
  width: "100%", borderRadius: 9, border: "1px solid rgba(0,0,0,0.12)",
  padding: "10px 14px", fontSize: 13, color: "#23252f", background: "#f6f7f9",
  outline: "none", boxSizing: "border-box", fontFamily: "inherit",
};

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: 11, fontWeight: 700, textTransform: "uppercase",
  letterSpacing: "0.07em", color: "rgba(35,37,47,0.5)", marginBottom: 6,
};

const sectionStyle: React.CSSProperties = {
  background: "white", borderRadius: 12, border: "1px solid rgba(0,0,0,0.07)",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)", overflow: "hidden", marginBottom: 14,
};

const sectionHeader: React.CSSProperties = {
  padding: "12px 18px", background: "#f6f7f9", borderBottom: "1px solid rgba(0,0,0,0.06)",
  fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.07em", color: "rgba(35,37,47,0.45)",
};

function StatField({ name, label, defaultValue, hint }: { name: string; label: string; defaultValue: number; hint: string }) {
  const pct = Math.round(((defaultValue + 100) / 200) * 100);
  const color = defaultValue >= 50 ? "#22c55e" : defaultValue >= 0 ? "#f59e0b" : "#ef4444";
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <input name={name} type="number" defaultValue={defaultValue} min={-100} max={100} style={{ ...inputStyle, width: 90 }} />
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(35,37,47,0.08)", overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 99 }} />
        </div>
        <span style={{ fontSize: 12, fontWeight: 700, color, minWidth: 32, textAlign: "right" }}>
          {defaultValue > 0 ? `+${defaultValue}` : defaultValue}
        </span>
      </div>
      <p style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", margin: 0 }}>{hint}</p>
    </div>
  );
}

export default function RelationshipForm({ values, characters, submitLabel, action }: Props) {
  return (
    <form action={action}>

      {/* Characters */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>Characters</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "end" }}>
          <div>
            <label style={labelStyle}>Source character</label>
            <select name="sourceCharacterId" defaultValue={values.sourceCharacterId} required style={{ ...inputStyle }}>
              <option value="">Select character</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.key})</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", margin: "6px 0 0" }}>The character whose perspective this relationship is from.</p>
          </div>
          <div style={{ paddingBottom: 28, color: "rgba(35,37,47,0.3)", fontSize: 20, textAlign: "center" }}>→</div>
          <div>
            <label style={labelStyle}>Target character</label>
            <select name="targetCharacterId" defaultValue={values.targetCharacterId} required style={{ ...inputStyle }}>
              <option value="">Select character</option>
              {characters.map((c) => (
                <option key={c.id} value={c.id}>{c.name} ({c.key})</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "rgba(35,37,47,0.4)", margin: "6px 0 0" }}>The character this relationship points toward.</p>
          </div>
        </div>
        <div style={{ padding: "0 18px 18px" }}>
          <label style={labelStyle}>Relationship label</label>
          <input name="relationshipLabel" defaultValue={values.relationshipLabel} placeholder="ally, rival, acquaintance, superior, subordinate…" style={inputStyle} />
        </div>
      </div>

      {/* Stats */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>Relationship Stats · range −100 to +100</div>
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
          <StatField name="affinity" label="Affinity" defaultValue={Number(values.affinity)}
            hint="How much the source likes or dislikes the target emotionally." />
          <StatField name="trust" label="Trust" defaultValue={Number(values.trust)}
            hint="How much the source trusts or distrusts the target." />
          <StatField name="familiarity" label="Familiarity" defaultValue={Number(values.familiarity)}
            hint="How well the source knows the target. High = well acquainted." />
        </div>
      </div>

      {/* Notes */}
      <div style={sectionStyle}>
        <div style={sectionHeader}>Notes</div>
        <div style={{ padding: 18 }}>
          <textarea name="notes" defaultValue={values.notes} rows={7} style={{ ...inputStyle }}
            placeholder="Shared history, hidden tensions, unspoken dynamics, public vs private impression…" />
        </div>
      </div>

      <button type="submit" style={{ borderRadius: 9, padding: "10px 24px", fontSize: 13, fontWeight: 700, color: "white", background: "#23252f", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        {submitLabel}
      </button>
    </form>
  );
}