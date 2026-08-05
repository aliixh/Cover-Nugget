#!/usr/bin/env python3
"""LoRA fine-tune Qwen2.5-0.5B-Instruct on the Cover Nugget dataset (Unsloth).

RUN THIS ON A GPU (free Google Colab T4 is plenty for a 0.5B). It is NOT run
during setup. Reference notebooks: https://github.com/unslothai/notebooks

Pipeline:
  1) python build_dataset.py                # -> dataset/train.jsonl
  2) (on GPU) python train_qwen_lora.py     # -> outputs/ (adapter + GGUF)
  3) ship the GGUF adapter with the app (see training/README.md)

Alternatives to Unsloth, same dataset:
  - Silicon Studio (Apple MLX) — fine-tune locally on your M-series Mac.
  - litgpt — `litgpt finetune_lora` with a JSONL/chat dataset.
"""
import json
from pathlib import Path

MODEL = "unsloth/Qwen2.5-0.5B-Instruct"
DATA = Path(__file__).parent / "dataset" / "train.jsonl"
OUT = Path(__file__).parent / "outputs"
MAX_SEQ = 2048

# --- 1. Load the base model in 4-bit with LoRA adapters -------------------
from unsloth import FastLanguageModel  # noqa: E402
from unsloth.chat_templates import get_chat_template, train_on_responses_only  # noqa: E402
from datasets import load_dataset  # noqa: E402
from trl import SFTTrainer, SFTConfig  # noqa: E402

model, tokenizer = FastLanguageModel.from_pretrained(
    model_name=MODEL,
    max_seq_length=MAX_SEQ,
    load_in_4bit=True,
)
model = FastLanguageModel.get_peft_model(
    model,
    r=16,                    # LoRA rank — 16 is a good default for a 0.5B
    lora_alpha=16,
    lora_dropout=0.0,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    use_gradient_checkpointing="unsloth",
    random_state=42,
)

# --- 2. Format our chat JSONL with the Qwen chat template -----------------
tokenizer = get_chat_template(tokenizer, chat_template="qwen-2.5")

def fmt(row):
    return {"text": tokenizer.apply_chat_template(
        row["messages"], tokenize=False, add_generation_prompt=False)}

ds = load_dataset("json", data_files=str(DATA), split="train").map(fmt)

# --- 3. Train (loss only on the assistant reply, not the prompt) ----------
trainer = SFTTrainer(
    model=model,
    tokenizer=tokenizer,
    train_dataset=ds,
    args=SFTConfig(
        dataset_text_field="text",
        max_seq_length=MAX_SEQ,
        per_device_train_batch_size=2,
        gradient_accumulation_steps=4,
        warmup_steps=5,
        num_train_epochs=3,          # small dataset -> a few epochs
        learning_rate=2e-4,
        logging_steps=1,
        optim="adamw_8bit",
        seed=42,
        output_dir=str(OUT / "checkpoints"),
    ),
)
trainer = train_on_responses_only(
    trainer,
    instruction_part="<|im_start|>user\n",
    response_part="<|im_start|>assistant\n",
)
trainer.train()

# --- 4. Export --------------------------------------------------------------
OUT.mkdir(exist_ok=True)
# (a) the raw LoRA adapter (small; safetensors)
model.save_pretrained(str(OUT / "lora_adapter"))
tokenizer.save_pretrained(str(OUT / "lora_adapter"))

# (b) merged + quantized GGUF the app can ship as its single model file.
#     This is the simplest, most robust path for on-device llama.rn.
model.save_pretrained_gguf(str(OUT / "gguf"), tokenizer, quantization_method="q4_k_m")

print("\nDone.")
print("  LoRA adapter : outputs/lora_adapter/")
print("  Merged GGUF  : outputs/gguf/  (q4_k_m)")
print("\nTo ship a SEPARATE small adapter instead of the merged model, convert the")
print("adapter to GGUF with llama.cpp:")
print("  python llama.cpp/convert_lora_to_gguf.py outputs/lora_adapter --outfile cover-nugget-lora.gguf")
