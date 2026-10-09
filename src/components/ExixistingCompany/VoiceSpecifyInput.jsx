import { useEffect, useLayoutEffect, useRef, useState } from "react";
import SpeechRecognition, { useSpeechRecognition } from "react-speech-recognition";
import { Mic } from "lucide-react";

// Each spoken segment (split where the speaker pauses) becomes its own
// paragraph: first letter capitalised, closing full stop added.
const toParagraph = (s) => {
  const t = s.trim().replace(/\s+/g, " ");
  if (!t) return "";
  const cap = t.charAt(0).toUpperCase() + t.slice(1);
  return /[.!?]$/.test(cap) ? cap : `${cap}.`;
};
const appendParagraph = (text, para) => (text.trim() ? `${text.replace(/\s+$/, "")}\n\n${para}` : para);

// "Please specify" box with a mic in the right corner. Grows with its text;
// typing works as normal, and dictated text is added after it as paragraphs.
export default function VoiceSpecifyInput({ value, onChange, className, placeholder }) {
  const { finalTranscript, interimTranscript, listening, resetTranscript, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
    useSpeechRecognition();
  // The speech hook is shared by every instance — only the one whose mic was
  // clicked takes the transcript.
  const [active, setActive] = useState(false);
  const usedLen = useRef(0);
  const valueRef = useRef(value);
  valueRef.current = value;
  const boxRef = useRef(null);

  useEffect(() => {
    if (!active) return;
    const fresh = finalTranscript.slice(usedLen.current);
    usedLen.current = finalTranscript.length;
    const para = toParagraph(fresh);
    if (para) onChange(appendParagraph(valueRef.current || "", para));
  }, [finalTranscript, active]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (active && !listening) setActive(false);
  }, [listening, active]);

  useEffect(() => () => {
    if (active) SpeechRecognition.stopListening();
  }, [active]);

  const live = active && interimTranscript.trim() ? appendParagraph(value || "", interimTranscript.trim()) : value || "";

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [live]);

  const toggleMic = () => {
    if (active) {
      // Stay active until the browser reports it has stopped — the words still
      // being spoken at the click arrive as a final result just after it.
      SpeechRecognition.stopListening();
      return;
    }
    resetTranscript();
    usedLen.current = 0;
    setActive(true);
    SpeechRecognition.startListening({ continuous: true, language: "en-IN" });
  };

  return (
    <div className="relative">
      <textarea
        ref={boxRef}
        rows={1}
        className={`${className} resize-none overflow-hidden ${browserSupportsSpeechRecognition ? "pr-11" : ""}`}
        value={live}
        readOnly={active}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {browserSupportsSpeechRecognition && (
        <button
          type="button"
          onClick={toggleMic}
          title={active ? "Stop recording" : "Speak instead of typing"}
          className={`absolute top-1.5 right-1.5 w-7 h-7 rounded-full flex items-center justify-center transition ${
            active ? "bg-red-500 text-white animate-pulse" : "text-gray-500 hover:bg-yellow-100 hover:text-gray-800"
          }`}
        >
          <Mic className="w-4 h-4" />
        </button>
      )}
      {!isMicrophoneAvailable && (
        <p className="text-xs text-red-500 mt-1">Microphone access is blocked. Allow it in the browser to use voice.</p>
      )}
      {active && <p className="text-xs text-green-600 mt-1">Listening… pause to start a new paragraph, click the mic to stop.</p>}
    </div>
  );
}
