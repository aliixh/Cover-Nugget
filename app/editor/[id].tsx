// Cover Letter Editor (spec §7–§11) — the core screen.
//  - Opens in a clean read-only PREVIEW with an "Edit" button on top.
//  - Edit mode: a big text area (kept large; the keyboard overlays rather than
//    shrinking it) + a compact categorized AI toolbar (Selection/Whole letter,
//    Length/Tone/Grammar/Custom).
//  - Length limit: our counter tracks length; "Fit" shortens via the model with
//    a progress bar you can cancel.
//
// When the on-device model isn't available (Expo Go), AI actions show a clear
// message; manual editing always works.

import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, Animated, InputAccessoryView, Keyboard, Modal, Platform, Pressable, ScrollView, View } from "react-native";
import { Text, TextInput } from "../../src/ui/serif";
import { SafeAreaView } from "react-native-safe-area-context";
import { Button } from "../../src/components/Button";
import { useApp } from "../../src/context/AppContext";
import { editSelection, editWholeLetter, fitToLength } from "../../src/services/coverLetter";
import { copyText } from "../../src/services/export";
import {
  getCoverLetter,
  updateCoverLetter,
  updateCoverLetterLimit,
  updateCoverLetterTitle,
} from "../../src/db/repositories";
import { coverLetterTitle } from "../../src/utils/format";
import { LengthLimitControl, type LimitState } from "../../src/components/LengthLimitControl";
import {
  EditToolbar,
  type EditScope,
  type EditCategory,
} from "../../src/components/EditToolbar";
import { countChars, countWords, withinLimit, type LengthLimit } from "../../src/utils/textStats";
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

  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [limit, setLimit] = useState<LimitState>({ enabled: false, type: "word", value: 300 });
  const [loaded, setLoaded] = useState(false);

  // Selection: keep the LAST non-empty range so actions still work after the
  // keyboard is dismissed (which visually clears the highlight).
  const [savedSel, setSavedSel] = useState<{ start: number; end: number } | null>(null);

  // Toolbar state.
  const [scope, setScope] = useState<EditScope>("selection");
  const [openCat, setOpenCat] = useState<EditCategory | null>(null);

  const [busy, setBusy] = useState(false);

  // Shorten/regenerate progress.
  const [fitting, setFitting] = useState(false);
  const [fitStatus, setFitStatus] = useState("");
  const fitCancel = useRef(false);

  // Custom-edit modal.
  const [customOpen, setCustomOpen] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [pendingSelection, setPendingSelection] = useState<{
    text: string;
    start: number;
    end: number;
  } | null>(null);

  useEffect(() => {
    (async () => {
      const letter = await getCoverLetter(letterId);
      if (letter) {
        setText(letter.content);
        setTitle(coverLetterTitle(letter));
        if (letter.limitType) {
          setLimit({ enabled: true, type: letter.limitType, value: letter.limitValue ?? 0 });
        }
      }
      setLoaded(true);
    })();
  }, [letterId]);

  const hasSelection = !!savedSel && savedSel.end > savedSel.start;
  const busyAny = busy || fitting;

  const onChangeTitle = (t: string) => {
    setTitle(t);
    if (t.trim().length > 0) void updateCoverLetterTitle(letterId, t.trim());
  };

  const spliceSelection = (start: number, end: number, replacement: string) => {
    const next = (text.slice(0, start) + replacement + text.slice(end)).replace(
      /\n{3,}/g,
      "\n\n"
    );
    setText(next);
  };

  const aiUnavailable = (e: any) => {
    Alert.alert(
      "This needs the full app",
      (e?.message ?? "This runs the on-device model.") +
        "\n\nYou can still edit the letter by typing directly.",
    );
  };

  const runSelectionAction = async (action: SelectionAction) => {
    if (!hasSelection) {
      Alert.alert("Select text first", "Highlight a sentence in the letter, then choose an action.");
      return;
    }
    const { start, end } = savedSel!;
    const selText = text.slice(start, end);
    try {
      setBusy(true);
      const replacement = await editSelection(text, selText, action);
      spliceSelection(start, end, replacement);
      setSavedSel(null);
    } catch (e: any) {
      aiUnavailable(e);
    } finally {
      setBusy(false);
    }
  };

  const runWholeAction = async (instruction: string) => {
    try {
      setBusy(true);
      const next = await editWholeLetter(text, instruction);
      setText(next);
    } catch (e: any) {
      aiUnavailable(e);
    } finally {
      setBusy(false);
    }
  };

  const onCustom = () => {
    if (scope === "selection") {
      if (!hasSelection) {
        Alert.alert("Select text first", "Highlight a sentence, then tap Custom.");
        return;
      }
      const { start, end } = savedSel!;
      setPendingSelection({ text: text.slice(start, end), start, end });
    } else {
      setPendingSelection(null);
    }
    setCustomInstruction("");
    setCustomOpen(true);
  };

  const submitCustom = async () => {
    if (customInstruction.trim().length === 0) {
      setCustomOpen(false);
      return;
    }
    setCustomOpen(false);
    try {
      setBusy(true);
      if (scope === "selection" && pendingSelection) {
        const replacement = await editSelection(
          text,
          pendingSelection.text,
          "custom",
          customInstruction.trim()
        );
        spliceSelection(pendingSelection.start, pendingSelection.end, replacement);
        setSavedSel(null);
      } else {
        const next = await editWholeLetter(text, customInstruction.trim());
        setText(next);
      }
    } catch (e: any) {
      aiUnavailable(e);
    } finally {
      setBusy(false);
      setPendingSelection(null);
    }
  };

  const save = async () => {
    await updateCoverLetter(letterId, text);
    Alert.alert("Saved", "Your letter has been saved.");
  };
  const finish = async () => {
    await updateCoverLetter(letterId, text);
    router.push(`/export/${letterId}`);
  };
  const copyLetter = async () => {
    await copyText(text);
    Alert.alert("Copied", "The letter was copied to your clipboard.");
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

  const enterEdit = async () => {
    await updateCoverLetter(letterId, text);
    setMode("edit");
  };
  const backToPreview = async () => {
    await updateCoverLetter(letterId, text);
    setMode("preview");
  };

  if (!loaded) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-background dark:bg-dark-background">
        <ActivityIndicator color={colors.accent} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      edges={["top", "left", "right"]}
      className="flex-1 bg-background dark:bg-dark-background"
    >
      {/* No KeyboardAvoidingView squeeze — the letter stays big while you
          highlight; the keyboard overlays the bottom (use "Done" to dismiss). */}
      <View className="flex-1 px-8 pt-3">
        {/* Top row: round back button + primary action */}
        <View className="mb-2 flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            hitSlop={10}
            className="h-10 w-10 items-center justify-center rounded-full bg-highlight active:opacity-70 dark:bg-dark-highlight"
          >
            <Text className="text-xl text-primary">←</Text>
          </Pressable>
          {mode === "preview" ? (
            <Pressable
              onPress={enterEdit}
              className="rounded-full bg-primary px-4 py-2 active:opacity-80 dark:bg-dark-primary"
            >
              <Text className="font-semibold text-background dark:text-dark-background">Edit</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={backToPreview}
              className="rounded-full border border-primary px-4 py-2 active:opacity-70 dark:border-dark-primary"
            >
              <Text className="font-semibold text-primary dark:text-dark-ink">Done</Text>
            </Pressable>
          )}
        </View>

        {/* Editable name on its own row */}
        <TextInput
          value={title}
          onChangeText={onChangeTitle}
          editable={mode === "edit"}
          placeholder="Cover letter name"
          placeholderTextColor={colors.muted}
          returnKeyType="done"
          inputAccessoryViewID={Platform.OS === "ios" ? KB_ACCESSORY_ID : undefined}
          className="mb-3 rounded-lg py-1 text-xl font-bold text-primary dark:text-dark-primary"
        />

        {mode === "preview" ? (
          /* ---------- PREVIEW ---------- */
          <ScrollView className="flex-1 rounded-2xl border border-border bg-white p-4 dark:border-dark-border dark:bg-dark-surface">
            <Text className="text-base leading-6 text-ink dark:text-dark-ink">{text}</Text>
          </ScrollView>
        ) : (
          /* ---------- EDIT ---------- */
          <>
            <TextInput
              value={text}
              onChangeText={setText}
              onSelectionChange={(e) => {
                const s = e.nativeEvent.selection;
                if (s.end > s.start) setSavedSel({ start: s.start, end: s.end });
              }}
              multiline
              scrollEnabled
              textAlignVertical="top"
              placeholder="Your cover letter…"
              placeholderTextColor={colors.muted}
              inputAccessoryViewID={Platform.OS === "ios" ? KB_ACCESSORY_ID : undefined}
              className="flex-1 rounded-2xl border border-border bg-white p-4 text-base leading-6 text-ink dark:border-dark-border dark:bg-dark-surface dark:text-dark-ink"
            />

            {/* Shorten/regenerate progress OR the compact edit toolbar */}
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
                  scope={scope}
                  setScope={setScope}
                  openCat={openCat}
                  setOpenCat={setOpenCat}
                  hasSelection={hasSelection}
                  disabled={busyAny}
                  onSelectionAction={runSelectionAction}
                  onWholeAction={runWholeAction}
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
        )}

        {/* Always-on word / char count (our own counter) */}
        <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
          {words} words · {chars} chars
          {activeLimit
            ? overLimit
              ? `  ·  over ${activeLimit.value} ${activeLimit.type === "word" ? "word" : "char"} limit`
              : `  ·  within ${activeLimit.value} ${activeLimit.type === "word" ? "word" : "char"} limit`
            : ""}
        </Text>

        {/* Bottom actions */}
        <View className="mb-3 mt-2 flex-row">
          {mode === "edit" ? (
            <Button label="Save" variant="ghost" onPress={save} disabled={busyAny} className="mr-3 flex-1" />
          ) : (
            <Button label="Copy" variant="ghost" onPress={copyLetter} className="mr-3 flex-1" />
          )}
          <Button label="Export" onPress={finish} disabled={busyAny} className="flex-1" />
        </View>
      </View>

      {/* Busy overlay while a single AI action runs */}
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
              {scope === "selection"
                ? "How should we rewrite the highlighted text?"
                : "How should we rewrite the whole letter?"}
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
