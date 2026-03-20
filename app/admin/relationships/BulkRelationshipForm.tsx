// app/admin/relationships/BulkRelationshipForm.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CharacterOption, ExistingRelationship } from "./new/page";

type RowState = {
  targetCharacterId: string;
  affinity: number;
  trust: number;
  familiarity: number;
  notes: string;
  enabled: boolean;
};

type NodePosition = { x: number; y: number };

function clampStat(value: number) {
  if (!Number.isFinite(value)) return 0;
  return Math.max(-100, Math.min(100, value));
}

function makeRelationshipMap(existingRelationships: ExistingRelationship[]) {
  const map = new Map<string, ExistingRelationship>();
  for (const rel of existingRelationships) {
    map.set(`${rel.source_character_id}::${rel.target_character_id}`, rel);
  }
  return map;
}

function buildRowsForSource(args: {
  sourceCharacterId: string;
  characters: CharacterOption[];
  relationshipMap: Map<string, ExistingRelationship>;
}): RowState[] {
  const { sourceCharacterId, characters, relationshipMap } = args;
  if (!sourceCharacterId) return [];
  return characters
    .filter((c) => c.id !== sourceCharacterId)
    .map((target) => {
      const key = `${sourceCharacterId}::${target.id}`;
      const existing = relationshipMap.get(key);
      return {
        targetCharacterId: target.id,
        affinity: existing?.affinity ?? 0,
        trust: existing?.trust ?? 0,
        familiarity: existing?.familiarity ?? 0,
        notes: existing?.notes ?? "",
        enabled: existing ? (existing.enabled ?? true) : false,
      };
    });
}

function statColor(value: number) {
  if (value >= 40) return "#16a34a";
  if (value <= -40) return "#dc2626";
  return "#f59e0b";
}

function nodeRingColor(row: RowState) {
  if (!row.enabled) return "rgba(35,37,47,0.18)";
  const strongest = Math.max(
    Math.abs(row.affinity),
    Math.abs(row.trust),
    Math.abs(row.familiarity)
  );
  if (strongest < 25) return "#94a3b8";
  if (row.affinity >= 35 || row.trust >= 35) return "#16a34a";
  if (row.affinity <= -35 || row.trust <= -35) return "#dc2626";
  return "#f59e0b";
}

function getAvatarUrl(character: CharacterOption) {
  return character.avatar ?? "";
}

function buildDefaultPositions(
  count: number,
  canvasSize: { width: number; height: number }
): NodePosition[] {
  if (count === 0) return [];
  const { width, height } = canvasSize;
  const centerX = width / 2;
  const centerY = height / 2;
  const radius =
    count <= 3
      ? Math.min(width, height) * 0.28
      : count <= 6
        ? Math.min(width, height) * 0.33
        : Math.min(width, height) * 0.38;
  return Array.from({ length: count }).map((_, i) => {
    const angle = -Math.PI / 2 + (2 * Math.PI * i) / count;
    return {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    };
  });
}

