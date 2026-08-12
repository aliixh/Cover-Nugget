import json,os,re,torch
from transformers import AutoModelForCausalLM, AutoTokenizer
from peft import PeftModel
HERE="training"
EVAL=[json.loads(l) for l in open(os.path.join(HERE,"dataset","eval_polish.jsonl"))]
SEED=json.load(open(os.path.join(HERE,"dataset","seed.json")))
base_id="unsloth/Llama-3.2-1B-Instruct"; adapter=os.path.join(HERE,"adapters/llama1b_v3")
def company_of(sk):
    m=re.search(r"(?:at|with|join(?:ing)?) ([A-Z][A-Za-z0-9 &.\-]+?)(?:[\.\,\n]| immediately| caught| stood)",sk)
    return m.group(1).strip() if m else "?"
def match(c):
    for s in SEED:
        cc=s["job"].get("company","")
        if cc and (cc.lower() in c.lower() or c.lower() in cc.lower()): return s
    return None
tok=AutoTokenizer.from_pretrained(base_id)
if tok.pad_token is None: tok.pad_token=tok.eos_token
base=AutoModelForCausalLM.from_pretrained(base_id,dtype=torch.bfloat16,device_map="cuda")
model=PeftModel.from_pretrained(base,adapter)
def gen(msgs):
    p=tok.apply_chat_template(msgs,tokenize=False,add_generation_prompt=True)
    ids=tok(p,return_tensors="pt").to(model.device)
    with torch.no_grad():
        o=model.generate(**ids,max_new_tokens=420,do_sample=False,pad_token_id=tok.pad_token_id)
    return tok.decode(o[0][ids["input_ids"].shape[1]:],skip_special_tokens=True).strip()
res=[]
for e in EVAL:
    c=company_of(e["messages"][1]["content"]); s=match(c) or {}
    res.append({"company":c,"job":s.get("job",{}),"profile":s.get("profile",{}),"llama1b_v3":gen(e["messages"][:-1])})
json.dump(res,open(os.path.join(HERE,"bench_results_v3.json"),"w"),indent=2)
print("wrote bench_results_v3.json")
