#!/usr/bin/env bash
# Descarga la voz neuronal local de respaldo (piper/VITS via sherpa-onnx).
#
# Solo hace falta si no hay OPENAI_API_KEY ni GEMINI_API_KEY, o si el entorno
# no tiene salida de red hacia esas APIs.
#
#   pip install sherpa-onnx
#   bash scripts/fetchLocalVoice.sh
set -euo pipefail

VOICE="vits-piper-es_MX-ald-medium"   # masculina, español de México
BASE="https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models"
DIR="$(cd "$(dirname "$0")/.." && pwd)/assets/tts"

mkdir -p "$DIR"
cd "$DIR"

if [ -d "$VOICE" ]; then
  echo "La voz $VOICE ya está descargada."
  exit 0
fi

echo "Descargando $VOICE..."
curl -fsSL -o "$VOICE.tar.bz2" "$BASE/$VOICE.tar.bz2"
tar xjf "$VOICE.tar.bz2"
rm -f "$VOICE.tar.bz2"
echo "Listo: $DIR/$VOICE"
