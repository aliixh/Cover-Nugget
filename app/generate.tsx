// Generate flow — Job Input (spec §5). Provide the job as a link (auto-scraped
// via Jina Reader) or by pasting the description, then generate a draft.
// For links: we scrape as soon as a valid URL is entered, show a progress bar,
// keep "Generate" disabled until the scrape succeeds, and warn if it's blocked.

import { useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, Modal, Pressable, ScrollView, View } from "react-native";
import { Text } from "../src/ui/serif";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { BackButton } from "../src/components/BackButton";
import { Button } from "../src/components/Button";
import { Logo } from "../src/components/Logo";
import { TextField } from "../src/components/TextField";
import { Card } from "../src/components/Card";
import { LengthLimitControl, type LimitState } from "../src/components/LengthLimitControl";
import { useApp } from "../src/context/AppContext";
import { fetchJobTextFromUrl, guessCompanyRole } from "../src/job/jina";
import { generateLetter, fitToLength } from "../src/services/coverLetter";
import { jobMatchInsight } from "../src/ai/jobMatch";
import type { FullProfile } from "../src/types/models";
import {
  defaultLetterTitle,
  getFullProfile,
  saveCoverLetter,
  updateCoverLetterLimit,
} from "../src/db/repositories";

type Mode = "link" | "description";
type ScrapeState = "idle" | "loading" | "ok" | "error";

/** Indeterminate progress bar (inline styles so the native transform isn't
 *  overridden by NativeWind). A lit segment slides across the track. */
function ScrapeBar() {
  const { colors } = useApp();
  const [w, setW] = useState(0);
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (w <= 0) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1200, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [w, x]);
  const barW = Math.max(60, w * 0.35);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-barW, w] });
  return (
    <View
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={{ height: 6, borderRadius: 999, overflow: "hidden", backgroundColor: colors.highlight }}
    >
      {w > 0 ? (
        <Animated.View
          style={{
            width: barW,
            height: "100%",
            borderRadius: 999,
            backgroundColor: colors.accent,
            transform: [{ translateX }],
          }}
        />
      ) : null}
    </View>
  );
}

