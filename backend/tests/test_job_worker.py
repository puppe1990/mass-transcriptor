from app.services.markdown import render_transcript_markdown


def test_render_transcript_markdown_has_heading():
    output = render_transcript_markdown("hello world", "sample.wav", "whisper")
    assert output.startswith("# Transcript")
