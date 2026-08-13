// Single-section onboarding step: one RepeatableEditor inside the onboarding
// scaffold. Kept as a thin wrapper so education / projects / certifications stay
// a few lines of config. (Work + Volunteer share one screen - see the combined
// experience step - and use RepeatableEditor directly.)
//
// Continue / Skip auto-save any in-progress draft first, so nothing typed is lost.

import { useRouter } from "expo-router";
import { useRef } from "react";
import { OnboardingScaffold } from "./OnboardingScaffold";
import {
  RepeatableEditor,
  type FieldDef,
  type RepeatableEditorHandle,
  type SavedEntry,
} from "./RepeatableEditor";

interface Props {
  title: string;
  subtitle?: string;
  step: number;
  total: number;
  fields: FieldDef[];
  load: (profileId: number) => Promise<SavedEntry[]>;
  add: (profileId: number, values: Record<string, string>) => Promise<number>;
  /** Enables the inline "Edit" action on added entries. */
  update?: (id: number, values: Record<string, string>) => Promise<void>;
  remove: (id: number) => Promise<void>;
  summarize: (entry: SavedEntry) => { primary: string; secondary?: string };
  nextRoute: string;
  addLabel?: string;
}

export function RepeatableSection({
  title,
  subtitle,
  step,
  total,
  fields,
  load,
  add,
  update,
  remove,
  summarize,
  nextRoute,
  addLabel,
}: Props) {
  const router = useRouter();
  const editorRef = useRef<RepeatableEditorHandle>(null);

  const goNext = async () => {
    await editorRef.current?.flush(); // save any typed-but-not-added entry
    router.push(nextRoute as any);
  };

  return (
    <OnboardingScaffold
      title={title}
      subtitle={subtitle}
      step={step}
      total={total}
      onBack={() => router.back()}
      onSkip={goNext}
      onNext={goNext}
    >
      <RepeatableEditor
        ref={editorRef}
        fields={fields}
        load={load}
        add={add}
        update={update}
        remove={remove}
        summarize={summarize}
        addLabel={addLabel}
      />
    </OnboardingScaffold>
  );
}
