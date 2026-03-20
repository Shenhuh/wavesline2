"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpeechButtonProps = {
  text: string;
  preferredVoice?: string | null;
  autoPlay?: boolean;
  buttonLabel?: string;
};

function pickVoice(voices: SpeechSynthesisVoice[], preferredVoice?: string | null) {
  if (!voices.length) return null;
  const preferred = (preferredVoice ?? "").trim().toLowerCase();
  if (preferred) {
    const exact = voices.find((v) => v.name.toLowerCase().includes(preferred) || v.voiceURI.toLowerCase().includes(preferred));
    if (exact) return exact;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith("en")) ?? voices[0];
}

export default function SpeechButton({ text, preferredVoice, autoPlay = false, buttonLabel = "Play Voice" }: SpeechButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined" || !("speechSynthesis" in window)) { setSupported(false); return; }
    setSupported(true);
    const synth = window.speechSynthesis;
    const loadVoices = () => setVoices(synth.getVoices());
    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);
    return () => { synth.removeEventListener("voiceschanged", loadVoices); synth.cancel(); };
  }, []);

  const selectedVoice = useMemo(() => pickVoice(voices, preferredVoice), [voices, preferredVoice]);

  function speak() {
    if (!mounted || !supported || !text.trim()) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    if (selectedVoice) u.voice = selectedVoice;
    u.rate = 0.96; u.pitch = 1; u.volume = 1;
    u.onstart = () => setIsSpeaking(true);
    u.onend = () => setIsSpeaking(false);
    u.onerror = () => setIsSpeaking(false);
    synth.speak(u);
  }

  function stop() {
    if (!mounted || !supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  useEffect(() => {
    if (!mounted || !supported || !autoPlay || hasAutoPlayedRef.current || !text.trim() || voices.length === 0) return;
    hasAutoPlayedRef.current = true;
    speak();
  }, [mounted, supported, autoPlay, text, voices.length]); // eslint-disable-line

  if (!mounted) return (
    <button disabled className="rounded px-3 py-1.5 text-[11px] font-medium text-[#23252f]/40 opacity-50"
      style={{ background: "#f0f1f4", border: "1px solid rgba(0,0,0,0.1)" }}>
      {buttonLabel}
    </button>
  );

  if (!supported) return <div className="text-xs text-[#23252f]/30">Voice not supported.</div>;

  return (
    <button
      type="button"
      onClick={isSpeaking ? stop : speak}
      className="flex items-center gap-1.5 rounded px-3 py-1.5 text-[11px] font-semibold text-[#23252f]/60 transition-all hover:text-[#23252f]/90"
      style={{
        background: isSpeaking ? "#e0e1e8" : "#f0f1f4",
        border: "1px solid rgba(0,0,0,0.1)",
      }}
    >
      {isSpeaking ? (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <rect x="1.5" y="1.5" width="2.5" height="8" rx="1" fill="currentColor"/>
            <rect x="7" y="1.5" width="2.5" height="8" rx="1" fill="currentColor"/>
          </svg>
          Stop
        </>
      ) : (
        <>
          <svg width="11" height="11" viewBox="0 0 11 11" fill="none">
            <polygon points="1.5,1 9.5,5.5 1.5,10" fill="currentColor"/>
          </svg>
          {buttonLabel}
        </>
      )}
    </button>
  );
}