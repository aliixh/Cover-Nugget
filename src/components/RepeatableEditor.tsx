// A reusable editor for sections with MANY entries (education, experience,
// volunteer, projects, certifications).
//
// Two behaviours, one component:
//  - Onboarding (editable=false): existing entries show as compact cards you
//    can remove; a form at the bottom + "Add another" appends a new entry.
//  - Profile (editable=true): every existing entry is shown as an inline form
//    you can edit; edits save immediately (persisted forever until changed).
//
// In BOTH modes, whatever is typed in the bottom "new entry" form is auto-saved
// when the screen navigates away (via the imperative `flush()` handle) — so a
// user who types an entry and taps Continue without tapping "Add" never loses
// it. This is the fix for "the add button removes what I typed and saves nothing".

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { Pressable, View } from "react-native";
import { Text } from "../ui/serif";
import { TextField } from "./TextField";
import { Card } from "./Card";
import { SaveButton } from "./SaveButton";
import { getOrCreateProfile } from "../db/repositories";

export interface FieldDef {
  key: string;
  label: string;
  multiline?: boolean;
  placeholder?: string;
}

export interface SavedEntry {
  id: number;
  [key: string]: any;
}

export interface RepeatableEditorHandle {
  /** Persist the in-progress draft if it has content. Call before navigating. */
  flush: () => Promise<void>;
}

interface Props {
  /** Optional section heading (used when several editors share one screen). */
  heading?: string;
  fields: FieldDef[];
  load: (profileId: number) => Promise<SavedEntry[]>;
  add: (profileId: number, values: Record<string, string>) => Promise<number>;
  /** Required for editable mode; edits existing entries in place. */
  update?: (id: number, values: Record<string, string>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  summarize: (entry: SavedEntry) => { primary: string; secondary?: string };
  addLabel?: string;
  /** true = inline-edit existing entries (Profile); false = compact cards. */
  editable?: boolean;
  /** Provide a known profile id, or let the editor resolve the single profile. */
  profileId?: number | null;
}

function emptyDraft(fields: FieldDef[]): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, ""]));
}

function valuesOf(fields: FieldDef[], entry: SavedEntry): Record<string, string> {
  return Object.fromEntries(fields.map((f) => [f.key, String(entry[f.key] ?? "")]));
}

