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

// A line that is only "rule" characters (box-drawing / dashes) — rendered as a
// full-width <hr> on export instead of fixed-width characters that stop halfway.
const RULE_LINE = /^[─━—–\-─—–]{5,}$/;

/** The inner letter markup: paragraphs (blank-line separated), single newlines
 *  as line breaks, a rule line as an <hr>, semi-block paragraphs indented. */
function letterInner(content: string): string {
  const renderBlock = (block: string): string => {
    const indented = /^\t/.test(block);
    const out: string[] = [];
    let buf: string[] = [];
    const flush = () => {
      if (!buf.length) return;
      const inner = buf.map((l) => escapeHtml(l.replace(/^\t+/, ""))).join("<br/>");
      out.push(`<p${indented ? ' style="text-indent:2.5em"' : ""}>${inner}</p>`);
      buf = [];
    };
    for (const line of block.split("\n")) {
      if (RULE_LINE.test(line.trim())) {
        flush();
        out.push('<hr class="rule"/>');
      } else {
        buf.push(line);
      }
    }
    flush();
    return out.join("");
  };
  return content
    .split(/\n{2,}/)
    .filter((b) => b.trim().length)
    .map(renderBlock)
    .join("\n");
}

/** Printable HTML (PDF) — Times New Roman 12pt. Margins come from body padding
 *  (WebKit/expo-print ignores `@page` margins on iOS, which jammed the text
 *  against the page edge). */
function letterHtml(content: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
    <style>
      @page { margin: 0; }
      html, body { margin: 0; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 12pt;
             line-height: 1.4; color: #000000; padding: 1in; }
      p { margin: 0 0 12pt 0; }
      hr.rule { border: none; border-top: 1px solid #000; margin: 4pt 0 10pt 0; }
    </style></head><body>${letterInner(content)}</body></html>`;
}

/** Word-compatible HTML (.doc). The Office XML namespaces + WordSection make
 *  Word / Pages / Google Docs recognize and open it (a bare HTML .doc doesn't). */
function wordHtml(content: string): string {
  return `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"/><meta name="ProgId" content="Word.Document"/>
    <!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View></w:WordDocument></xml><![endif]-->
    <style>
      @page WordSection1 { size: 8.5in 11.0in; margin: 1.0in 1.0in 1.0in 1.0in; }
      div.WordSection1 { page: WordSection1; }
      body { font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.4; color: #000000; }
      p { margin: 0 0 12pt 0; }
      hr.rule { border: none; border-top: 1px solid #000; margin: 4pt 0 10pt 0; }
    </style></head>
    <body><div class="WordSection1">${letterInner(content)}</div></body></html>`;
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
  await FileSystem.writeAsStringAsync(path, wordHtml(content), {
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
  // `docs.new` is unreliable on mobile; the explicit create URL opens the Google
  // Docs app (or the browser) to a fresh document to paste into.
  const url = "https://docs.google.com/document/create";
  try {
    await Linking.openURL(url);
  } catch {
    await Linking.openURL("https://docs.new");
  }
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
