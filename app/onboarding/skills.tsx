// Onboarding Page 7: Skills (spec section 3). Tag-style add/remove, each
// persisted immediately.

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { OnboardingScaffold } from "../../src/components/OnboardingScaffold";
import { TagInput } from "../../src/components/TagInput";
import {
  addSkill,
  getOrCreateProfile,
  listSkills,
  removeSkill,
} from "../../src/db/repositories";
import type { Skill } from "../../src/types/models";

export default function SkillsStep() {
  const router = useRouter();
  const [profileId, setProfileId] = useState<number | null>(null);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    (async () => {
      const id = await getOrCreateProfile();
      setProfileId(id);
      setSkills(await listSkills(id));
    })();
  }, []);

  const onAdd = async (tag: string) => {
    if (profileId == null) return;
    await addSkill(profileId, tag);
    setSkills(await listSkills(profileId));
  };

  const onRemove = async (index: number) => {
    const skill = skills[index];
    if (!skill || profileId == null) return;
    await removeSkill(skill.id);
    setSkills(await listSkills(profileId));
  };

  const goNext = () => router.push("/onboarding/certifications");

  return (
    <OnboardingScaffold
      title="Skills"
      subtitle="Add skills as tags. Tap a tag to remove it."
      step={5}
      total={7}
      onBack={() => router.back()}
      onSkip={goNext}
      onNext={goNext}
    >
      <TagInput
        tags={skills.map((s) => s.skill)}
        onAdd={onAdd}
        onRemove={onRemove}
        placeholder="e.g. React, Python, SQL"
      />
    </OnboardingScaffold>
  );
}
