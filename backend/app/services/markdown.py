from __future__ import annotations


def render_transcript_markdown(transcript_text: str, filename: str, provider: str) -> str:
    return "\n".join(
        [
            "# Transcript",
            "",
            f"- Source: {filename}",
            f"- Provider: {provider}",
            "",
            transcript_text.strip(),
            "",
        ]
    )
