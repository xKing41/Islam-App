#!/usr/bin/env python3
"""
Lädt ein Tarteel-Koranmodell (Whisper, Apache-2.0) von Hugging Face und ergänzt fehlende
Tokenizer-Dateien aus dem zugrunde liegenden OpenAI-Whisper-Modell.

    python scripts/model/prepare_model.py tarteel-ai/whisper-base-ar-quran openai/whisper-base hf-base
"""
import json
import shutil
import sys
from pathlib import Path

from huggingface_hub import snapshot_download

repo, base_repo, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
snapshot_download(repo_id=repo, local_dir=out)
needed = ["vocab.json", "added_tokens.json", "merges.txt", "normalizer.json", "tokenizer_config.json", "special_tokens_map.json"]
missing = [f for f in needed if not (out / f).exists()]
if missing:
    print("Ergänze Tokenizer-Dateien aus", base_repo, ":", missing)
    tmp = Path(str(out) + "-base")
    snapshot_download(repo_id=base_repo, local_dir=tmp, allow_patterns=missing)
    for f in missing:
        if (tmp / f).exists():
            shutil.copy(tmp / f, out / f)
# whisper.cpp übernimmt "max_length" als Textkontext-Länge. Manche Feinabstimmungen speichern dort
# einen Generierungswert (z. B. 1024) statt der echten Positionsanzahl (448) -> Modell nicht ladbar.
cfg_path = out / "config.json"
cfg = json.loads(cfg_path.read_text(encoding="utf-8"))
if cfg.get("max_length") != cfg.get("max_target_positions"):
    print("Korrigiere max_length", cfg.get("max_length"), "->", cfg.get("max_target_positions"))
    cfg["max_length"] = cfg.get("max_target_positions", 448)
    cfg_path.write_text(json.dumps(cfg, indent=2), encoding="utf-8")
print(sorted(p.name for p in out.iterdir()))
