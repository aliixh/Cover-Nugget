#!/usr/bin/env python3
"""Benchmark: polish the 4 held-out skeletons with base vs LoRA, for both models.
Writes training/bench_results.json for presentation."""
import json, os, re, torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel

HERE = os.path.dirname(os.path.abspath(__file__))
EVAL = [json.loads(l) for l in open(os.path.join(HERE, "dataset", "eval_polish.jsonl"))]
SEED = json.load(open(os.path.join(HERE, "dataset", "seed.json")))

MODELS = [
    ("qwen05b", "Qwen/Qwen2.5-0.5B-Instruct", os.path.join(HERE, "adapters/qwen05b")),
    ("llama1b", "unsloth/Llama-3.2-1B-Instruct", os.path.join(HERE, "adapters/llama1b")),
]


def company_of(skeleton):
    m = re.search(r"(?:at|with|join(?:ing)?) ([A-Z][A-Za-z0-9 &.\-]+?)(?:[\.\,\n]| immediately| caught| stood)", skeleton)
    return m.group(1).strip() if m else "?"


def match_seed(company):
    for s in SEED:
        c = s["job"].get("company", "")
        if c and (c.lower() in company.lower() or company.lower() in c.lower()):
            return s
    return None


def gen(model, tok, messages, n=420):
    prompt = tok.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    ids = tok(prompt, return_tensors="pt").to(model.device)
    with torch.no_grad():
        out = model.generate(**ids, max_new_tokens=n, do_sample=False,
                             pad_token_id=tok.pad_token_id or tok.eos_token_id)
    return tok.decode(out[0][ids["input_ids"].shape[1]:], skip_special_tokens=True).strip()


results = []
for i, e in enumerate(EVAL):
    results.append({"idx": i, "company": company_of(e["messages"][1]["content"]),
                    "prompt_msgs": e["messages"][:-1], "gold": e["messages"][-1]["content"]})

for tag, base_id, adapter in MODELS:
    print(f"[gen] {tag} base...")
    tok = AutoTokenizer.from_pretrained(base_id)
    if tok.pad_token is None:
        tok.pad_token = tok.eos_token
    base = AutoModelForCausalLM.from_pretrained(base_id, dtype=torch.bfloat16, device_map="cuda")
    for r in results:
        r[tag + "_base"] = gen(base, tok, r["prompt_msgs"])
    print(f"[gen] {tag} + LoRA...")
    tuned = PeftModel.from_pretrained(base, adapter)
    for r in results:
        r[tag + "_lora"] = gen(tuned, tok, r["prompt_msgs"])
    del base, tuned
    torch.cuda.empty_cache()

# attach readable profile+JD
for r in results:
    s = match_seed(r["company"])
    if s:
        r["profile"] = s["profile"]
        r["job"] = s["job"]

for r in results:
    r.pop("prompt_msgs", None)
json.dump(results, open(os.path.join(HERE, "bench_results.json"), "w"), indent=2)
print("wrote bench_results.json for", len(results), "held-out examples")
