// Export helpers (spec §12): copy, PDF, Word, Google Docs, and the share sheet.
//
// PDF uses expo-print; Word is produced as an HTML-based .doc (opens in Word /
// Google Docs / Pages); sharing uses expo-sharing. All local & offline except
// "Open in Google Docs", which opens a browser to create a doc.

import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import * as Clipboard from "expo-clipboard";
// SDK 54: classic API (documentDirectory, EncodingType, writeAsStringAsync)
// lives under the `/legacy` entry now.
import * as FileSystem from "expo-file-system/legacy";
import { Linking, Platform } from "react-native";

/** Escapes text for safe embedding in HTML. */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Wraps the letter text in a clean printable HTML document. */
function letterHtml(content: string): string {
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      body { font-family: Georgia, 'Times New Roman', serif; font-size: 12pt;
             line-height: 1.5; color: #1A1A1A; padding: 48px; }
      p { margin: 0 0 12pt 0; }
    </style></head><body>${paragraphs}</body></html>`;
}

/** Make a filesystem-safe file base name from a user-facing title. */
export function safeFileName(name?: string): string {
  const base = (name ?? "")
    .replace(/[\/\\:*?"<>|]/g, "") // strip path-illegal characters
    .replace(/\s+/g, " ")
    .trim();
  return base.length ? base : "cover-letter";
}

/** Copy plain text to the clipboard. */
export async function copyText(content: string): Promise<void> {
  await Clipboard.setStringAsync(content);
}

/** Render a PDF (named from `fileName`) and open the share sheet. */
export async function exportPdf(content: string, fileName?: string): Promise<void> {
  const { uri } = await Print.printToFileAsync({ html: letterHtml(content) });
  const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  // expo-print names the file randomly; copy to a friendly name so the share
  // sheet / saved file uses the letter's name.
  if (dir) {
    const target = `${dir}${safeFileName(fileName)}.pdf`;
    await FileSystem.deleteAsync(target, { idempotent: true });
    await FileSystem.copyAsync({ from: uri, to: target });
    await shareFile(target, "application/pdf");
  } else {
    await shareFile(uri, "application/pdf");
  }
}

/**
 * Export a Word-compatible document. We write an HTML file with a .doc
 * extension — Word, Pages, and Google Docs all open it and preserve paragraphs.
 */
export async function exportWord(content: string, fileName?: string): Promise<void> {
  if (!FileSystem.documentDirectory) {
    throw new Error("Word export isn't available on web.");
  }
  const path = `${FileSystem.documentDirectory}${safeFileName(fileName)}.doc`;
  await FileSystem.writeAsStringAsync(path, letterHtml(content), {
    encoding: FileSystem.EncodingType.UTF8,
  });
  await shareFile(path, "application/msword");
}

/**
 * Open Google Docs to a new document. Google Docs has no "create with text"
 * URL, so we copy the letter to the clipboard first and open a blank doc for
 * the user to paste into.
 */
export async function openInGoogleDocs(content: string): Promise<void> {
  await copyText(content);
  await Linking.openURL("https://docs.new");
}

/** Generic share of the raw text via the OS share sheet. */
export async function shareText(content: string, fileName?: string): Promise<void> {
  if (!FileSystem.documentDirectory) {
    await copyText(content);
    return;
  }
  const path = `${FileSystem.documentDirectory}${safeFileName(fileName)}.txt`;
  await FileSystem.writeAsStringAsync(path, content);
  await shareFile(path, "text/plain");
}

/** Shares a file if the platform supports it, else no-ops gracefully. */
async function shareFile(uri: string, mimeType: string): Promise<void> {
  if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing isn't available here. Try Copy Text instead.");
  }
  await Sharing.shareAsync(uri, { mimeType });
}