export default function GenerateScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("description");
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [busyLabel, setBusyLabel] = useState("");

  // Optional length limit, enforced BEFORE the user sees the letter (our own
  // counter checks; the model re-shortens until it fits).
  const [limit, setLimit] = useState<LimitState>({ enabled: false, type: "word", value: 300 });

  // Auto-scrape state (link mode).
  const [scrapeState, setScrapeState] = useState<ScrapeState>("idle");
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [scrapedText, setScrapedText] = useState("");
  const [profile, setProfile] = useState<FullProfile | null>(null);
  useEffect(() => {
    getFullProfile().then(setProfile).catch(() => {});
  }, []);
  const scrapeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dev tool: preview the full scraped text.
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewText, setPreviewText] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);

  // Prefill Company/Role from a detected value only when the field is empty, so
  // we never stomp on something the user typed.
  const prefillCompanyRole = (found: { company?: string; role?: string }) => {
    if (found.company) setCompany((c) => (c.trim() ? c : found.company!));
    if (found.role) setRole((r) => (r.trim() ? r : found.role!));
  };

  const runScrape = async (u: string) => {
    setScrapeState("loading");
    setScrapeError(null);
    try {
      const job = await fetchJobTextFromUrl(u);
      setScrapedText(job.text);
      prefillCompanyRole(job);
      setScrapeState("ok");
    } catch (e: any) {
      setScrapeError(e?.message ?? "Couldn't read that link.");
      setScrapeState("error");
    }
  };

  // In paste-description mode, quietly detect Company/Role from the text and
  // fill the (empty) fields so the letter and file name get them for free.
  useEffect(() => {
    if (mode !== "description") return;
    if (description.trim().length < 40) return;
    prefillCompanyRole(guessCompanyRole(description));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [description, mode]);

  // Debounced auto-scrape as the user finishes pasting a URL.
  const onUrlChange = (t: string) => {
    setUrl(t);
    setScrapeState("idle");
    setScrapeError(null);
    setScrapedText("");
    if (scrapeTimer.current) clearTimeout(scrapeTimer.current);
    const trimmed = t.trim();
    if (/^https?:\/\//i.test(trimmed)) {
      scrapeTimer.current = setTimeout(() => runScrape(trimmed), 900);
    }
  };

  const onPreviewScrape = async () => {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewText("");
    try {
      const job = await fetchJobTextFromUrl(url);
      setPreviewText(job.text);
    } catch (e: any) {
      setPreviewText(`⚠️ ${e?.message ?? "Couldn't scrape that link."}`);
    } finally {
      setPreviewLoading(false);
    }
  };

  // Live profile-vs-posting match, so the user can see coverage/gaps before generating.
  const match = useMemo(() => {
    const jobText = (mode === "link" ? scrapedText : description).trim();
    return profile ? jobMatchInsight(profile, jobText) : null;
  }, [profile, mode, scrapedText, description]);

  const canGenerate =
    mode === "link" ? scrapeState === "ok" : description.trim().length > 0;

  const onGenerate = async () => {
    try {
      setBusy(true);
      const jobText = (mode === "link" ? scrapedText : description).trim();
      if (jobText.length === 0) {
        throw new Error(
          mode === "link"
            ? "Fetch a job link first, or paste the description."
            : "Please add a job description."
        );
      }
      // Fall back to values detected from the job text if the fields are blank.
      const guessed = guessCompanyRole(jobText);
      const effCompany = company.trim() || guessed.company || "";
      const effRole = role.trim() || guessed.role || "";

      setBusyLabel("Writing your cover letter…");
      const { content, usedFallback } = await generateLetter({
        company: effCompany || undefined,
        role: effRole || undefined,
        description: jobText,
      });

      // Enforce the length limit with our own counter before showing anything.
      // Only re-shorten when the model is actually available (usedFallback ==
      // false); in Expo Go we still store the limit so the editor flags it.
      const activeLimit =
        limit.enabled && limit.value > 0 ? { type: limit.type, value: limit.value } : null;
      let finalContent = content;
      if (activeLimit && !usedFallback) {
        try {
          finalContent = await fitToLength(content, activeLimit, {
            onPass: (p, max) =>
              setBusyLabel(`Trimming to ${activeLimit.value} ${activeLimit.type === "word" ? "words" : "chars"}… (${p}/${max})`),
          });
        } catch {
          // Model dropped out mid-fit — keep the draft; editor still flags it.
        }
      }

      const id = await saveCoverLetter({
        title: defaultLetterTitle(effCompany, effRole),
        company: effCompany || undefined,
        role: effRole || undefined,
        content: finalContent,
      });
      if (activeLimit) await updateCoverLetterLimit(id, activeLimit.type, activeLimit.value);
      router.replace(`/editor/${id}`);
    } catch (e: any) {
      setBusy(false);
      setBusyLabel("");
      Alert.alert("Couldn't generate", e?.message ?? "Something went wrong.");
    }
  };

  if (busy) {
    return (
      <ScreenContainer scroll={false}>
        <View className="flex-1 items-center justify-center">
          <Logo width={140} style={{ marginBottom: 24 }} />
          <ActivityIndicator size="large" />
          <Text className="mt-4 text-base text-secondary dark:text-dark-ink">
            {busyLabel}
          </Text>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <BackButton />
      <Text className="mb-1 text-2xl font-bold text-primary dark:text-dark-primary">
        Add the job
      </Text>
      <Text className="mb-5 text-base text-secondary dark:text-dark-ink">
        Paste a job link or the description — we'll tailor your letter to it.
      </Text>

      {/* Mode toggle */}
      <View className="mb-5 flex-row rounded-xl bg-highlight p-1 dark:bg-dark-surface">
        {(["description", "link"] as Mode[]).map((m) => (
          <Pressable
            key={m}
            onPress={() => setMode(m)}
            className={`flex-1 rounded-lg py-2.5 ${
              mode === m ? "bg-primary dark:bg-dark-primary" : ""
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                mode === m
                  ? "text-background dark:text-dark-background"
                  : "text-primary dark:text-dark-ink"
              }`}
            >
              {m === "description" ? "Paste Description" : "Paste Link"}
            </Text>
          </Pressable>
        ))}
      </View>

      {mode === "link" ? (
        <>
          <TextField
            label="Job link"
            value={url}
            onChangeText={onUrlChange}
            keyboardType="url"
            autoCapitalize="none"
            placeholder="https://company.com/job-posting"
          />

          <Text className="mb-2 text-xs text-muted dark:text-dark-muted">
            Works on most company career pages, Greenhouse, Lever, and Ashby.
            Indeed & LinkedIn block automatic reading — for those, use “Paste
            Description” instead.
          </Text>

          {/* Scrape status */}
          {scrapeState === "loading" ? (
            <View className="mb-2">
              <Text className="mb-1 text-sm text-muted dark:text-dark-muted">
                Reading the job link…
              </Text>
              <ScrapeBar />
            </View>
          ) : null}
          {scrapeState === "ok" ? (
            <Text className="mb-2 text-sm font-medium text-secondary dark:text-dark-primary">
              ✓ Got the job details ({scrapedText.length} chars)
            </Text>
          ) : null}
          {scrapeState === "error" ? (
            <Text className="mb-2 text-sm text-accent">⚠️ {scrapeError}</Text>
          ) : null}

          <Pressable
            onPress={onPreviewScrape}
            className="mb-2 self-start rounded-lg border border-border px-3 py-1.5 active:opacity-70 dark:border-dark-border"
          >
            <Text className="text-sm font-medium text-secondary dark:text-dark-ink">
              🔍 Preview scraped text (dev)
            </Text>
          </Pressable>
        </>
      ) : (
        <TextField
          label="Job description"
          value={description}
          onChangeText={setDescription}
          multiline
          placeholder="Paste the job description here"
        />
      )}

      {/* Company / Role — below the job input; auto-filled from the link or
          pasted text when we can detect them (still editable). */}
      <View className="mt-1 flex-row">
        <View className="mr-2 flex-1">
          <TextField label="Company" value={company} onChangeText={setCompany} optional placeholder="Google" />
        </View>
        <View className="flex-1">
          <TextField label="Role" value={role} onChangeText={setRole} optional placeholder="SWE Intern" />
        </View>
      </View>

      {/* Profile ↔ posting match: coverage score + the key terms you're missing. */}
      {match && match.total >= 4 ? (
        <Card className="mt-4">
          <View className="flex-row items-center justify-between">
            <Text className="font-semibold text-ink dark:text-dark-ink">Profile match</Text>
            <Text className="font-semibold text-secondary dark:text-dark-primary">
              {match.covered.length}/{match.total} · {Math.round(match.score * 100)}%
            </Text>
          </View>
          <View className="mt-2 h-2 w-full overflow-hidden rounded-full bg-highlight dark:bg-dark-border">
            <View
              className="h-2 rounded-full bg-secondary dark:bg-dark-primary"
              style={{ width: `${Math.max(4, Math.round(match.score * 100))}%` }}
            />
          </View>
          {match.missing.length ? (
            <Text className="mt-3 text-sm text-muted dark:text-dark-muted">
              Not in your profile yet:{" "}
              <Text className="font-semibold text-accent">{match.missing.join(", ")}</Text>
            </Text>
          ) : (
            <Text className="mt-3 text-sm text-secondary dark:text-dark-primary">
              Strong match — your profile covers the posting's key terms.
            </Text>
          )}
        </Card>
      ) : null}

      {/* Optional length limit — enforced before the letter is shown. */}
      <View className="mt-4">
        <LengthLimitControl state={limit} onChange={setLimit} />
      </View>

      {/* Big primary action with a paper icon (📄 renders natively everywhere) */}
      <Pressable
        onPress={onGenerate}
        disabled={!canGenerate}
        className={`mt-4 flex-row items-center justify-center rounded-2xl bg-primary px-6 py-5 active:opacity-80 dark:bg-dark-primary ${
          canGenerate ? "" : "opacity-40"
        }`}
      >
        <Text style={{ fontSize: 24 }} className="mr-2">
          📄
        </Text>
        <Text className="text-lg font-bold text-background dark:text-dark-background">
          Generate Cover Letter
        </Text>
      </Pressable>

      {/* Scraped-text preview (dev tool) */}
      <Modal
        visible={previewOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setPreviewOpen(false)}
      >
        <View className="flex-1 justify-end bg-black/40">
          <View className="max-h-[80%] rounded-t-3xl bg-background p-5 dark:bg-dark-surface">
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-lg font-bold text-primary dark:text-dark-primary">
                Scraped text {previewText ? `(${previewText.length} chars)` : ""}
              </Text>
              <Pressable onPress={() => setPreviewOpen(false)} className="px-2 py-1">
                <Text className="text-base font-semibold text-accent">Close</Text>
              </Pressable>
            </View>
            {previewLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator size="large" />
                <Text className="mt-3 text-muted dark:text-dark-muted">Scraping…</Text>
              </View>
            ) : (
              <ScrollView className="rounded-xl border border-border p-3 dark:border-dark-border">
                <Text className="text-sm leading-5 text-ink dark:text-dark-ink">
                  {previewText}
                </Text>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}
