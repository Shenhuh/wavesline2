// app/admin/characters/CharacterForm.tsx

"use client";

import React from "react";
import type { AdminCharacterRow } from "@/lib/admin/characters";

export default function CharacterForm({
  character,
  submitLabel,
}: {
  character?: AdminCharacterRow | null;
  submitLabel: string;
}) {
  const [forms, setForms] = React.useState<Array<{ display_name: string; avatar: string; trigger_type: "mood" | "random"; mood_triggers: string[]; chance: number }>>(
    Array.isArray((character as any)?.forms) ? (character as any).forms : []
  );
  return (
    <div className="space-y-6">

      {/* Section: Identity */}
      <Section title="Identity">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" name="name" defaultValue={character?.name} required />
          <Field label="Key" name="key" defaultValue={character?.key} required mono />
          <Field label="Title" name="title" defaultValue={character?.title ?? ""} />
          <Field label="Base Tone" name="baseTone" defaultValue={character?.base_tone ?? ""} />
        </div>
      </Section>

      {/* Section: Avatar */}
      <Section title="Avatar">
        {character?.avatar ? (
          <div className="mb-4 flex items-center gap-4 rounded-xl p-4" style={{ background: "#f6f7f9", border: "1px solid rgba(0,0,0,0.07)" }}>
            <img src={character.avatar} alt={character.name} className="h-16 w-16 rounded-full object-cover ring-2 ring-black/10" />
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[#23252f]">Current Avatar</div>
              <div className="truncate text-xs text-[#23252f]/40 mt-0.5">{character.avatar}</div>
            </div>
          </div>
        ) : (
          <div className="mb-4 rounded-xl p-4 text-sm text-[#23252f]/40" style={{ background: "#f6f7f9", border: "1px dashed rgba(0,0,0,0.1)" }}>
            No avatar uploaded yet.
          </div>
        )}
        <input
          name="avatarFile"
          type="file"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          className="w-full rounded-xl px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#23252f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
          style={{ background: "white", border: "1px solid rgba(0,0,0,0.1)" }}
        />
        <p className="mt-2 text-xs text-[#23252f]/40">Leave empty to keep the current avatar.</p>
      </Section>

      {/* Section: Behavior */}
      <Section title="Behavior">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Reference Image URL" name="referenceImageUrl" defaultValue={character?.reference_image_url ?? ""} />
          <Field label="Annoyance Threshold" name="annoyanceThreshold" type="number" defaultValue={String(character?.annoyance_threshold ?? 85)} />
          <Field label="Preferred Voice" name="preferredVoice" defaultValue={character?.preferred_voice ?? ""} />
        </div>
        <TextArea label="Starter Message" name="starterMessage" defaultValue={character?.starter_message ?? ""} rows={4} />
      </Section>

      {/* Section: Traits */}
      <Section title="Traits">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextArea label="Style Notes" name="styleNotes" hint="One per line" defaultValue={(character?.style_notes ?? []).join("\n")} rows={7} />
          <TextArea label="Allowed Modes" name="allowedModes" hint="One per line" defaultValue={(character?.allowed_modes ?? []).join("\n")} rows={7} />
          <TextArea label="Likes" name="likes" hint="One per line" defaultValue={(character?.likes ?? []).join("\n")} rows={7} />
          <TextArea label="Dislikes" name="dislikes" hint="One per line" defaultValue={(character?.dislikes ?? []).join("\n")} rows={7} />
        </div>
      </Section>

      {/* Section: Deep Config */}
      <Section title="Character Configuration">
        <TextArea label="Identity Notes" name="identityNotes" defaultValue={character?.identity_notes ?? ""} rows={5} />
        <TextArea label="Conversation Rules" name="conversationRules" defaultValue={character?.conversation_rules ?? ""} rows={5} />
        <TextArea label="Relationship Behavior" name="relationshipBehavior" defaultValue={character?.relationship_behavior ?? ""} rows={5} />
        <TextArea label="Lore Context" name="loreContext" defaultValue={character?.lore_context ?? ""} rows={6} />
        <TextArea label="Hard Constraints" name="hardConstraints" defaultValue={character?.hard_constraints ?? ""} rows={5} />
        <TextArea label="Block Message" name="blockMessage" defaultValue={character?.block_message ?? ""} rows={3} />
      </Section>

      {/* Section: Voice */}
      <Section title="Voice Settings">
        <div className="grid gap-3 sm:grid-cols-2">
          <CheckRow label="Voice Only" name="voiceOnly" defaultChecked={Boolean(character?.voice_only)} desc="Character responds with voice instead of text" />
          <CheckRow label="Auto Play Voice" name="autoPlayVoice" defaultChecked={Boolean(character?.auto_play_voice)} desc="Automatically play voice on new messages" />
        </div>
      </Section>

      {/* Section: Stickers */}
      <Section title="Sticker Behavior">
        <CheckRow label="Character likes sending stickers" name="stickerEnabled" defaultChecked={Boolean(character?.sticker_enabled)} />
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <Field label="Base Sticker Chance" name="stickerBaseChance" type="number" step="0.01" min="0" max="1" defaultValue={String(character?.sticker_base_chance ?? 0.12)} />
            <p className="mt-1.5 text-xs text-[#23252f]/40">0.05 = rare · 0.18 = moderate · 0.30 = frequent</p>
          </div>
          <div>
            <Field label="Mood Influence" name="stickerMoodInfluence" type="number" step="0.01" min="0" max="1" defaultValue={String(character?.sticker_mood_influence ?? 0.12)} />
            <p className="mt-1.5 text-xs text-[#23252f]/40">Higher = mood changes frequency more strongly</p>
          </div>
        </div>
      </Section>

      {/* Section: Forms */}
      <Section title="Forms (Mood-based appearance)">
        <p className="text-xs text-[#23252f]/40 mb-3">
          Define alternate avatars and display names that activate based on the character&apos;s current mood. Leave empty if this character has no forms.
        </p>
        <input type="hidden" name="formsJson" value={JSON.stringify(forms)} />
        <div className="space-y-3">
          {forms.map((form, i) => (
            <FormEntry
              key={i}
              index={i}
              form={form}
              characterKey={character?.key ?? "character"}
              onChange={(patch) => setForms((prev) => prev.map((f, j) => j === i ? { ...f, ...patch } : f))}
              onRemove={() => setForms((prev) => prev.filter((_, j) => j !== i))}
            />
          ))}
        </div>
        <button
          type="button"
          onClick={() => setForms((prev) => [...prev, { display_name: "", avatar: "", trigger_type: "mood", mood_triggers: [], chance: 0.1 }])}
          className="mt-3 text-sm font-semibold text-[#23252f]/60 hover:text-[#23252f] transition-colors"
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
        >
          + Add Form
        </button>
      </Section>

      {/* Submit */}
      <button
        type="submit"
        style={{
          borderRadius: 10,
          padding: "10px 24px",
          fontSize: 13,
          fontWeight: 600,
          color: "#ffffff",
          background: "#23252f",
          border: "none",
          cursor: "pointer",
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}

function FormEntry({
  index,
  form,
  characterKey,
  onChange,
  onRemove,
}: {
  index: number;
  form: { display_name: string; avatar: string; trigger_type: "mood" | "random"; mood_triggers: string[]; chance: number };
  characterKey: string;
  onChange: (patch: Partial<{ display_name: string; avatar: string; trigger_type: "mood" | "random"; mood_triggers: string[]; chance: number }>) => void;
  onRemove: () => void;
}) {
  const [uploading, setUploading] = React.useState(false);
  const [uploadError, setUploadError] = React.useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("characterKey", characterKey);
      const res = await fetch("/api/admin/upload-avatar", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Upload failed");
      onChange({ avatar: data.url });
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-xl p-4 space-y-3" style={{ background: "#f6f7f9", border: "1px solid rgba(0,0,0,0.08)" }}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-[#23252f]/50 uppercase tracking-wide">Form {index + 1}</span>
        <button type="button" onClick={onRemove} className="text-xs text-red-400 hover:text-red-600 font-medium">
          Remove
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">Display Name</label>
          <input
            type="text"
            value={form.display_name}
            onChange={(e) => onChange({ display_name: e.target.value })}
            placeholder="e.g. ???"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm text-[#23252f] outline-none"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)" }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">Avatar</label>
          {form.avatar ? (
            <div className="flex items-center gap-3 rounded-xl p-3" style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)" }}>
              <img src={form.avatar} alt={form.display_name} className="h-10 w-10 rounded-full object-cover shrink-0" onError={(e) => { e.currentTarget.style.display = "none"; }} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs text-[#23252f]/40">{form.avatar}</div>
                <button
                  type="button"
                  onClick={() => onChange({ avatar: "" })}
                  className="mt-1 text-xs text-red-400 hover:text-red-600"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/jpg"
                disabled={uploading}
                onChange={handleFileChange}
                className="w-full rounded-xl px-4 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-[#23252f] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)" }}
              />
              {uploading && <p className="mt-1 text-xs text-[#23252f]/40">Uploading…</p>}
              {uploadError && <p className="mt-1 text-xs text-red-400">{uploadError}</p>}
            </div>
          )}
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">Trigger Type</label>
        <div className="flex gap-2">
          {(["mood", "random"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => onChange({ trigger_type: type })}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors"
              style={{
                background: form.trigger_type === type ? "#23252f" : "white",
                color: form.trigger_type === type ? "white" : "rgba(35,37,47,0.5)",
                border: "1px solid rgba(0,0,0,0.09)",
              }}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {form.trigger_type === "mood" ? (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">
            Mood Triggers <span className="text-[#23252f]/30 normal-case font-normal">(comma separated)</span>
          </label>
          <input
            type="text"
            value={(form.mood_triggers ?? []).join(", ")}
            onChange={(e) => onChange({ mood_triggers: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="e.g. hostile, enraged, dark"
            className="w-full rounded-lg px-3.5 py-2.5 text-sm text-[#23252f] outline-none"
            style={{ background: "white", border: "1px solid rgba(0,0,0,0.09)" }}
          />
        </div>
      ) : (
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">
            Chance per message <span className="text-[#23252f]/30 normal-case font-normal">({Math.round((form.chance ?? 0) * 100)}%)</span>
          </label>
          <input
            type="range"
            min="0.01"
            max="1"
            step="0.01"
            value={form.chance ?? 0.1}
            onChange={(e) => onChange({ chance: Number(e.target.value) })}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-[#23252f]/30 mt-1">
            <span>1% (very rare)</span>
            <span>50%</span>
            <span>100% (always)</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "white", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
      <div className="px-5 py-3.5" style={{ borderBottom: "1px solid rgba(0,0,0,0.06)", background: "#f6f7f9" }}>
        <h3 className="text-xs font-semibold uppercase tracking-widest text-[#23252f]/50">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, name, defaultValue, required, type = "text", step, min, max, mono }: {
  label: string; name: string; defaultValue?: string; required?: boolean;
  type?: string; step?: string; min?: string; max?: string; mono?: boolean;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">
        {label}{required && <span className="ml-1 text-red-400">*</span>}
      </label>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        step={step}
        min={min}
        max={max}
        className={`w-full rounded-lg px-3.5 py-2.5 text-sm text-[#23252f] outline-none transition-colors focus:border-[#23252f]/30 ${mono ? "font-mono" : ""}`}
        style={{ background: "#f6f7f9", border: "1px solid rgba(0,0,0,0.09)" }}
      />
    </div>
  );
}

function TextArea({ label, name, defaultValue, rows = 4, hint }: {
  label: string; name: string; defaultValue?: string; rows?: number; hint?: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center gap-2">
        <label className="text-xs font-semibold text-[#23252f]/60 uppercase tracking-wide">{label}</label>
        {hint && <span className="text-xs text-[#23252f]/30">{hint}</span>}
      </div>
      <textarea
        name={name}
        defaultValue={defaultValue}
        rows={rows}
        className="w-full rounded-lg px-3.5 py-2.5 text-sm text-[#23252f] outline-none transition-colors focus:border-[#23252f]/30 resize-none"
        style={{ background: "#f6f7f9", border: "1px solid rgba(0,0,0,0.09)" }}
      />
    </div>
  );
}

function CheckRow({ label, name, defaultChecked, desc }: {
  label: string; name: string; defaultChecked?: boolean; desc?: string;
}) {
  return (
    <label
      className="flex items-start gap-3 rounded-lg px-4 py-3 cursor-pointer transition-colors hover:bg-[#f6f7f9]"
      style={{ border: "1px solid rgba(0,0,0,0.08)" }}
    >
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="mt-0.5 h-4 w-4 rounded accent-[#23252f]" />
      <div>
        <div className="text-sm font-semibold text-[#23252f]">{label}</div>
        {desc && <div className="text-xs text-[#23252f]/40 mt-0.5">{desc}</div>}
      </div>
    </label>
  );
}