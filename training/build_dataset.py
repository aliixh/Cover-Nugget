#!/usr/bin/env python3
"""Build the Cover Nugget fine-tuning dataset.

Reads structured examples from dataset/seed.json and renders each into the SAME
prompt the app sends the model (see src/ai/prompt.ts -> buildGeneratePrompt,
body-only), paired with the gold body paragraphs. Output is chat-format JSONL
that Unsloth, MLX-LM (Silicon Studio), and litgpt can all consume.

  # just convert the seed set:
  python build_dataset.py

  # also synthesize N more examples with a strong model (needs an API key; CPU
  # only, no GPU) to scale toward a few hundred:
  ANTHROPIC_API_KEY=sk-... python build_dataset.py --synth 200

Output: dataset/train.jsonl  (one {"messages":[...]} object per line)

NOTE: keep this prompt logic in sync with src/ai/prompt.ts so the model is
fine-tuned on exactly what it sees at inference time.
"""
import argparse
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).parent
SEED = HERE / "dataset" / "seed.json"
OUT = HERE / "dataset" / "train.jsonl"

# MUST match SYSTEM in src/native/registerNative.native.ts so the model sees the
# same framing at inference as during fine-tuning.
SYSTEM = (
    "You are a precise writing assistant for professional cover letters. Follow "
    "the instructions exactly and return only what is asked."
)

STOPWORDS = set(
    (
        "a an and are as at be by for from has have i in is it its of on or that the to "
        "with you your we our us they their this these those will would can could should "
        "experience experiences work working works role roles position positions job jobs "
        "team teams company companies ability able strong years year including etc plus "
        "candidate candidates applicant looking seeking join responsibilities requirements "
        "qualifications preferred required must skills skill knowledge understanding good "
        "great excellent proven demonstrated ideal opportunity opportunities help support "
        "using use used within well new like across day days month months please apply "
        "application applications benefits salary range full time part remote"
    ).split()
)
SHORT_TECH = {"ai", "ml", "js", "go", "ux", "ui", "qa", "hr", "bi", "c#", "c++", "r", "3d"}


def norm(w):
    return re.sub(r"[^a-z0-9+#]", "", w.lower())


def keywords(text):
    out = set()
    for raw in re.split(r"[^A-Za-z0-9+#]+", text or ""):
        w = norm(raw)
        if not w or w in STOPWORDS:
            continue
        if len(w) < 3 and w not in SHORT_TECH:
            continue
        out.add(w)
    return out


def match_profile_to_job(profile, job_desc):
    job_lower = (job_desc or "").lower()
    job_kw = keywords(job_desc)

    def freq(k):
        return len(re.findall(r"\b" + re.escape(k), job_lower))

    skills = [s.strip() for s in profile.get("skills", []) if len(s.strip()) > 1]
    matched = [
        s for s in skills
        if s.lower() in job_lower or any(norm(t) in job_kw for t in s.lower().split())
    ]
    matched.sort(key=lambda s: -freq(s.lower()))

    profile_text = " ".join(
        [f"{e.get('role','')} {e.get('description','')}" for e in profile.get("experience", [])]
        + [f"{p.get('name','')} {p.get('technologies','')}" for p in profile.get("projects", [])]
        + [f"{e.get('degree','')} {e.get('major','')}" for e in profile.get("education", [])]
    )
    prof_kw = keywords(profile_text)
    skill_lower = {s.lower() for s in matched}
    extra = sorted([k for k in prof_kw if k in job_kw and k not in skill_lower], key=lambda k: -freq(k))[:12]
    return matched, extra


