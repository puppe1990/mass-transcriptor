import { useState } from "react";

export function TranscriptPreview({ text }: { text?: string | null }) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  if (!text) {
    return <p>No transcript available yet.</p>;
  }

  async function handleCopy() {
    if (!navigator.clipboard) {
      setCopyState("failed");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopyState("copied");
      window.setTimeout(() => setCopyState("idle"), 2000);
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="transcript-preview">
      <div className="transcript-preview__header">
        <h2>Transcript</h2>
        <button type="button" className="transcript-preview__copy" onClick={handleCopy}>
          {copyState === "copied" ? "Copied" : "Copy Text"}
        </button>
      </div>
      {copyState === "failed" ? <p role="status">Could not copy text.</p> : null}
      <pre>{text}</pre>
    </section>
  );
}
