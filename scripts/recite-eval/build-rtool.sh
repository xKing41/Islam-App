#!/usr/bin/env bash
# Baut das Mess-Werkzeug aus genau dem whisper.cpp, das die App über whisper.rn benutzt.
#   scripts/recite-eval/build-rtool.sh <ausgabe-datei>
set -euo pipefail
OUT=${1:-rtool}
L=node_modules/whisper.rn/cpp
OBJ=$(mktemp -d)
FLAGS="-O3 -march=native -DNDEBUG -D_GNU_SOURCE -DWSP_GGML_USE_CPU -DWSP_GGML_USE_CPU_REPACK -pthread -I$L -I$L/ggml-cpu"
SRC="ggml.c ggml.cpp ggml-alloc.c ggml-backend.cpp ggml-backend-meta.cpp ggml-backend-reg.cpp ggml-backend-dl.cpp
  ggml-cpu/amx/amx.cpp ggml-cpu/amx/mmq.cpp ggml-cpu/ggml-cpu.c ggml-cpu/ggml-cpu.cpp ggml-cpu/quants.c ggml-cpu/traits.cpp
  ggml-cpu/repack.cpp ggml-cpu/unary-ops.cpp ggml-cpu/binary-ops.cpp ggml-cpu/vec.cpp ggml-cpu/ops.cpp ggml-opt.cpp
  ggml-threading.cpp ggml-quants.c gguf.cpp whisper.cpp ggml-cpu/arch/x86/quants.c ggml-cpu/arch/x86/repack.cpp"
pids=()
for f in $SRC; do
  o="$OBJ/$(echo "$f" | tr '/' '_').o"
  case "$f" in
    *.c) gcc -std=c11 $FLAGS -c "$L/$f" -o "$o" & ;;
    *) g++ -std=c++17 $FLAGS -c "$L/$f" -o "$o" & ;;
  esac
  pids+=($!)
done
g++ -std=c++17 $FLAGS -c scripts/recite-eval/rtool.cpp -o "$OBJ/rtool.o" &
pids+=($!)
for p in "${pids[@]}"; do wait "$p"; done
g++ -pthread "$OBJ"/*.o -o "$OUT"
rm -rf "$OBJ"
echo "gebaut: $OUT"