export const RepeatableEditor = forwardRef<RepeatableEditorHandle, Props>(
  function RepeatableEditor(
    {
      heading,
      fields,
      load,
      add,
      update,
      remove,
      summarize,
      addLabel = "+ Add another",
      editable = false,
      profileId = null,
    },
    ref
  ) {
    const [pid, setPid] = useState<number | null>(profileId);
    const [entries, setEntries] = useState<SavedEntry[]>([]);
    const [draft, setDraft] = useState<Record<string, string>>(emptyDraft(fields));

    // Negative ids mark unsaved (blank) entries not yet in the DB.
    const tempIdRef = useRef(-1);
    const blankEntry = (): SavedEntry => ({ id: tempIdRef.current--, ...emptyDraft(fields) });
    const hasContent = (e: SavedEntry) =>
      fields.some((f) => String(e[f.key] ?? "").trim().length > 0);

    const ensureProfile = async (): Promise<number> => {
      if (pid != null) return pid;
      const id = await getOrCreateProfile();
      setPid(id);
      return id;
    };

    useEffect(() => {
      (async () => {
        const id = profileId ?? (await getOrCreateProfile());
        setPid(id);
        const loaded = await load(id);
        // Editable (Profile): always show at least one form so tabs aren't empty.
        setEntries(editable && loaded.length === 0 ? [blankEntry()] : loaded);
      })();
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [profileId]);

    const hasDraftContent = Object.values(draft).some((v) => v.trim().length > 0);

    const commitDraft = async () => {
      if (!hasDraftContent) return;
      const id = await ensureProfile();
      await add(id, draft);
      setDraft(emptyDraft(fields));
      setEntries(await load(id));
    };

    useImperativeHandle(ref, () => ({ flush: commitDraft }), [draft, hasDraftContent, pid]);

    // Editable mode: append a blank form locally (no DB write until Save).
    const addBlank = () => setEntries((prev) => [...prev, blankEntry()]);

    const onRemove = async (id: number) => {
      if (id > 0) await remove(id);
      setEntries((prev) => {
        const next = prev.filter((e) => e.id !== id);
        return editable && next.length === 0 ? [blankEntry()] : next;
      });
    };

    // Inline edit updates LOCAL state only; persisted when the user taps Save.
    const onEditField = (entry: SavedEntry, key: string, text: string) => {
      setEntries((prev) =>
        prev.map((e) => (e.id === entry.id ? { ...e, [key]: text } : e))
      );
    };

    // Persist all entries: update existing (id>0), insert new blanks with content.
    const saveAll = async (): Promise<boolean> => {
      const id = await ensureProfile();
      for (const e of entries) {
        if (!hasContent(e)) continue;
        if (e.id > 0) {
          if (update) await update(e.id, valuesOf(fields, e));
        } else {
          await add(id, valuesOf(fields, e));
        }
      }
      const reloaded = await load(id);
      setEntries(reloaded.length === 0 ? [blankEntry()] : reloaded);
      return true;
    };

    // ----- Editable mode (Profile): each entry is an inline form; no draft -----
    if (editable) {
      return (
        <View>
          {heading ? (
            <Text className="mb-3 text-lg font-semibold text-primary dark:text-dark-primary">
              {heading}
            </Text>
          ) : null}

          {entries.map((e) => (
            <Card key={e.id} className="mb-3">
              {fields.map((f) => (
                <TextField
                  key={f.key}
                  label={f.label}
                  optional
                  placeholder={f.placeholder}
                  multiline={f.multiline}
                  value={String(e[f.key] ?? "")}
                  onChangeText={(t) => onEditField(e, f.key, t)}
                />
              ))}
              <Pressable
                onPress={() => onRemove(e.id)}
                className="self-start rounded-full bg-highlight px-3 py-1 active:opacity-70 dark:bg-dark-highlight"
              >
                <Text className="text-primary">Remove</Text>
              </Pressable>
            </Card>
          ))}

          <Pressable
            onPress={addBlank}
            className="mt-1 self-start rounded-xl border border-primary px-4 py-2 active:opacity-70 dark:border-dark-primary"
          >
            <Text className="font-semibold text-primary dark:text-dark-primary">
              {addLabel}
            </Text>
          </Pressable>

          <SaveButton onSave={saveAll} className="mt-4" />
        </View>
      );
    }

    // ----- Onboarding mode: summary cards + one draft form to add entries -----
    return (
      <View>
        {heading ? (
          <Text className="mb-3 text-lg font-semibold text-primary dark:text-dark-primary">
            {heading}
          </Text>
        ) : null}

        {entries.length > 0 ? (
          <View className="mb-5">
            <Text className="mb-2 text-sm font-medium text-muted dark:text-dark-muted">
              Added ({entries.length})
            </Text>
            {entries.map((e) => (
              <Card
                key={e.id}
                className="mb-2 flex-row items-center justify-between"
              >
                <View className="flex-1 pr-3">
                  <Text className="text-base font-semibold text-ink dark:text-dark-ink">
                    {summarize(e).primary || "Untitled"}
                  </Text>
                  {summarize(e).secondary ? (
                    <Text className="text-sm text-muted dark:text-dark-muted">
                      {summarize(e).secondary}
                    </Text>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => onRemove(e.id)}
                  className="rounded-full bg-highlight px-3 py-1 active:opacity-70 dark:bg-dark-highlight"
                >
                  <Text className="text-primary">Remove</Text>
                </Pressable>
              </Card>
            ))}
          </View>
        ) : null}

        {fields.map((f) => (
          <TextField
            key={f.key}
            label={f.label}
            optional
            placeholder={f.placeholder}
            multiline={f.multiline}
            value={draft[f.key]}
            onChangeText={(t) => setDraft((d) => ({ ...d, [f.key]: t }))}
          />
        ))}

        <Pressable
          onPress={commitDraft}
          disabled={!hasDraftContent}
          className={`mt-1 self-start rounded-xl border border-primary px-4 py-2 active:opacity-70 dark:border-dark-primary ${
            hasDraftContent ? "" : "opacity-40"
          }`}
        >
          <Text className="font-semibold text-primary dark:text-dark-primary">
            {addLabel}
          </Text>
        </Pressable>
      </View>
    );
  }
);
