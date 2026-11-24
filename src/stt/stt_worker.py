"""Speech-to-text for Tia, fully on this computer (faster-whisper, no cloud).

Started once by src/stt.js and kept running so the model loads only once.
Protocol: one JSON line in  {"id": "...", "path": "C:/.../clip.m4a"}
          one JSON line out {"id": "...", "text": "...", "ms": 1234}  or  {"id": "...", "error": "..."}
The first line printed is {"ready": true, "model": "..."} once the model is loaded.
"""
import json
import subprocess
import sys
import time

import numpy as np

MODEL = sys.argv[1] if len(sys.argv) > 1 else "base.en"


def out(obj):
    sys.stdout.write(json.dumps(obj, ensure_ascii=False) + "\n")
    sys.stdout.flush()


try:
    from faster_whisper import WhisperModel

    import os

    model = WhisperModel(MODEL, device="cpu", compute_type="int8", cpu_threads=os.cpu_count() or 4)
except Exception as e:  # missing package or model download failed
    out({"ready": False, "error": str(e)})
    sys.exit(1)

out({"ready": True, "model": MODEL})

# Words the demo business uses a lot – helps the model spell names right.
HINT = "Tia, Liepa Interjers, Mārtiņš, Ieva Bērziņa, Anna Kalniņa, Laura Vītola, Kaspars, Elīna, quartz worktop, oak worktop, kitchen offer."

def load_audio(path):
    """Decode any audio file (m4a, webm, wav) to 16 kHz mono with ffmpeg (avoids PyAV version problems)."""
    raw = subprocess.run(
        ["ffmpeg", "-nostdin", "-v", "error", "-i", path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
        capture_output=True, check=True,
        creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
    ).stdout
    return np.frombuffer(raw, np.int16).astype(np.float32) / 32768.0


for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    job = {}
    try:
        job = json.loads(line)
        t0 = time.time()
        segments, _info = model.transcribe(
            load_audio(job["path"]), language="en", beam_size=1, vad_filter=True, without_timestamps=True, initial_prompt=HINT
        )
        text = " ".join(s.text.strip() for s in segments).strip()
        out({"id": job.get("id"), "text": text, "ms": int((time.time() - t0) * 1000)})
    except Exception as e:
        out({"id": job.get("id"), "error": str(e)})
