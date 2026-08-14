// Global, app-wide model-download controller.
//
// The download must survive screen navigation. If it lives in a screen's local
// state (as it used to), leaving that screen unmounts the component: the promise
// is orphaned, the progress bar vanishes, and the download can stall. So we hold
// it here as a module-level singleton that ANY screen can start, read, and
// subscribe to. Progress keeps flowing while you're on other pages, and the bar
// picks up the live value whenever you return.
//
// Note: this survives in-app navigation, not OS-level backgrounding. If the user
// locks the phone or switches apps, the JS download may pause until they return
// (true OS background download needs native config; out of scope here).

import { useSyncExternalStore } from "react";
import { downloadModel, getModelStatus } from "./modelManager";
import {
  makeEtaTracker,
  formatEta,
  formatSpeed,
  type DownloadProgress,
} from "../utils/downloadProgress";

export type DownloadStatus = "idle" | "downloading" | "done" | "error";

export interface DownloadState {
  status: DownloadStatus;
  fraction: number; // 0..1
  eta: string;
  speed: string;
  error: string | null;
}

let state: DownloadState = {
  status: "idle",
  fraction: 0,
  eta: "",
  speed: "",
  error: null,
};

const listeners = new Set<() => void>();
const tracker = makeEtaTracker();
let inFlight: Promise<void> | null = null;

// Whether a dedicated download screen (Your Assistant / first-run setup) is on
// screen. When it is, it shows its own progress, so the global "done" popup
// stays quiet and only fires when the user is elsewhere.
let downloadUiFocused = false;

function emit() {
  for (const l of listeners) l();
}

function setState(patch: Partial<DownloadState>) {
  state = { ...state, ...patch };
  emit();
}

export function getDownloadState(): DownloadState {
  return state;
}

export function subscribeDownload(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** React hook: re-renders the caller whenever the download state changes. */
export function useModelDownload(): DownloadState {
  return useSyncExternalStore(subscribeDownload, getDownloadState, getDownloadState);
}

/**
 * Start the download, or no-op if one is already running (idempotent). Resolves
 * when the download finishes (or fails). Safe to call from any screen or popup.
 */
export function startModelDownload(): Promise<void> {
  if (inFlight) return inFlight;
  tracker.reset();
  setState({ status: "downloading", fraction: 0, eta: "", speed: "", error: null });
  inFlight = (async () => {
    try {
      await downloadModel((p: DownloadProgress) => {
        const { speed, eta } = tracker.push(p.written, p.total, Date.now());
        setState({ fraction: p.fraction, speed: formatSpeed(speed), eta: formatEta(eta) });
      });
      setState({ status: "done", fraction: 1, eta: "", speed: "" });
    } catch (e: any) {
      setState({ status: "error", error: e?.message ?? "Download failed." });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * Reconcile on app start (and after returning): if the full model file is
 * already on disk, reflect that as "done" so nothing offers to re-download.
 * Never overrides an in-progress download.
 */
export async function reconcileDownloadState(): Promise<void> {
  if (state.status === "downloading") return;
  const s = await getModelStatus();
  if (s.downloaded && state.status !== "done") {
    setState({ status: "done", fraction: 1 });
  }
}

/** After the user deletes the model, drop back to idle (ignored mid-download). */
export function resetModelDownload(): void {
  if (inFlight) return;
  setState({ status: "idle", fraction: 0, eta: "", speed: "", error: null });
}

/** A dedicated download screen registers focus so the global popup stays quiet. */
export function setDownloadUiFocused(v: boolean): void {
  downloadUiFocused = v;
}
export function isDownloadUiFocused(): boolean {
  return downloadUiFocused;
}
