export function TranscriptPreview({ text }: { text?: string | null }) {
  if (!text) {
    return <p>No transcript available yet.</p>;
  }

  return (
    <section className="transcript-preview">
      <h2>Transcript</h2>
      <pre>{text}</pre>
    </section>
  );
}