function dist(a: NodePosition, b: NodePosition) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function BulkRelationshipForm({
  characters,
  existingRelationships,
  action,
}: {
  characters: CharacterOption[];
  existingRelationships: ExistingRelationship[];
  action: (formData: FormData) => Promise<void>;
}) {
  const relationshipMap = useMemo(
    () => makeRelationshipMap(existingRelationships),
    [existingRelationships]
  );

  const [sourceCharacterId, setSourceCharacterId] = useState<string>(
    characters[0]?.id ?? ""
  );
  const [rows, setRows] = useState<RowState[]>([]);
  const [activeTargetId, setActiveTargetId] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 760, height: 560 });
  const [positions, setPositions] = useState<NodePosition[]>([]);

  // Live drawing state
  const [drawing, setDrawing] = useState(false);
  const [drawEnd, setDrawEnd] = useState<NodePosition>({ x: 0, y: 0 });

  // Keep positions accessible inside pointer callbacks without stale closures
  const positionsRef = useRef<NodePosition[]>([]);
  const rowsRef = useRef<RowState[]>([]);

  const canvasRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsMounted(true);
    function update() {
      const isMobile = window.innerWidth < 768;
      setCanvasSize(
        isMobile ? { width: 340, height: 540 } : { width: 760, height: 560 }
      );
    }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    setRows(
      buildRowsForSource({ sourceCharacterId, characters, relationshipMap })
    );
    setActiveTargetId(null);
  }, [sourceCharacterId, characters, relationshipMap]);

  const orderedTargets = useMemo(
    () =>
      rows
        .map((row) => ({
          row,
          target: characters.find((c) => c.id === row.targetCharacterId),
        }))
        .filter(
          (e): e is { row: RowState; target: CharacterOption } =>
            Boolean(e.target)
        ),
    [rows, characters]
  );

  // Rebuild default positions when count / canvas changes
  useEffect(() => {
    const next = buildDefaultPositions(orderedTargets.length, canvasSize);
    setPositions(next);
    positionsRef.current = next;
  }, [orderedTargets.length, canvasSize.width, canvasSize.height]);

  // Keep refs in sync
  useEffect(() => { positionsRef.current = positions; }, [positions]);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const sourceCharacter = characters.find((c) => c.id === sourceCharacterId);

  const payload = useMemo(
    () =>
      JSON.stringify(
        rows.map((row) => ({
          targetCharacterId: row.targetCharacterId,
          affinity: clampStat(row.affinity),
          trust: clampStat(row.trust),
          familiarity: clampStat(row.familiarity),
          notes: row.notes.trim(),
          enabled: row.enabled,
        }))
      ),
    [rows]
  );

  const activeEntry = activeTargetId
    ? orderedTargets.find((e) => e.target.id === activeTargetId) ?? null
    : null;

  function updateRow(targetCharacterId: string, patch: Partial<RowState>) {
    setRows((cur) =>
      cur.map((row) =>
        row.targetCharacterId === targetCharacterId ? { ...row, ...patch } : row
      )
    );
  }

  function updatePosition(index: number, pos: NodePosition) {
    setPositions((prev) => {
      const next = [...prev];
      next[index] = pos;
      positionsRef.current = next;
      return next;
    });
  }

  // ── Source node pointer: draw a line, snap to target on release ────────────
  function handleSourcePointerDown(e: React.PointerEvent) {
    e.preventDefault();
    const cx = canvasSize.width / 2;
    const cy = canvasSize.height / 2;
    setDrawing(true);
    setDrawEnd({ x: cx, y: cy });

    const onMove = (me: PointerEvent) => {
      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      setDrawEnd({ x: me.clientX - r.left, y: me.clientY - r.top });
    };

    const onUp = (me: PointerEvent) => {
      setDrawing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      const r = canvasRef.current?.getBoundingClientRect();
      if (!r) return;
      const releasePos = { x: me.clientX - r.left, y: me.clientY - r.top };

      const HIT_RADIUS = 52;
      const currentPositions = positionsRef.current;
      const currentRows = rowsRef.current;

      const hitIndex = currentPositions.findIndex(
        (p) => p && dist(releasePos, p) < HIT_RADIUS
      );

      if (hitIndex !== -1) {
        const targetId = currentRows[hitIndex]?.targetCharacterId;
        if (targetId) {
          updateRow(targetId, { enabled: true });
          setActiveTargetId(targetId);
        }
      }
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  return (
    <form action={action} style={{ display: "grid", gap: 16 }}>
      <input type="hidden" name="sourceCharacterId" value={sourceCharacterId} />
      <input type="hidden" name="relationshipsJson" value={payload} />

      {/* Source selector */}
      <section
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(35,37,47,0.08)",
          background: "#fff",
          boxShadow: "0 12px 32px rgba(17,24,39,0.04)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(35,37,47,0.08)",
            background: "#f8f8f9",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: "0.06em",
            color: "rgba(35,37,47,0.55)",
            textTransform: "uppercase",
          }}
        >
          Source Character
        </div>

        <div style={{ padding: 18 }}>
          <label
            style={{
              display: "block",
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.04em",
              color: "rgba(35,37,47,0.55)",
              marginBottom: 10,
              textTransform: "uppercase",
            }}
          >
            Character
          </label>

          <select
            value={sourceCharacterId}
            onChange={(e) => setSourceCharacterId(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 12,
              border: "1px solid rgba(35,37,47,0.12)",
              background: "#fff",
              padding: "12px 14px",
              fontSize: 16,
              color: "#23252f",
              outline: "none",
            }}
          >
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.key})
              </option>
            ))}
          </select>

          {sourceCharacter && (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(35,37,47,0.55)" }}>
              <strong>Drag from {sourceCharacter.name}</strong> to a target node to create a relationship.
              Click any target node to edit it. Drag target nodes to rearrange.
            </p>
          )}
        </div>
      </section>

      {/* Relationship map */}
      <section
        style={{
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid rgba(35,37,47,0.08)",
          background: "#fff",
          boxShadow: "0 12px 32px rgba(17,24,39,0.04)",
        }}
      >
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid rgba(35,37,47,0.08)",
            background: "#f8f8f9",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              color: "rgba(35,37,47,0.55)",
              textTransform: "uppercase",
            }}
          >
            Relationship Map
          </div>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", fontSize: 12, color: "rgba(35,37,47,0.55)" }}>
            <LegendDot color="#16a34a" label="positive" />
            <LegendDot color="#dc2626" label="negative" />
            <LegendDot color="#f59e0b" label="mixed / neutral" />
            <LegendDot color="rgba(35,37,47,0.18)" label="no relationship" />
          </div>
        </div>

        <div style={{ padding: 18 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              overflow: "auto",
              borderRadius: 16,
              border: "1px solid rgba(35,37,47,0.08)",
              background:
                "radial-gradient(circle at center, rgba(59,130,246,0.05), rgba(255,255,255,0.7) 42%, #fff 70%)",
            }}
          >
            <div
              ref={canvasRef}
              style={{
                position: "relative",
                width: canvasSize.width,
                height: canvasSize.height,
                minWidth: canvasSize.width,
                minHeight: canvasSize.height,
                margin: "0 auto",
                userSelect: "none",
              }}
            >
              <svg
                width={canvasSize.width}
                height={canvasSize.height}
                style={{
                  position: "absolute",
                  inset: 0,
                  overflow: "visible",
                  pointerEvents: "none",
                }}
              >
                {/* Relationship lines — only enabled ones */}
                {orderedTargets.map((entry, index) => {
                  if (!entry.row.enabled) return null;
                  const pos = positions[index];
                  if (!pos || !isMounted) return null;
                  return (
                    <line
                      key={entry.target.id}
                      x1={canvasSize.width / 2}
                      y1={canvasSize.height / 2}
                      x2={pos.x}
                      y2={pos.y}
                      stroke={nodeRingColor(entry.row)}
                      strokeOpacity={0.9}
                      strokeWidth={2.5}
                    />
                  );
                })}

                {/* Live draw line */}
                {drawing && isMounted && (
                  <line
                    x1={canvasSize.width / 2}
                    y1={canvasSize.height / 2}
                    x2={drawEnd.x}
                    y2={drawEnd.y}
                    stroke="#3b82f6"
                    strokeOpacity={0.75}
                    strokeWidth={2.5}
                    strokeDasharray="6 4"
                  />
                )}
              </svg>

              {/* Source node */}
              {sourceCharacter && isMounted && (
                <div
                  onPointerDown={handleSourcePointerDown}
                  style={{
                    position: "absolute",
                    left: canvasSize.width / 2,
                    top: canvasSize.height / 2,
                    transform: "translate(-50%, -50%)",
                    cursor: "cell",
                    touchAction: "none",
                    zIndex: 10,
                  }}
                >
                  <NodeAvatar
                    character={sourceCharacter}
                    ringColor="#23252f"
                    size={88}
                    label={sourceCharacter.name}
                    isSource
                  />
                </div>
              )}

              {/* Target nodes */}
              {orderedTargets.map((entry, index) => {
                const pos = positions[index];
                if (!pos || !isMounted) return null;
                return (
                  <DraggableNode
                    key={entry.target.id}
                    index={index}
                    pos={pos}
                    canvasRef={canvasRef}
                    onMove={updatePosition}
                    onClick={() => setActiveTargetId(entry.target.id)}
                  >
                    <NodeAvatar
                      character={entry.target}
                      ringColor={nodeRingColor(entry.row)}
                      size={70}
                      selected={activeTargetId === entry.target.id}
                      dim={!entry.row.enabled}
                      label={entry.target.name}
                      miniStats={
                        entry.row.enabled
                          ? {
                              affinity: entry.row.affinity,
                              trust: entry.row.trust,
                              familiarity: entry.row.familiarity,
                            }
                          : undefined
                      }
                    />
                  </DraggableNode>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Edit modal */}
      {activeEntry && (
        <RelationshipModal
          sourceCharacter={sourceCharacter!}
          targetCharacter={activeEntry.target}
          row={activeEntry.row}
          onClose={() => setActiveTargetId(null)}
          onChange={(patch) => updateRow(activeEntry.target.id, patch)}
        />
      )}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="submit"
          style={{
            border: "none",
            borderRadius: 12,
            background: "#23252f",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
            padding: "12px 18px",
            cursor: "pointer",
          }}
        >
          Save All Relationships
        </button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// DraggableNode
// ---------------------------------------------------------------------------

function DraggableNode({
  index,
  pos,
  canvasRef,
  onMove,
  onClick,
  children,
}: {
  index: number;
  pos: NodePosition;
  canvasRef: React.RefObject<HTMLDivElement | null>;
  onMove: (index: number, pos: NodePosition) => void;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const dragging = useRef(false);
  const didDrag = useRef(false);
  const startOffset = useRef({ dx: 0, dy: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    dragging.current = true;
    didDrag.current = false;

    const canvasRect = canvasRef.current?.getBoundingClientRect();
    if (!canvasRect) return;
    startOffset.current = {
      dx: e.clientX - canvasRect.left - pos.x,
      dy: e.clientY - canvasRect.top - pos.y,
    };

    const handleMoveEvent = (me: PointerEvent) => {
      if (!dragging.current || !canvasRef.current) return;
      didDrag.current = true;
      const rect = canvasRef.current.getBoundingClientRect();
      onMove(index, {
        x: me.clientX - rect.left - startOffset.current.dx,
        y: me.clientY - rect.top - startOffset.current.dy,
      });
    };

    const handleUp = () => {
      dragging.current = false;
      window.removeEventListener("pointermove", handleMoveEvent);
      window.removeEventListener("pointerup", handleUp);
    };

    window.addEventListener("pointermove", handleMoveEvent);
    window.addEventListener("pointerup", handleUp);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onClick={() => {
        if (!didDrag.current) onClick();
      }}
      style={{
        position: "absolute",
        left: pos.x,
        top: pos.y,
        transform: "translate(-50%, -50%)",
        cursor: "grab",
        touchAction: "none",
      }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// UI components
// ---------------------------------------------------------------------------

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span
        style={{
          width: 10,
          height: 10,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      <span>{label}</span>
    </div>
  );
}

function NodeAvatar({
  character,
  ringColor,
  size,
  selected,
  dim,
  isSource,
  label,
  miniStats,
}: {
  character: CharacterOption;
  ringColor: string;
  size: number;
  selected?: boolean;
  dim?: boolean;
  isSource?: boolean;
  label: string;
  miniStats?: { affinity: number; trust: number; familiarity: number };
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        width: size + 52,
      }}
    >
      <div
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          padding: 3,
          background: ringColor,
          boxShadow: selected
            ? "0 0 0 6px rgba(61,127,255,0.22)"
            : "0 10px 22px rgba(15,23,42,0.12)",
          opacity: dim ? 0.45 : 1,
          transition: "all 0.16s ease",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            background: "#e5e7eb",
            border: "2px solid rgba(255,255,255,0.85)",
          }}
        >
          <img
            src={getAvatarUrl(character)}
            alt={character.name}
            draggable={false}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
            onError={(e) => {
              const img = e.currentTarget;
              img.style.display = "none";
              const fb = img.nextElementSibling as HTMLElement | null;
              if (fb) fb.style.display = "flex";
            }}
          />
          <div
            style={{
              display: "none",
              width: "100%",
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              background:
                "linear-gradient(135deg, rgba(35,37,47,0.95), rgba(74,85,104,0.95))",
              color: "#fff",
              fontWeight: 800,
              fontSize: size * 0.33,
            }}
          >
            {character.name.slice(0, 1).toUpperCase()}
          </div>
        </div>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: isSource ? 14 : 12,
          fontWeight: 700,
          color: "#23252f",
          lineHeight: 1.2,
          pointerEvents: "none",
        }}
      >
        {label}
      </div>

      {miniStats && (
        <div
          style={{
            display: "flex",
            gap: 6,
            justifyContent: "center",
            fontSize: 10.5,
            color: "rgba(35,37,47,0.6)",
            pointerEvents: "none",
          }}
        >
          <span>A {miniStats.affinity}</span>
          <span>T {miniStats.trust}</span>
          <span>F {miniStats.familiarity}</span>
        </div>
      )}
    </div>
  );
}

function MiniAvatar({ character, size }: { character: CharacterOption; size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "#e5e7eb",
        border: "2px solid rgba(35,37,47,0.12)",
        flexShrink: 0,
      }}
    >
      <img
        src={getAvatarUrl(character)}
        alt={character.name}
        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
        onError={(e) => {
          const img = e.currentTarget;
          img.style.display = "none";
          const fb = img.nextElementSibling as HTMLElement | null;
          if (fb) fb.style.display = "flex";
        }}
      />
      <div
        style={{
          display: "none",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, rgba(35,37,47,0.95), rgba(74,85,104,0.95))",
          color: "#fff",
          fontWeight: 800,
          fontSize: size * 0.33,
        }}
      >
        {character.name.slice(0, 1).toUpperCase()}
      </div>
    </div>
  );
}

