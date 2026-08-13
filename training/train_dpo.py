#!/usr/bin/env python3
"""DPO on top of the v4 SFT model to prefer number-faithful letters.

Preference pairs: chosen = the gold letter, rejected = the same letter with its
metrics drifted (dataset/dpo_pairs.jsonl). Teaches the model to keep numbers
exact under sampling, targeting the ~25% numeric-drift fallbacks the eval found.
"""
import json, os, torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig
from trl import DPOTrainer, DPOConfig

HERE = os.path.dirname(os.path.abspath(__file__))
BASE = os.path.join(HERE, "merged", "llama1b_v4_merged")  # v4 SFT weights
OUT = os.path.join(HERE, "adapters", "llama1b_v4_dpo")

tok = AutoTokenizer.from_pretrained(BASE)
if tok.pad_token is None:
    tok.pad_token = tok.eos_token
model = AutoModelForCausalLM.from_pretrained(BASE, dtype=torch.bfloat16, device_map="cuda")

rows = [json.loads(l) for l in open(os.path.join(HERE, "dataset", "dpo_pairs.jsonl"))]
ds = Dataset.from_list(rows)

peft_cfg = LoraConfig(
    r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
)

cfg = DPOConfig(
    output_dir=OUT,
    beta=0.1,
    learning_rate=5e-6,
    num_train_epochs=3,
    per_device_train_batch_size=1,
    gradient_accumulation_steps=4,
    lr_scheduler_type="cosine",
    warmup_ratio=0.1,
    logging_steps=5,
    save_strategy="no",
    bf16=True,
    max_length=1024,
    report_to=[],
)

trainer = DPOTrainer(model=model, ref_model=None, args=cfg, train_dataset=ds,
                     processing_class=tok, peft_config=peft_cfg)
trainer.train()
trainer.save_model(OUT)
print("[dpo] saved ->", OUT)
