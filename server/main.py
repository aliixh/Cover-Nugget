# Cover Nugget job-fetch backend.
#
# Runs on YOUR server (e.g. an Oracle Always-Free VM). The app only calls this
# for the OPTIONAL job-link/search lookup — everything else stays on the phone.
#
# Endpoints:
#   GET /health                      -> {"ok": true}
#   GET /fetch?url=...               -> {"text": "...", "blocked": bool, "source": "..."}
#   GET /search?query=&location=...  -> {"jobs": [{title, company, location, description, url}]}
#
# /fetch does a server-side extraction (trafilatura) with a real browser UA —
# far better than the on-device reader for company / ATS pages (Greenhouse,
# Lever, Ashby, company career sites). Indeed / LinkedIn may still be blocked by
# Cloudflare on datacenter IPs; the app falls back to "paste the description".
#
# /search wraps JobSpy (its natural search-based mode).

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cover Nugget Jobs API")

# The app is a mobile client, so allow cross-origin requests.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

BLOCK_MARKERS = (
    "verify you are human",
    "just a moment",
    "enable javascript and cookies",
    "captcha",
    "access denied",
    "attention required",
    "additional verification required",
)


def _looks_blocked(text: str) -> bool:
    t = (text or "").lower()
    return any(m in t for m in BLOCK_MARKERS)


@app.get("/health")
def health():
    return {"ok": True}


@app.get("/fetch")
def fetch(url: str = Query(..., description="Job posting URL")):
    """Extract the main job text from a URL, server-side."""
    if not url.lower().startswith(("http://", "https://")):
        return {"text": "", "blocked": False, "error": "invalid url"}
    try:
        import trafilatura

        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            text = (
                trafilatura.extract(
                    downloaded, include_comments=False, include_tables=False
                )
                or ""
            ).strip()
            if _looks_blocked(text):
                return {"text": "", "blocked": True}
            if len(text) >= 120:
                return {"text": text, "blocked": False, "source": "trafilatura"}
    except Exception as e:  # noqa: BLE001
        return {"text": "", "blocked": False, "error": str(e)}
    return {"text": "", "blocked": False}


@app.get("/search")
def search(
    query: str = Query(..., description="Job title / keywords"),
    location: str = Query("", description="City, state or remote"),
    results: int = Query(10, ge=1, le=50),
    site: str = Query("indeed,google", description="Comma sites: indeed,linkedin,zip_recruiter,glassdoor,google"),
):
    """Search jobs via JobSpy and return normalized results."""
    try:
        from jobspy import scrape_jobs

        df = scrape_jobs(
            site_name=[s.strip() for s in site.split(",") if s.strip()],
            search_term=query,
            location=location or None,
            results_wanted=results,
        )
        jobs = []
        for _, r in df.iterrows():
            jobs.append(
                {
                    "title": str(r.get("title") or ""),
                    "company": str(r.get("company") or ""),
                    "location": str(r.get("location") or ""),
                    "description": str(r.get("description") or ""),
                    "url": str(r.get("job_url") or ""),
                }
            )
        return {"jobs": jobs}
    except Exception as e:  # noqa: BLE001
        return {"jobs": [], "error": str(e)}
