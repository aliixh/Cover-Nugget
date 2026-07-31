// Job-link reader (spec §5, Phase 4).
//
// Turns a job posting URL into clean, readable text using Jina Reader
// (https://r.jina.ai/<url>) — a free endpoint that strips nav/ads and returns
// article text. Runs on the user's device at request time; no GPU, no API key.
//
// IMPORTANT limitation: heavily bot-protected sites (Indeed, LinkedIn, some
// Workday tenants) serve a Cloudflare / login / captcha challenge instead of
// the posting. No free reader can get past that, so we DETECT those pages and
// tell the user to paste the description instead (which always works).

const JINA_READER_PREFIX = "https://r.jina.ai/";

// Phrases that mean we got a bot-check / login wall instead of the job text.
const BLOCK_MARKERS = [
  "additional verification required",
  "verify you are human",
  "verifying you are human",
  "just a moment",
  "enable javascript and cookies",
  "captcha",
  "access denied",
  "attention required",
  "please sign in",
  "cf-chl",
  "cloudflare",
];

/** Strips leftover markdown (images/links/urls) and blank noise. */
function cleanJobText(raw: string): string {
  return raw
    .replace(/!\[[^\]]*\]\([^)]*\)/g, "") // markdown images
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1") // [text](url) -> text
    .replace(/https?:\/\/\S+/g, "") // bare URLs
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** True if the reader clearly returned a bot-check / wall, not a posting. */
function looksBlocked(text: string): boolean {
  const lower = text.toLowerCase();
  return BLOCK_MARKERS.some((m) => lower.includes(m));
}

// Phrases that typically START the boilerplate tail of a posting (EEO
// statements, application/how-to-apply blurbs, salary-by-location tables that
// spew country lists). We cut the description at the earliest of these so the
// letter is built from the actual role, not legal/footer noise.
const TAIL_MARKERS = [
  "equal opportunity",
  "equal employment",
  "eeo",
  "e-verify",
  "reasonable accommodation",
  "apply for this job",
  "how to apply",
  "application deadline",
  "we are committed to creating a diverse",
  "compensation range",
  "salary range",
  "pay range",
  "base pay range",
  "pursuant to",
];

function trimBoilerplate(text: string): string {
  const lower = text.toLowerCase();
  let cut = -1;
  for (const m of TAIL_MARKERS) {
    const i = lower.indexOf(m);
    // only cut well into the text so we never chop the actual description
    if (i > 400 && (cut === -1 || i < cut)) cut = i;
  }
  return cut > 0 ? text.slice(0, cut).trim() : text;
}

const PASTE_HINT =
  'Switch to "Paste Description" and paste the job text.';

// ---------------------------------------------------------------------------
// On-device direct fetch (primary). RN fetch has no CORS limits and uses the
// phone's own (residential/cellular) IP — far less likely to be bot-blocked
// than a datacenter reader. Most job sites embed the posting as JobPosting
// JSON-LD, which parses cleanly with no server needed.
// ---------------------------------------------------------------------------

const BROWSER_UA =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

/** Rough HTML → text (decodes common entities, keeps line breaks). */
function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[1-6]|ul|ol|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/g, "'")
    .replace(/&rsquo;/gi, "'")
    .replace(/&quot;/gi, '"')
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Pull the description out of a JobPosting JSON-LD block, if present. */
function extractJobPosting(html: string): string | null {
  const blocks = html.match(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  if (!blocks) return null;
  for (const block of blocks) {
    const jsonText = block
      .replace(/<script[^>]*>/i, "")
      .replace(/<\/script>/i, "")
      .trim();
    let data: any;
    try {
      data = JSON.parse(jsonText);
    } catch {
      continue;
    }
    const items = Array.isArray(data)
      ? data
      : data && data["@graph"]
        ? data["@graph"]
        : [data];
    for (const it of items) {
      const t = it && it["@type"];
      const isJob = t === "JobPosting" || (Array.isArray(t) && t.includes("JobPosting"));
      if (isJob && it.description) {
        const text = trimBoilerplate(htmlToText(String(it.description)));
        if (text.length > 80) return text;
      }
    }
  }
  return null;
}

async function fetchDirect(url: string): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { "User-Agent": BROWSER_UA, Accept: "text/html,application/xhtml+xml" },
    });
  } catch {
    return null;
  }
  if (!res.ok) return null;
  const html = await res.text();
  // JobPosting JSON-LD is the clean win (most boards include it).
  const job = extractJobPosting(html);
  if (job && job.length >= 120) return job;
  // Bot-check page → let other methods try.
  if (looksBlocked(html)) return null;
  return null; // raw full-page strip is too noisy; defer to Jina/backend
}

// Optional self-hosted backend (Oracle VM etc.). When set, we try it first — it
// extracts server-side (better for company/ATS pages) — then fall back to Jina.
const JOBS_API = (process.env.EXPO_PUBLIC_JOBS_API || "").replace(/\/$/, "");

async function fetchViaBackend(url: string): Promise<string | null> {
  if (!JOBS_API) return null;
  let res: Response;
  try {
    res = await fetch(`${JOBS_API}/fetch?url=${encodeURIComponent(url)}`);
  } catch {
    return null; // backend unreachable → fall back to Jina
  }
  if (!res.ok) return null;
  const data: any = await res.json().catch(() => null);
  if (!data) return null;
  if (data.blocked) {
    throw new Error(
      `This site blocked automatic reading (Indeed, LinkedIn and some others do). ${PASTE_HINT}`
    );
  }
  const text = trimBoilerplate(cleanJobText(String(data.text || "")));
  return text.length >= 120 ? text : null;
}

/** Fetches and cleans the job description text for a posting URL. */
export async function fetchJobTextFromUrl(url: string): Promise<string> {
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("Please enter a valid http(s) link.");
  }

  // 1) On-device direct fetch (phone's own IP + JobPosting JSON-LD). Best for
  //    job boards, no server/key needed.
  const direct = await fetchDirect(trimmed);
  if (direct) return direct;

  // 2) Optional self-hosted backend, if configured.
  const viaBackend = await fetchViaBackend(trimmed);
  if (viaBackend) return viaBackend;

  // 3) Jina Reader.
  let res: Response;
  try {
    res = await fetch(`${JINA_READER_PREFIX}${trimmed}`, {
      headers: {
        // Ask Jina for clean plain text and drop chrome before it reaches us.
        "X-Return-Format": "text",
        "X-Remove-Selector": "nav,header,footer,script,style,noscript",
      },
    });
  } catch {
    throw new Error("Couldn't reach the job link. Check your connection.");
  }

  if (!res.ok) {
    throw new Error(
      `Couldn't read that link (status ${res.status}). ${PASTE_HINT}`
    );
  }

  const raw = (await res.text()).trim();

  if (looksBlocked(raw)) {
    throw new Error(
      `This site blocked automatic reading (Indeed, LinkedIn and some others do). ${PASTE_HINT}`
    );
  }

  const cleaned = trimBoilerplate(cleanJobText(raw));
  if (cleaned.length < 120) {
    throw new Error(`That link didn't return a usable job description. ${PASTE_HINT}`);
  }
  return cleaned;
}
