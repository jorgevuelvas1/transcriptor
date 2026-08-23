"""
Sintesis de voz LOCAL (piper / VITS a traves de sherpa-onnx).

Se usa como respaldo cuando no hay credencial de OpenAI ni de Gemini, o cuando
el entorno no tiene salida de red hacia esas APIs.

Recibe un JSON (por ruta en argv[1], o por stdin):

    {
      "voiceDir": "assets/tts/kokoro-multi-lang-v1_0",
      "sid": 29,
      "speed": 1.0,
      "jobs": [{"id": "s01", "text": "...", "out": "...", "speed": 1.0}]
    }

Admite dos familias de modelo y las distingue por sus archivos:
  - Kokoro  (voices.bin presente): mas natural, multilingue.
  - VITS/piper (solo .onnx + tokens.txt).

y escribe por stdout:

    {"sampleRate": 22050, "results": [{"id": "s01", "duration": 6.71}]}

El modelo se carga UNA sola vez para todos los segmentos.
"""
import json
import os
import sys
import wave


def find_model(voice_dir: str) -> str:
    for name in sorted(os.listdir(voice_dir)):
        if name.endswith(".onnx"):
            return os.path.join(voice_dir, name)
    raise FileNotFoundError(f"No hay modelo .onnx en {voice_dir}")


def write_wav(path: str, samples, sample_rate: int) -> None:
    """Escribe PCM de 16 bits mono, recortando por seguridad."""
    frames = bytearray()
    for value in samples:
        v = int(max(-1.0, min(1.0, float(value))) * 32767)
        frames += int(v).to_bytes(2, "little", signed=True)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with wave.open(path, "wb") as fh:
        fh.setnchannels(1)
        fh.setsampwidth(2)
        fh.setframerate(sample_rate)
        fh.writeframes(bytes(frames))


def main() -> None:
    import sherpa_onnx

    if len(sys.argv) > 1:
        with open(sys.argv[1], encoding="utf-8") as fh:
            payload = json.load(fh)
    else:
        payload = json.load(sys.stdin)
    voice_dir = payload["voiceDir"]
    speed = float(payload.get("speed", 1.0))

    sid = int(payload.get("sid", 0))
    voices_bin = os.path.join(voice_dir, "voices.bin")
    threads = max(1, (os.cpu_count() or 2))

    if os.path.exists(voices_bin):
        # --- Kokoro ---
        lexicons = [
            os.path.join(voice_dir, name)
            for name in ("lexicon-us-en.txt", "lexicon-zh.txt")
            if os.path.exists(os.path.join(voice_dir, name))
        ]
        dict_dir = os.path.join(voice_dir, "dict")
        model_config = sherpa_onnx.OfflineTtsModelConfig(
            kokoro=sherpa_onnx.OfflineTtsKokoroModelConfig(
                model=os.path.join(voice_dir, "model.onnx"),
                voices=voices_bin,
                tokens=os.path.join(voice_dir, "tokens.txt"),
                data_dir=os.path.join(voice_dir, "espeak-ng-data"),
                dict_dir=dict_dir if os.path.isdir(dict_dir) else "",
                lexicon=",".join(lexicons),
            ),
            num_threads=threads,
            provider="cpu",
        )
    else:
        # --- VITS / piper ---
        model_config = sherpa_onnx.OfflineTtsModelConfig(
            vits=sherpa_onnx.OfflineTtsVitsModelConfig(
                model=find_model(voice_dir),
                tokens=os.path.join(voice_dir, "tokens.txt"),
                data_dir=os.path.join(voice_dir, "espeak-ng-data"),
            ),
            num_threads=threads,
            provider="cpu",
        )

    config = sherpa_onnx.OfflineTtsConfig(
        model=model_config,
        # Una frase por vez: asi las pausas internas las controla el montaje,
        # no el sintetizador.
        max_num_sentences=1,
    )
    tts = sherpa_onnx.OfflineTts(config)

    results = []
    sample_rate = 22050
    for job in payload["jobs"]:
        # `speed` por segmento: permite que el giro y el cierre vayan algo mas
        # lentos, como pide la direccion de voz.
        job_speed = float(job.get("speed", 1.0)) * speed
        audio = tts.generate(job["text"], sid=sid, speed=job_speed)
        sample_rate = audio.sample_rate
        write_wav(job["out"], audio.samples, sample_rate)
        results.append(
            {"id": job["id"], "duration": len(audio.samples) / sample_rate}
        )

    json.dump({"sampleRate": sample_rate, "results": results}, sys.stdout)


if __name__ == "__main__":
    main()
