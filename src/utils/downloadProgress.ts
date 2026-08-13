// Live download ETA + speed, smoothed so the readout doesn't jitter.
//
// The download reports cumulative bytes over time; we turn that into a
// smoothed transfer rate (exponential moving average) and a "time remaining"
// estimate, plus friendly formatters for the UI.

export interface DownloadProgress {
  /** 0..1 completion. */
  fraction: number;
  /** Bytes written so far. */
  written: number;
  /** Total bytes expected. */
  total: number;
}

export function formatSpeed(bytesPerSec: number): string {
  if (!isFinite(bytesPerSec) || bytesPerSec <= 0) return "";
  const mb = bytesPerSec / (1024 * 1024);
  return mb >= 1 ? `${mb.toFixed(1)} MB/s` : `${Math.max(1, Math.round(bytesPerSec / 1024))} KB/s`;
}

export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return "";
  if (seconds < 60) return `about ${Math.max(1, Math.round(seconds))}s left`;
  const mins = Math.round(seconds / 60);
  return `about ${mins} min${mins === 1 ? "" : "s"} left`;
}

/** Tracks cumulative bytes and returns a smoothed speed + ETA on each push. */
export function makeEtaTracker() {
  let startMs = 0;
  let lastMs = 0;
  let lastBytes = 0;
  let ema = 0; // bytes/sec

  return {
    reset() {
      startMs = 0;
      ema = 0;
    },
    /** Feed the latest cumulative `written` (bytes) and `total`, plus `nowMs`. */
    push(written: number, total: number, nowMs: number): { speed: number; eta: number } {
      if (startMs === 0) {
        startMs = lastMs = nowMs;
        lastBytes = written;
        return { speed: 0, eta: Infinity };
      }
      const dt = (nowMs - lastMs) / 1000;
      if (dt >= 0.4) {
        const inst = (written - lastBytes) / dt; // bytes/sec since last sample
        ema = ema === 0 ? inst : ema * 0.7 + inst * 0.3;
        lastMs = nowMs;
        lastBytes = written;
      }
      const speed = ema || written / Math.max(0.001, (nowMs - startMs) / 1000);
      const remaining = Math.max(0, total - written);
      const eta = speed > 0 ? remaining / speed : Infinity;
      return { speed, eta };
    },
  };
}