def profile_summary(p):
    parts = [f"Name: {p['name']}"]
    if p.get("location"):
        parts.append(f"Location: {p['location']}")
    if p.get("education"):
        parts.append("Education:\n" + "\n".join(
            f"  - {', '.join(x for x in [e.get('degree'), e.get('school'), e.get('graduationYear') or e.get('year')] if x)}"
            for e in p["education"]))
    if p.get("experience"):
        parts.append("Experience:\n" + "\n".join(
            f"  - {', '.join(x for x in [e.get('role'), e.get('company')] if x)}"
            + (f": {e['description']}" if e.get('description') else "")
            for e in p["experience"]))
    if p.get("projects"):
        parts.append("Projects:\n" + "\n".join(
            f"  - {pr['name']}" + (f" [{pr['technologies']}]" if pr.get('technologies') else "")
            for pr in p["projects"]))
    if p.get("skills"):
        parts.append("Skills: " + ", ".join(p["skills"]))
    return "\n".join(parts)


def build_prompt(example):
    """Mirror of buildGeneratePrompt (body-only) in src/ai/prompt.ts."""
    p, job = example["profile"], example["job"]
    matched, extra = match_profile_to_job(p, job.get("description", ""))
    terms = (matched + extra)[:12]
    lines = [
        "You write the BODY paragraphs of a professional cover letter. The greeting,",
        "header, date, and sign-off are added separately - do not write them.",
        "Use only the candidate's experience and skills that are RELEVANT to this",
        "specific role; do not add unrelated skills or filler.",
        "",
        "Write 2-3 short paragraphs, separated by a blank line:",
        "1. Why the candidate is a strong fit for THIS role at THIS company.",
        "2. One or two concrete skills/experiences that match the job description.",
        "3. A brief, confident closing that thanks them and invites a conversation.",
        "",
        "Candidate profile:",
        profile_summary(p),
        "",
        "Job details:",
    ]
    if job.get("company"):
        lines.append(f"Company: {job['company']}")
    if job.get("role"):
        lines.append(f"Role: {job['role']}")
    lines.append(f"Description:\n{job.get('description','')}")
    if terms:
        lines.append(f"\nThese profile terms match this job - center the letter on them: {', '.join(terms)}.")
    lines.append("\nReturn only the body paragraphs - no greeting, no sign-off.")
    return "\n".join(lines)


def to_record(example):
    return {
        "messages": [
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": build_prompt(example)},
            {"role": "assistant", "content": example["letter_body"].strip()},
        ]
    }


def synthesize(seed, n):
    """Generate N more examples with a strong model, using the seed as style
    reference. CPU only (API calls). Requires ANTHROPIC_API_KEY + `anthropic`."""
    try:
        import anthropic
    except ImportError:
        sys.exit("pip install anthropic  (and set ANTHROPIC_API_KEY) to use --synth")
    client = anthropic.Anthropic()
    made = []
    style = json.dumps(seed[:3], indent=2)
    for i in range(n):
        msg = client.messages.create(
            model="claude-sonnet-5",
            max_tokens=1200,
            messages=[{
                "role": "user",
                "content": (
                    "Invent ONE realistic, diverse cover-letter training example as JSON with keys "
                    "profile{name,location,skills[],experience[{role,company,description}],education[{degree,school,year}]}, "
                    "job{company,role,description}, and letter_body (2-3 short body paragraphs, no greeting or sign-off, "
                    "grounded strictly in the profile and job). Vary the industry and seniority. Return ONLY the JSON.\n\n"
                    f"Style reference:\n{style}"
                ),
            }],
        )
        text = msg.content[0].text.strip()
        text = re.sub(r"^```json|^```|```$", "", text, flags=re.M).strip()
        try:
            made.append(json.loads(text))
            print(f"  synth {i+1}/{n}", file=sys.stderr)
        except json.JSONDecodeError:
            print(f"  skipped malformed example {i+1}", file=sys.stderr)
    return made


def _strip_letter_body(text):
    """Drop the greeting and sign-off from a full letter, keeping the body."""
    lines = [l for l in (text or "").splitlines()]
    body = []
    for l in lines:
        s = l.strip()
        if re.match(r"^(dear|to whom|hello|hi|greetings)\b", s, re.I):
            continue
        if re.match(r"^(sincerely|best regards|regards|thank you|yours|warm)\b", s, re.I):
            break
        body.append(l)
    return "\n".join(body).strip()


