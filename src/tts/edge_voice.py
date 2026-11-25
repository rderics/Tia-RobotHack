"""Tia's voice: Microsoft neural voices through edge-tts (github.com/rany2/edge-tts).

Reads one JSON object from stdin {"text": "...", "voice": "en-US-AvaNeural", "rate": "+0%"} and prints one JSON
object: {"audio": <base64 mp3>, "mime": "audio/mpeg", "words": [...], "wtimes": [ms...], "wdurations": [ms...]}.
The word timings let the avatar move her lips in step with the words.

Note: edge-tts uses the online read-aloud service of Microsoft Edge (not an official API) – fast and natural,
but it can change without notice. Kokoro (local) is the backup.
"""
import asyncio
import base64
import json
import sys

import edge_tts


async def speak(text, voice, rate):
    com = edge_tts.Communicate(text, voice, rate=rate, boundary="WordBoundary")
    audio = bytearray()
    words, wtimes, wdurations = [], [], []
    async for chunk in com.stream():
        if chunk["type"] == "audio":
            audio.extend(chunk["data"])
        elif chunk["type"] == "WordBoundary":
            words.append(chunk["text"])
            wtimes.append(round(chunk["offset"] / 10000))  # 100-ns ticks -> ms
            wdurations.append(round(chunk["duration"] / 10000))
    return {
        "audio": base64.b64encode(bytes(audio)).decode("ascii"),
        "mime": "audio/mpeg",
        "words": words,
        "wtimes": wtimes,
        "wdurations": wdurations,
    }


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    try:
        req = json.loads(sys.stdin.read() or "{}")
        text = str(req.get("text", "")).strip()[:1500]
        if not text:
            raise ValueError("no text")
        out = asyncio.run(speak(text, req.get("voice") or "en-US-AvaNeural", req.get("rate") or "+0%"))
        print(json.dumps(out))
    except Exception as e:  # network down, service changed, ...
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
