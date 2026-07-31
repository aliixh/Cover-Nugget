// Cover Letter Editor.
//  - SELECT mode (default): the letter is shown as tappable sentences. Tap one
//    or more sentences (no keyboard) then pick an AI change to apply to them.
//    "Select all" selects every sentence. A layout-format button cycles presets.
//  - "Edit myself" opens MANUAL mode: a normal text box with the keyboard; a
//    Done button then asks to Save changes or Revert to the pre-edit version.
//  - Length limit: our counter tracks length; "Fit" shortens via the model.
//
// AI actions need the on-device model; in Expo Go they show a clear message.
// Manual editing always works.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, InputAccessoryView, Keyboard, Modal, Platform, Pressable, ScrollView, Text as RNText, View } from "react-native";
import { Text, TextInput } from "../../src/ui/serif";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { useApp } from "../../src/context/AppContext";
import { editSelection, fitToLength } from "../../src/services/coverLetter";
import { copyText } from "../../src/services/export";
import {
  getCoverLetter,
  getFullProfile,
  updateCoverLetter,
  updateCoverLetterFormat,
  updateCoverLetterLimit,
  updateCoverLetterTitle,
} from "../../src/db/repositories";
import { coverLetterTitle } from "../../src/utils/format";
import {
  LETTER_FORMATS,
  formatIndexByKey,
  applyLetterFormat,
} from "../../src/services/letterFormat";
import type { Profile } from "../../src/types/models";
import { LengthLimitControl, type LimitState } from "../../src/components/LengthLimitControl";
import { EditToolbar, type EditCategory } from "../../src/components/EditToolbar";
import { countChars, countWords, withinLimit, type LengthLimit } from "../../src/utils/textStats";
import { tokenizeSentences } from "../../src/utils/sentences";
import type { SelectionAction } from "../../src/ai/types";

const KB_ACCESSORY_ID = "editorKbDone";

/** Thin indeterminate bar for the shorten/regenerate progress. */
function FitBar() {
  const x = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(x, { toValue: 1, duration: 1000, useNativeDriver: true })
    );
    loop.start();
    return () => loop.stop();
  }, [x]);
  const translateX = x.interpolate({ inputRange: [0, 1], outputRange: [-90, 340] });
  return (
    <View className="h-1.5 w-full overflow-hidden rounded-full bg-highlight dark:bg-dark-surface">
      <Animated.View
        style={{ width: 90, height: "100%", transform: [{ translateX }] }}
        className="rounded-full bg-accent"
      />
    </View>
  );
}

