"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type SpeechButtonProps = {
  text: string;
  preferredVoice?: string | null;
  autoPlay?: boolean;
  buttonLabel?: string;
};

function pickVoice(
  voices: SpeechSynthesisVoice[],
  preferredVoice?: string | null
) {
  if (!voices.length) return null;

  const preferred = (preferredVoice ?? "").trim().toLowerCase();

  if (preferred) {
    const exact = voices.find(
      (v) =>
        v.name.toLowerCase().includes(preferred) ||
        v.voiceURI.toLowerCase().includes(preferred)
    );

    if (exact) return exact;
  }

  const english = voices.find((v) => v.lang.toLowerCase().startsWith("en"));
  if (english) return english;

  return voices[0];
}

export default function SpeechButton({
  text,
  preferredVoice,
  autoPlay = false,
  buttonLabel = "Play Voice",
}: SpeechButtonProps) {
  const [mounted, setMounted] = useState(false);
  const [supported, setSupported] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const hasAutoPlayedRef = useRef(false);

  useEffect(() => {
    setMounted(true);

    if (typeof window === "undefined" || !("speechSynthesis" in window)) {
      setSupported(false);
      return;
    }

    setSupported(true);

    const synth = window.speechSynthesis;

    function loadVoices() {
      setVoices(synth.getVoices());
    }

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
      synth.cancel();
    };
  }, []);

  const selectedVoice = useMemo(
    () => pickVoice(voices, preferredVoice),
    [voices, preferredVoice]
  );

  function speak() {
    if (!mounted || !supported) return;
    if (!text.trim()) return;

    const synth = window.speechSynthesis;
    synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.rate = 0.96;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synth.speak(utterance);
  }

  function stop() {
    if (!mounted || !supported) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }

  useEffect(() => {
    if (!mounted || !supported) return;
    if (!autoPlay) return;
    if (hasAutoPlayedRef.current) return;
    if (!text.trim()) return;
    if (voices.length === 0) return;

    hasAutoPlayedRef.current = true;
    speak();
  }, [mounted, supported, autoPlay, text, voices.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex items-center gap-2">
      {!mounted ? (
        <button
          type="button"
          disabled
          className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[#2a313d] opacity-60"
        >
          {buttonLabel}
        </button>
      ) : !supported ? (
        <div className="text-xs text-[#677388]">
          Voice playback is not supported in this browser.
        </div>
      ) : isSpeaking ? (
        <button
          type="button"
          onClick={stop}
          className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[#2a313d]"
        >
          Stop Voice
        </button>
      ) : (
        <button
          type="button"
          onClick={speak}
          className="rounded-xl border border-black/10 px-3 py-2 text-xs font-semibold text-[#2a313d]"
        >
          {buttonLabel}
        </button>
      )}
    </div>
  );
}