function RelationshipModal({
  sourceCharacter,
  targetCharacter,
  row,
  onClose,
  onChange,
}: {
  sourceCharacter: CharacterOption;
  targetCharacter: CharacterOption;
  row: RowState;
  onClose: () => void;
  onChange: (patch: Partial<RowState>) => void;
}) {
  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,23,42,0.42)",
          zIndex: 70,
        }}
      />
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 71,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 740,
            maxHeight: "88vh",
            overflowY: "auto",
            borderRadius: 18,
            background: "#fff",
            boxShadow: "0 30px 80px rgba(15,23,42,0.24)",
            border: "1px solid rgba(35,37,47,0.08)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: 18,
              borderBottom: "1px solid rgba(35,37,47,0.08)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#23252f" }}>
                Edit Relationship
              </div>
              <div style={{ marginTop: 4, fontSize: 13, color: "rgba(35,37,47,0.55)" }}>
                {sourceCharacter.name} → {targetCharacter.name}
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                border: "1px solid rgba(35,37,47,0.12)",
                background: "#fff",
                borderRadius: 10,
                padding: "8px 12px",
                cursor: "pointer",
                fontWeight: 700,
                color: "#23252f",
              }}
            >
              Hide
            </button>
          </div>

          <div style={{ padding: 18, display: "grid", gap: 18 }}>
            {/* Avatar pair */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: 18,
                flexWrap: "wrap",
              }}
            >
              <div style={{ textAlign: "center" }}>
                <MiniAvatar character={sourceCharacter} size={62} />
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#23252f" }}>
                  {sourceCharacter.name}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "rgba(35,37,47,0.5)" }}>source</div>
              </div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "rgba(35,37,47,0.35)" }}>→</div>
              <div style={{ textAlign: "center" }}>
                <MiniAvatar character={targetCharacter} size={62} />
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: "#23252f" }}>
                  {targetCharacter.name}
                </div>
                <div style={{ marginTop: 2, fontSize: 12, color: "rgba(35,37,47,0.5)" }}>target</div>
              </div>
            </div>

            {/* Enable toggle */}
            <label
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontSize: 14,
                fontWeight: 700,
                color: "#23252f",
              }}
            >
              <input
                type="checkbox"
                checked={row.enabled}
                onChange={(e) => onChange({ enabled: e.target.checked })}
              />
              Enable this relationship
            </label>

            {/* Stats */}
            <div
              style={{
                display: "grid",
                gap: 14,
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              }}
            >
              <ModalStatField
                label="Affinity"
                value={row.affinity}
                onChange={(v) => onChange({ affinity: v, enabled: true })}
              />
              <ModalStatField
                label="Trust"
                value={row.trust}
                onChange={(v) => onChange({ trust: v, enabled: true })}
              />
              <ModalStatField
                label="Familiarity"
                value={row.familiarity}
                onChange={(v) => onChange({ familiarity: v, enabled: true })}
              />
            </div>

            {/* Notes */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 700,
                  letterSpacing: "0.04em",
                  color: "rgba(35,37,47,0.55)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                }}
              >
                Notes
              </label>
              <textarea
                value={row.notes}
                onChange={(e) => onChange({ notes: e.target.value, enabled: true })}
                rows={6}
                placeholder={`How does ${sourceCharacter.name} view ${targetCharacter.name}?`}
                style={{
                  width: "100%",
                  borderRadius: 12,
                  border: "1px solid rgba(35,37,47,0.12)",
                  background: "#fff",
                  padding: "12px 14px",
                  fontSize: 14,
                  color: "#23252f",
                  outline: "none",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Footer */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", fontSize: 12 }}>
                <QuickBadge label={`Affinity ${row.affinity}`} color={statColor(row.affinity)} />
                <QuickBadge label={`Trust ${row.trust}`} color={statColor(row.trust)} />
                <QuickBadge label={`Familiarity ${row.familiarity}`} color={statColor(row.familiarity)} />
              </div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  border: "none",
                  borderRadius: 12,
                  background: "#23252f",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  padding: "12px 18px",
                  cursor: "pointer",
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function ModalStatField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.04em",
          color: "rgba(35,37,47,0.55)",
          marginBottom: 8,
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      <input
        type="number"
        min={-100}
        max={100}
        value={value}
        onChange={(e) => onChange(clampStat(Number(e.target.value)))}
        style={{
          width: "100%",
          borderRadius: 12,
          border: "1px solid rgba(35,37,47,0.12)",
          background: "#fff",
          padding: "12px 14px",
          fontSize: 16,
          color: "#23252f",
          outline: "none",
        }}
      />
      <div
        style={{
          marginTop: 8,
          height: 7,
          borderRadius: 999,
          background: "rgba(35,37,47,0.08)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((clampStat(value) + 100) / 200) * 100}%`,
            height: "100%",
            background: statColor(value),
            borderRadius: 999,
          }}
        />
      </div>
    </div>
  );
}

function QuickBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(35,37,47,0.05)",
        color: "#23252f",
      }}
    >
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: color,
          display: "inline-block",
        }}
      />
      {label}
    </span>
  );
}