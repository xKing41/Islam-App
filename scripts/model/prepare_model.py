#!/usr/bin/env python3
"""
Lädt ein Tarteel-Koranmodell (Whisper, Apache-2.0) von Hugging Face und ergänzt fehlende
Tokenizer-Dateien aus dem zugrunde liegenden OpenAI-Whisper-Modell.

    python scripts/model/prepare_model.py tarteel-ai/whisper-base-ar-quran openai/whisper-base hf-base
"""
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
print(sorted(p.name for p in out.iterdir()))