export default function EditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const letterId = Number(id);
  const router = useRouter();
  const { colors } = useApp();

  const [mode, setMode] = useState<"select" | "manual">("select");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [limit, setLimit] = useState<LimitState>({ enabled: false, type: "word", value: 300 });
  const [loaded, setLoaded] = useState(false);

  // Layout preset + the data its header needs.
  const [formatIdx, setFormatIdx] = useState(0);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<string | null>(null);

  // Sentence selection (indices into the token list).
  const [selected, setSelected] = useState<Set<number>>(new Set());

  // Category currently expanded in the toolbar.
  const [openCat, setOpenCat] = useState<EditCategory | null>(null);

  const [busy, setBusy] = useState(false);

  // Shorten/regenerate progress.
  const [fitting, setFitting] = useState(false);
  const [fitStatus, setFitStatus] = useState("");
  const fitCancel = useRef(false);

  // Manual-edit snapshot (for the Save / Revert prompt).
  const manualSnapshot = useRef("");

  // Custom-edit modal.
  const [customOpen, setCustomOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");

  useEffect(() => {
    (async () => {
      const [letter, full] = await Promise.all([getCoverLetter(letterId), getFullProfile()]);
      if (letter) {
        setText(letter.content);
        setTitle(coverLetterTitle(letter));
        setCompany(letter.company ?? null);
        setFormatIdx(formatIndexByKey(letter.formatKey));
        if (letter.limitType) {
          setLimit({ enabled: true, type: letter.limitType, value: letter.limitValue ?? 0 });
        }
      }
      if (full) setProfile(full.profile);
      setLoaded(true);
    })();
  }, [letterId]);

  const tokens = useMemo(() => tokenizeSentences(text), [text]);
  const sentenceIdxs = useMemo(
    () => tokens.map((t, i) => (t.sentence ? i : -1)).filter((i) => i >= 0),
    [tokens]
  );
  const busyAny = busy || fitting;

  const onChangeTitle = (t: string) => {
    setTitle(t);
    if (t.trim().length > 0) void updateCoverLetterTitle(letterId, t.trim());
  };

  const toggleSentence = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };
  const selectAll = () => setSelected(new Set(sentenceIdxs));
  const clearSelection = () => setSelected(new Set());

  const aiUnavailable = (e: any) => {
    Alert.alert(
      "This needs the full app",
      (e?.message ?? "This runs the on-device model.") +
        "\n\nYou can still edit the letter yourself with “Edit myself.”"
    );
  };

  // Apply an action to every selected sentence. Splice from the last sentence
  // backwards so earlier offsets stay valid as text length changes.
  const applyToSelected = async (action: SelectionAction, custom?: string) => {
    const spans = [...selected]
      .map((i) => tokens[i])
      .filter((t) => t && t.sentence)
      .sort((a, b) => b.start - a.start);
    if (spans.length === 0) {
      Alert.alert("Tap a sentence first", "Tap one or more sentences in the letter, then choose a change.");
      return;
    }
    try {
      setBusy(true);
      let next = text;
      for (const span of spans) {
        const replacement =
          action === "custom"
            ? await editSelection(next, span.text, "custom", custom)
            : await editSelection(next, span.text, action);
        next = (next.slice(0, span.start) + replacement + next.slice(span.end)).replace(
          /\n{3,}/g,
          "\n\n"
        );
      }
      setText(next);
      clearSelection();
      setOpenCat(null);
      await updateCoverLetter(letterId, next);
    } catch (e: any) {
      aiUnavailable(e);
    } finally {
      setBusy(false);
    }
  };

  const onCustom = () => {
    if (selected.size === 0) {
      Alert.alert("Tap a sentence first", "Tap one or more sentences, then tap Custom.");
      return;
    }
    setCustomInstruction("");
    setCustomOpen(true);
  };
  const submitCustom = async () => {
    const instruction = customInstruction.trim();
    setCustomOpen(false);
    if (instruction.length === 0) return;
    await applyToSelected("custom", instruction);
  };

  const onLimitChange = (s: LimitState) => {
    setLimit(s);
    void updateCoverLetterLimit(letterId, s.enabled ? s.type : null, s.enabled ? s.value : null);
  };

  const activeLimit: LengthLimit | null =
    limit.enabled && limit.value > 0 ? { type: limit.type, value: limit.value } : null;
  const words = countWords(text);
  const chars = countChars(text);
  const overLimit = !withinLimit(text, activeLimit);

  // Live word/char count, shown right under the letter. Recomputed every render
  // (from `text`), so it updates as you type or run an edit.
  const countLine = (
    <Text className="mb-1 mt-2 text-xs text-muted dark:text-dark-muted">
      {words} words · {chars} chars
      {activeLimit
        ? overLimit
          ? `  ·  over ${activeLimit.value} ${activeLimit.type === "word" ? "word" : "char"} limit`
          : `  ·  within ${activeLimit.value} ${activeLimit.type === "word" ? "word" : "char"} limit`
        : ""}
    </Text>
  );

  const fitLength = async () => {
    setFitting(true);
    fitCancel.current = false;
    setFitStatus("Shortening…");
    try {
      const next = await fitToLength(text, activeLimit, {
        onPass: (p, max) => setFitStatus(`Shortening… pass ${p} of ${max}`),
        shouldCancel: () => fitCancel.current,
      });
      setText(next);
      await updateCoverLetter(letterId, next);
    } catch (e: any) {
      aiUnavailable(e);
    } finally {
      setFitting(false);
      setFitStatus("");
    }
  };

  const cycleFormat = async () => {
    if (!profile) return;
    const next = (formatIdx + 1) % LETTER_FORMATS.length;
    const reformatted = applyLetterFormat(text, next, profile, company);
    setText(reformatted);
    setFormatIdx(next);
    clearSelection();
    await updateCoverLetter(letterId, reformatted);
    void updateCoverLetterFormat(letterId, LETTER_FORMATS[next].key);
  };

  // --- Manual ("Edit myself") mode ---
  const startManual = () => {
    manualSnapshot.current = text;
    clearSelection();
    setOpenCat(null);
    setMode("manual");
  };
  const finishManual = () => {
    Keyboard.dismiss();
    if (text === manualSnapshot.current) {
      setMode("select");
      return;
    }
    Alert.alert("Keep your changes?", "Save your edits or go back to how it was before.", [
      { text: "Keep editing", style: "cancel" },
      {
        text: "Revert",
        style: "destructive",
        onPress: async () => {
          setText(manualSnapshot.current);
          await updateCoverLetter(letterId, manualSnapshot.current);
          setMode("select");
        },
      },
      {
        text: "Save changes",
        onPress: async () => {
          await updateCoverLetter(letterId, text);
          setMode("select");
        },
      },
    ]);
  };

  const copyLetter = async () => {
    await copyText(text);
    Alert.alert("Copied", "The letter was copied to your clipboard.");
  };
  const exportLetter = async () => {
    await updateCoverLetter(letterId, text);
    router.push(`/export/${letterId}`);
  };

  if (!loaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background dark:bg-dark-background">
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  const selectedStyle = { backgroundColor: colors.accent, color: "#FFFFFF" };

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background dark:bg-dark-background"
    >
      <View className="flex-1 px-8 pt-3">
        {/* Top row: round back button + mode action */}
        <View className="mb-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-highlight active:opacity-70 dark:bg-dark-highlight"
          >
            <RNText style={{ fontSize: 20, color: colors.primary, lineHeight: 22 }}>❮</RNText>
          </Pressable>
          {mode === "select" ? (
            <Pressable
              onPress={startManual}
              className="rounded-full border border-primary px-4 py-2 active:opacity-70 dark:border-dark-primary"
            >
              <Text className="font-semibold text-primary dark:text-dark-ink">✎ Edit myself</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={finishManual}
              className="rounded-full bg-primary px-4 py-2 active:opacity-80 dark:bg-dark-primary"
            >
              <Text className="font-semibold text-background dark:text-dark-background">Done</Text>
            </Pressable>
          )}
        </View>

        {/* Editable name */}
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          placeholder="Cover letter name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === "ios" ? KB_ACCESSORY_ID : undefined}
          className="mb-3 rounded-lg py-1 text-xl font-bold text-primary dark:text-dark-primary"
        />

        {mode === "select" ? (
          /* Format cycle (left) + Select all / Clear all (right) */
          <View className="mb-3 flex-row items-center">
            <Text className="mr-2 text-sm font-medium text-secondary dark:text-dark-ink">
              Format:
            </Text>
            <Pressable
              onPress={cycleFormat}
              disabled={busyAny || !profile}
              className={`flex-row items-center rounded-full border border-border px-3 py-1.5 active:opacity-70 dark:border-dark-border ${
                busyAny || !profile ? "opacity-40" : ""
              }`}
            >
              <Text className="text-sm font-medium text-primary dark:text-dark-ink">
                {LETTER_FORMATS[formatIdx].name}
              </Text>
              <Text className="ml-1 text-sm text-muted dark:text-dark-muted">⟳</Text>
            </Pressable>

            <View className="flex-1" />

            <Pressable
              onPress={selected.size > 0 ? clearSelection : selectAll}
              disabled={busyAny || sentenceIdxs.length === 0}
              className={`rounded-full bg-highlight px-3 py-1.5 active:opacity-70 dark:bg-dark-highlight ${
                busyAny || sentenceIdxs.length === 0 ? "opacity-40" : ""
              }`}
            >
              <Text className="text-sm font-semibold text-primary">
                {selected.size > 0 ? "Clear all" : "Select all"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {mode === "select" ? (
          /* ---------- SELECT (tap sentences) ---------- */
          <>
            <ScrollView className="flex-1 rounded-2xl border border-border bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
              <Text className="text-base leading-6 text-ink dark:text-dark-ink">
                {tokens.map((t, idx) =>
                  t.sentence ? (
                    <Text
                      key={idx}
                      onPress={() => toggleSentence(idx)}
                      style={selected.has(idx) ? selectedStyle : undefined}
                    >
                      {t.text}
                    </Text>
                  ) : (
                    <Text key={idx}>{t.text}</Text>
                  )
                )}
              </Text>
            </ScrollView>

            {countLine}

            {fitting ? (
              <View className="mt-3 rounded-xl border border-border p-3 dark:border-dark-border">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-primary dark:text-dark-primary">
                    {fitStatus}
                  </Text>
                  <Pressable
                    onPress={() => {
                      fitCancel.current = true;
                      setFitStatus("Cancelling…");
                    }}
                    hitSlop={10}
                    className="h-6 w-6 items-center justify-center rounded-full bg-highlight active:opacity-70 dark:bg-dark-highlight"
                  >
                    <Text className="text-primary">✕</Text>
                  </Pressable>
                </View>
                <FitBar />
              </View>
            ) : (
              <View className="mt-3">
                <EditToolbar
                  selectedCount={selected.size}
                  openCat={openCat}
                  setOpenCat={setOpenCat}
                  disabled={busyAny}
                  onSelectionAction={applyToSelected}
                  onCustom={onCustom}
                />

                <View className="mt-3">
                  <LengthLimitControl state={limit} onChange={onLimitChange} />
                  {activeLimit && overLimit ? (
                    <Pressable
                      onPress={fitLength}
                      disabled={busyAny}
                      className={`mb-1 self-start rounded-xl bg-accent px-4 py-2 active:opacity-80 ${
                        busyAny ? "opacity-40" : ""
                      }`}
                    >
                      <Text className="font-semibold text-white">
                        Fit to {activeLimit.value} {activeLimit.type === "word" ? "words" : "chars"}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            )}
          </>
        ) : (
          /* ---------- MANUAL (edit myself) ---------- */
          <>
            <TextInput
              value={text}
              onChangeText={setText}
              autoFocus
              multiline
              scrollEnabled
              textAlignVertical="top"
              placeholder="Your cover letter…"
              placeholderTextColor={colors.muted}
              inputAccessoryViewID={Platform.OS === "ios" ? KB_ACCESSORY_ID : undefined}
              className="flex-1 rounded-2xl border border-border bg-white p-4 text-base leading-6 text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
            />
            {countLine}
          </>
        )}

        {/* Bottom actions (select mode only) */}
        {mode === "select" ? (
          <View className="mb-3 mt-2 flex-row">
            <Button label="Copy" variant="ghost" onPress={copyLetter} className="mr-3 flex-1" />
            <Button label="Export" onPress={exportLetter} disabled={busyAny} className="flex-1" />
          </View>
        ) : (
          <View className="mb-3 mt-2">
            <Text className="text-center text-xs text-muted dark:text-dark-muted">
              Tap Done to save or revert your edits.
            </Text>
          </View>
        )}
      </View>

      {/* Busy overlay while an AI action runs */}
      {busy ? (
        <View className="absolute inset-0 items-center justify-center bg-black/30">
          <View className="rounded-2xl bg-white p-6 dark:bg-dark-surface">
            <ActivityIndicator color={colors.accent} size="large" />
            <Text className="mt-3 text-ink dark:text-dark-ink">Working…</Text>
          </View>
        </View>
      ) : null}

      {/* Custom-edit modal */}
      <Modal
        visible={customOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setCustomOpen(false)}
      >
        <View className="flex-1 items-center justify-center bg-black/40 px-6">
          <View className="w-full rounded-2xl bg-background p-5 dark:bg-dark-surface">
            <Text className="mb-2 text-lg font-bold text-primary dark:text-dark-primary">
              Custom edit
            </Text>
            <Text className="mb-3 text-sm text-muted dark:text-dark-muted">
              How should we rewrite the {selected.size} selected sentence
              {selected.size === 1 ? "" : "s"}?
            </Text>
            <TextInput
              value={customInstruction}
              onChangeText={setCustomInstruction}
              placeholder="e.g. Make this less detailed."
              placeholderTextColor={colors.muted}
              multiline
              inputAccessoryViewID={Platform.OS === "ios" ? KB_ACCESSORY_ID : undefined}
              className="mb-4 h-24 rounded-xl border border-border bg-white p-3 text-base text-ink dark:border-dark-border dark:bg-dark-background dark:text-dark-ink"
              style={{ textAlignVertical: "top" }}
            />
            <View className="flex-row">
              <Button
                label="Cancel"
                variant="ghost"
                onPress={() => setCustomOpen(false)}
                className="mr-3 flex-1"
              />
              <Button label="Apply" onPress={submitCustom} className="flex-1" />
            </View>
          </View>
        </View>
      </Modal>

      {/* iOS keyboard toolbar: Done to dismiss */}
      {Platform.OS === "ios" ? (
        <InputAccessoryView nativeID={KB_ACCESSORY_ID}>
          <View className="flex-row justify-end border-t border-border bg-background px-4 py-2 dark:border-dark-border dark:bg-dark-surface">
            <Pressable
              onPress={() => Keyboard.dismiss()}
              className="rounded-full bg-primary px-5 py-1.5 active:opacity-80 dark:bg-dark-primary"
            >
              <Text className="font-semibold text-background dark:text-dark-background">Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      ) : null}
    </SafeAreaView>
  );
}