def _parse_role_company(text):
    m = re.match(r"^(.*?)\s+at\s+(.*?)(?:\s+for\s+.*)?$", (text or "").strip(), re.I)
    return (m.group(1).strip(), m.group(2).strip()) if m else ((text or "").strip(), "")


def load_shashivish():
    """Map ShashiVish/cover-letter-dataset rows into our example format (CPU;
    needs `pip install datasets`)."""
    try:
        from datasets import load_dataset
    except ImportError:
        sys.exit("pip install datasets  to use --hf")
    ds = load_dataset("ShashiVish/cover-letter-dataset", split="train")
    out = []
    for row in ds:
        # None-safe: some cells are null, so coerce every field to a string.
        g = {k.lower().strip(): (v or "") for k, v in row.items()}
        cur = g.get("current working experience", "")
        past = g.get("past working experience", "")
        exp = []
        if cur:
            r, c = _parse_role_company(cur); exp.append({"role": r, "company": c, "isCurrent": True, "description": cur})
        if past:
            r, c = _parse_role_company(past); exp.append({"role": r, "company": c, "description": past})
        body = _strip_letter_body(g.get("cover letter", ""))
        if not body:
            continue
        out.append({
            "profile": {
                "name": g.get("applicant name") or "Applicant",
                # NOTE: the skills column is "Skillsets", not "Skills".
                "skills": [s.strip() for s in re.split(r"[,;]", g.get("skillsets", "")) if s.strip()],
                "experience": exp,
                "education": [{"degree": g.get("qualifications", "")}] if g.get("qualifications") else [],
            },
            "job": {
                "company": g.get("hiring company", ""),
                "role": g.get("job title", ""),
                "description": " ".join(x for x in [g.get("preferred qualifications", ""), g.get("qualifications", "")] if x),
            },
            "letter_body": body,
        })
    print(f"  loaded {len(out)} rows from ShashiVish/cover-letter-dataset", file=sys.stderr)
    print("  WARNING: these letters use generic AI-cliche openers; prefer them as", file=sys.stderr)
    print("           field variety, not as gold targets.", file=sys.stderr)
    return out


def load_cultural():
    """akhan02/cultural-dimension-cover-letters has NO structured fields — only
    13 tone-variant letters per row. It appears derived from ShashiVish, so we
    align by index to borrow ShashiVish's profile/job, and verify by checking the
    company/role actually appear in the base letter before trusting a row."""
    try:
        from datasets import load_dataset
    except ImportError:
        sys.exit("pip install datasets  to use --hf2")
    base = load_shashivish()  # structured triples (already field-mapped)
    cul = load_dataset("akhan02/cultural-dimension-cover-letters", split="train")
    out = []
    for i, row in enumerate(cul):
        if i >= len(base):
            break
        ref = base[i]
        company = (ref["job"]["company"] or "").split()[0] if ref["job"]["company"] else ""
        letters = [v for k, v in row.items() if isinstance(v, str) and len(v) > 120]
        # verify alignment: the base company should appear in these letters
        if company and not any(company.lower() in l.lower() for l in letters):
            continue
        for v in letters:
            body = _strip_letter_body(v)
            if body:
                out.append({"profile": ref["profile"], "job": ref["job"], "letter_body": body})
    print(f"  built {len(out)} tone-variant examples from akhan02 (index-aligned to ShashiVish)", file=sys.stderr)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--synth", type=int, default=0, help="synthesize N extra examples via API")
    ap.add_argument("--hf", action="store_true", help="also include ShashiVish/cover-letter-dataset")
    ap.add_argument("--hf2", action="store_true", help="also include akhan02/cultural-dimension-cover-letters")
    args = ap.parse_args()

    seed = json.loads(SEED.read_text())
    examples = list(seed)
    if args.hf:
        examples += load_shashivish()
    if args.hf2:
        examples += load_cultural()
    if args.synth:
        examples += synthesize(seed, args.synth)

    with OUT.open("w") as f:
        for ex in examples:
            f.write(json.dumps(to_record(ex)) + "\n")
    print(f"Wrote {len(examples)} examples -> {OUT}")


if __name__ == "__main__":
    main()
