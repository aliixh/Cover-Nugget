# Cover Nugget jobs backend — deploy on an Oracle Always-Free VM

This runs the optional job-fetch/search API. It's **free forever** (Oracle
Always-Free ARM) and **always on** (no cold starts). The phone only calls it for
job lookups; everything else stays on-device.

> iOS requires **HTTPS**. The easiest free HTTPS (no domain, no port-forwarding)
> is a **Cloudflare Tunnel** — steps below.

---

## 1. Create the free VM (one time, in your browser)

1. Sign up at **cloud.oracle.com** → "Always Free" is included.
2. **Create a Compute instance**:
   - Image: **Ubuntu 22.04** (or 24.04)
   - Shape: **Ampere A1 (ARM)** — Always-Free eligible (up to 4 cores / 24 GB)
   - Add your SSH public key (or let it generate one — download it).
3. When it's running, note the **Public IP** and SSH in:
   ```
   ssh ubuntu@<VM_PUBLIC_IP>
   ```

## 2. Install + run the API (on the VM)

```bash
sudo apt update && sudo apt install -y python3-pip python3-venv
mkdir -p ~/covernugget && cd ~/covernugget
# copy main.py + requirements.txt here (see step 2b)
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# quick test (Ctrl-C to stop):
uvicorn main:app --host 0.0.0.0 --port 8000
```

**2b. Get the two files onto the VM.** From your Mac (after `cnpull`), the files
are in `~/Downloads/side-project/server/`:
```
scp ~/Downloads/side-project/server/main.py ~/Downloads/side-project/server/requirements.txt ubuntu@<VM_PUBLIC_IP>:~/covernugget/
```

**Run it as a service so it stays up:**
```bash
sudo tee /etc/systemd/system/covernugget.service >/dev/null <<'UNIT'
[Unit]
Description=Cover Nugget Jobs API
After=network.target
[Service]
User=ubuntu
WorkingDirectory=/home/ubuntu/covernugget
ExecStart=/home/ubuntu/covernugget/.venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000
Restart=always
[Install]
WantedBy=multi-user.target
UNIT
sudo systemctl enable --now covernugget
```

## 3. Free HTTPS with a Cloudflare Tunnel

```bash
# install cloudflared (ARM64)
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64 -o cloudflared
chmod +x cloudflared && sudo mv cloudflared /usr/local/bin/

# quick tunnel (gives a temporary https://xxxx.trycloudflare.com URL):
cloudflared tunnel --url http://127.0.0.1:8000
```
It prints an **https URL** — that's your API base. (For a permanent URL, run
`cloudflared login` and create a **named tunnel** — Cloudflare's docs cover it;
still free.)

**Verify:** open `https://<that-url>/health` in a browser → `{"ok": true}`.

## 4. Point the app at it

In `~/Downloads/side-project/`, create a `.env` file:
```
EXPO_PUBLIC_JOBS_API=https://<your-tunnel-or-domain>
```
Restart Metro (`npx expo start --tunnel --go`). The app now tries your backend
first for job links, and falls back to the built-in reader / "paste" if it's
unset or unreachable.

---

## Notes / limits
- **Company + ATS pages (Greenhouse, Lever, Ashby, career sites): work well.**
- **Indeed / LinkedIn:** still often blocked — they block **datacenter IPs**
  (which all free hosts use). Reliable Indeed/LinkedIn needs paid residential
  proxies; paste stays the fallback.
- `/search?query=...&location=...` uses JobSpy (search mode) and is ready for a
  future "search jobs" screen in the app.
