# Fine-tuning Cover Nugget's on-device model

Goal: teach the small on-device model (Qwen2.5-0.5B-Instruct) the **voice and
structure of good cover letters** with a LoRA, so drafts read less generic. The
app already owns layout and does profile↔job keyword matching — the LoRA only
improves **phrasing/tone**, not reasoning.

Everything here is **GPU-free to prepare**. Only step 2 (training) needs a GPU,
and it is run by *you*, later.

## Pipeline

```
seed.json ──(build_dataset.py, CPU)──> dataset/train.jsonl
          ──(train_qwen_lora.py, GPU)──> outputs/  (LoRA adapter + merged GGUF)
          ──(host on Hugging Face)────> point MODEL.adapter at it in the app
```

### 1. Build the dataset (CPU, no GPU)
```bash
cd training
python build_dataset.py                       # converts the 8 seed examples
# optional: scale up with a strong model (needs an API key, still CPU):
ANTHROPIC_API_KEY=sk-... python build_dataset.py --synth 300
```
- `dataset/seed.json` — hand-written *(profile + job → gold body paragraphs)*
  examples across industries. Add your own here for the biggest quality gains.
- Output `dataset/train.jsonl` is chat-format and, crucially, renders each
  example into **the exact prompt the app sends at inference**
  (`build_prompt` mirrors `src/ai/prompt.ts`). Keep them in sync.
- Aim for **~50–250** high-quality examples before training (not thousands).

### 1b. (Recommended) Polish pairs — matches how the app runs
The app doesn't generate from scratch; it builds a library **skeleton** and asks
the model to **polish** it. Train on that exact task:
```bash
npx tsx make_polish_data.ts        # -> dataset/train_polish.jsonl
```
Each row is `skeleton (real prompt the app sends) → gold polished letter`, built
from the same profile+job fields, so the LoRA trains on precisely what it sees
live. Train on `train_polish.jsonl` instead of `train.jsonl` for Option A —
`train_qwen_lora.py` already points there.

The script also splits off a small, field-diverse **held-out** set to
`dataset/eval_polish.jsonl` (roles the model never trains on) so you can judge
generalization after training. Current split: 24 gold seeds → 20 train / 4 eval.

### 2. Train the LoRA (GPU — run later, e.g. free Colab T4)
Three interchangeable options, all consuming `dataset/train.jsonl`:
- **Unsloth** (recommended, free Colab): `python train_qwen_lora.py`
  (notebooks: https://github.com/unslothai/notebooks)
- **Silicon Studio** (Apple MLX, local on your M-series Mac — no cloud GPU):
  import `dataset/train.jsonl`, pick Qwen2.5-0.5B, LoRA, train. Then convert the
  MLX/HF adapter to GGUF (below).
- **litgpt**: `litgpt finetune_lora Qwen2.5-0.5B-Instruct --data JSON ...`

Outputs: a LoRA adapter and (via Unsloth) a merged **q4_k_m GGUF**.

### 3. Get it into the app — two ways
- **Merged model (simplest, most robust on-device):** replace `MODEL.url` in
  `src/ai/modelConfig.ts` with your merged GGUF. Users download one ~469 MB file
  as before; nothing else changes.
- **Separate adapter (small, swappable ~5–30 MB):** convert the adapter to GGUF
  ```bash
  python llama.cpp/convert_lora_to_gguf.py outputs/lora_adapter --outfile cover-nugget-lora.gguf
  ```
  host it, and set `MODEL.adapter` in `src/ai/modelConfig.ts`. The app already
  downloads it next to the base model and applies it on load
  (`getDownloadedAdapterPath` → `initLlama({ lora })`).

## Important alignment notes
- The app feeds the model through its **chat template** with a fixed **SYSTEM**
  message (`src/native/registerNative.native.ts`). `build_dataset.py` uses the
  **same** SYSTEM and the **same** user prompt. If you change one, change both —
  otherwise the LoRA is trained on a different distribution than it sees live.
- You can only **evaluate** any of this in a **dev/prod build** — the model does
  not run in Expo Go. So: build the dev client, download the base model, judge
  the baseline output first, *then* decide if the LoRA is worth it.
- A 0.5B ceiling is real: expect nicer prose and consistency, not GPT-4.

## Export to GGUF (ship the fine-tuned model)

The app loads a single GGUF; we merge the LoRA into the base and quantize.

```bash
# 1) merge LoRA -> full HF model (transformers + peft)
python3 - <<'PY'
import torch; from transformers import AutoModelForCausalLM, AutoTokenizer; from peft import PeftModel
base="unsloth/Llama-3.2-1B-Instruct"; adp="training/adapters/llama1b_v3"; out="training/merged/llama1b_v3_merged"
tok=AutoTokenizer.from_pretrained(base); m=AutoModelForCausalLM.from_pretrained(base,dtype=torch.float16)
PeftModel.from_pretrained(m,adp).merge_and_unload().save_pretrained(out,safe_serialization=True); tok.save_pretrained(out)
PY

# 2) HF -> GGUF F16  (needs llama.cpp source + `pip install gguf`)
python3 ~/llamacpp-src/convert_hf_to_gguf.py training/merged/llama1b_v3_merged \
  --outfile cn-llama1b-f16.gguf --outtype f16

# 3) quantize -> Q4_K_M (~770 MB)  (prebuilt llama-quantize)
llama-quantize cn-llama1b-f16.gguf cn-llama1b-q4_k_m.gguf Q4_K_M
```

Then **host `cn-llama1b-q4_k_m.gguf`** (HF/R2/etc.) and set `MODEL.url` in
`src/ai/modelConfig.ts`. Sanity-check locally with `llama-cli -m ... -f prompt.txt`.

The runtime **fact guard** (`src/ai/factGuard.ts`) backs this up: if the model
drops/invents a number, the app keeps the deterministic skeleton.

## Files
- `dataset/seed.json` — 50 structured gold examples (edit / add here).
- `make_polish_data.ts` — renders seed → `dataset/train_polish.jsonl` (+ held-out `eval_polish.jsonl`).
- `build_dataset.py` — legacy from-scratch dataset (dormant; `--hf`/`--hf2` loaders).
- `train_lora.py` — HF/peft/trl LoRA trainer for any base (Qwen2.5-0.5B, Llama-3.2-1B).
- `generate_bench.py` — base-vs-LoRA generation on the held-out set.
- `requirements.txt` — CPU deps (synth); training deps install on the GPU box.

## Evaluation harness

Objective quality tracking across model versions (see `dataset/eval_profiles.json`,
16 diverse profiles: current/past roles, thin/rich, number-heavy, tool-tempting).

1. Build cases -> `/tmp/eval_cases.json` (already saved as `dataset/eval_profiles.json`).
2. Generate: run each case's `messages` through the model (GPU) with production
   sampling (temp 0.6, top_p 0.9, top_k 40, rep 1.12) -> `/tmp/eval_polished.json`.
3. Score: `npx tsx training/eval_score.ts` -> model-polish rate, guard-fallback
   breakdown (numbers/status/tool), dash/cliche counts, opener uniqueness.

v4 @ temp 0.6: **75% model-polish, 100% factual (guard-backed), 0 dashes, 16/16 unique openers.**
A temperature sweep (0.3-0.6) confirmed 0.6 is optimal; the residual ~25% is numeric
drift, addressable only by DPO/targeted training (not temperature).
