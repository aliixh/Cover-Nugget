// On-device model download manager.
//
// Handles downloading the GGUF weights to app storage with live progress,
// checking whether they already exist, reporting size, and deleting them.
// Uses expo-file-system — works in Expo Go, dev builds, and web (web falls
// back gracefully since local model inference isn't supported in a browser).
//
// No GPU and no model execution here — this only moves a file onto the device.

// SDK 54 moved the classic file API (documentDirectory, download resumables,
// getInfoAsync, ...) to the `/legacy` entry; the new default export is the
// File/Directory API we don't need here.
import * as FileSystem from "expo-file-system/legacy";
import { MODEL } from "./modelConfig";

/** Absolute on-device path where the model file lives once downloaded. */
export function getModelPath(): string {
  // documentDirectory is persistent, per-app storage.
  return `${FileSystem.documentDirectory}${MODEL.fileName}`;
}

export interface ModelStatus {
  downloaded: boolean;
  /** Bytes on disk, if downloaded. */
  sizeBytes?: number;
  path: string;
}

/** Reports whether the model is already present on the device. */
export async function getModelStatus(): Promise<ModelStatus> {
  const path = getModelPath();
  // documentDirectory is null on web — treat as "not downloadable here".
  if (!FileSystem.documentDirectory) {
    return { downloaded: false, path };
  }
  const info = await FileSystem.getInfoAsync(path);
  return {
    downloaded: info.exists,
    sizeBytes: info.exists ? (info as any).size : undefined,
    path,
  };
}

export type ProgressCallback = (fraction: number) => void;

/**
 * Downloads the model with progress. Resolves to the local path on success.
 * Safe to call again if a partial file exists — it restarts the download.
 */
export async function downloadModel(onProgress?: ProgressCallback): Promise<string> {
  if (!FileSystem.documentDirectory) {
    throw new Error(
      "On-device model download isn't available on web. Use the iOS/Android app."
    );
  }

  const path = getModelPath();

  const task = FileSystem.createDownloadResumable(
    MODEL.url,
    path,
    {},
    (progress) => {
      if (!onProgress) return;
      const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
      // totalBytesExpectedToWrite can be -1 if the server omits Content-Length.
      if (totalBytesExpectedToWrite > 0) {
        onProgress(totalBytesWritten / totalBytesExpectedToWrite);
      }
    }
  );

  const result = await task.downloadAsync();
  if (!result?.uri) {
    throw new Error("Model download failed. Check your connection and try again.");
  }
  return result.uri;
}

/** Deletes the downloaded model (frees storage). */
export async function deleteModel(): Promise<void> {
  const path = getModelPath();
  const info = await FileSystem.getInfoAsync(path);
  if (info.exists) {
    await FileSystem.deleteAsync(path, { idempotent: true });
  }
}

/* ---- Optional LoRA adapter (only when MODEL.adapter is configured) ------- */

/** On-device path for the LoRA adapter, or null if none is configured. */
export function getAdapterPath(): string | null {
  if (!MODEL.adapter || !FileSystem.documentDirectory) return null;
  return `${FileSystem.documentDirectory}${MODEL.adapter.fileName}`;
}

/** Returns the adapter's local path if it's configured AND downloaded. */
export async function getDownloadedAdapterPath(): Promise<string | null> {
  const path = getAdapterPath();
  if (!path) return null;
  const info = await FileSystem.getInfoAsync(path);
  return info.exists ? path : null;
}

/** Downloads the LoRA adapter (no-op if none is configured). */
export async function downloadAdapter(onProgress?: ProgressCallback): Promise<string | null> {
  const path = getAdapterPath();
  if (!MODEL.adapter || !path) return null;
  const task = FileSystem.createDownloadResumable(MODEL.adapter.url, path, {}, (progress) => {
    if (!onProgress) return;
    const { totalBytesWritten, totalBytesExpectedToWrite } = progress;
    if (totalBytesExpectedToWrite > 0) onProgress(totalBytesWritten / totalBytesExpectedToWrite);
  });
  const result = await task.downloadAsync();
  return result?.uri ?? null;
}
