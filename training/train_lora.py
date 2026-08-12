#!/usr/bin/env python3
"""Fine-tune a LoRA for the Cover Nugget *polish* step (Option A).

Trains on skeleton->gold polish pairs (dataset/train_polish.jsonl) so the
adapter aligns with the app's real runtime task. Works for any small instruct
base; we run it for both Qwen2.5-0.5B-Instruct and Llama-3.2-1B-Instruct.

  python train_lora.py --base Qwen/Qwen2.5-0.5B-Instruct --out adapters/qwen05b
  python train_lora.py --base unsloth/Llama-3.2-1B-Instruct --out adapters/llama1b

Data is {"messages":[system,user,assistant]} per line. We reshape to a
prompt/completion dataset so trl masks the (long) JD prompt and computes loss
only on the assistant's polished letter.
"""
import argparse, json, os
import torch
from datasets import Dataset
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import LoraConfig
from trl import SFTTrainer, SFTConfig

HERE = os.path.dirname(os.path.abspath(__file__))


def load(path):
    rows = [json.loads(l) for l in open(os.path.join(HERE, "dataset", path))]
    data = [{"prompt": r["messages"][:-1], "completion": [r["messages"][-1]]} for r in rows]
    return Dataset.from_list(data)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--train", default="train_polish.jsonl")
    ap.add_argument("--epochs", type=float, default=12)
    ap.add_argument("--lr", type=float, default=2e-4)
    a = ap.parse_args()

    out = a.out if os.path.isabs(a.out) else os.path.join(HERE, a.out)
    print(f"[train] base={a.base}  ->  {out}")

    tok = AutoTokenizer.from_pretrained(a.base)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    model = AutoModelForCausalLM.from_pretrained(a.base, dtype=torch.bfloat16, device_map="cuda")

    peft_cfg = LoraConfig(
        r=16, lora_alpha=32, lora_dropout=0.05, bias="none", task_type="CAUSAL_LM",
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    )

    cfg = SFTConfig(
        output_dir=out,
        num_train_epochs=a.epochs,
        per_device_train_batch_size=1,
        gradient_accumulation_steps=2,
        learning_rate=a.lr,
        lr_scheduler_type="cosine",
        warmup_ratio=0.05,
        logging_steps=2,
        save_strategy="no",
        eval_strategy="no",
        bf16=True,
        max_length=1280,
        packing=False,
        completion_only_loss=True,
        report_to=[],
    )

    trainer = SFTTrainer(model=model, args=cfg, train_dataset=load(a.train), processing_class=tok, peft_config=peft_cfg)
    trainer.train()
    trainer.save_model(out)
    tok.save_pretrained(out)
    print(f"[train] done -> {out}")


if __name__ == "__main__":
    main()
