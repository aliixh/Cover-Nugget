// Onboarding Page 9: Additional Information (spec section 3) - the final step.
// Finishing saves this section, marks onboarding complete, and enters the app.

import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { OnboardingScaffold } from "../../src/components/OnboardingScaffold";
import { TextField } from "../../src/components/TextField";
import {
  getAdditional,
  getOrCreateProfile,
  saveAdditional,
} from "../../src/db/repositories";
import { useApp } from "../../src/context/AppContext";

export default function AdditionalStep() {
  const router = useRouter();
  const { refreshOnboarded } = useApp();
  const [profileId, setProfileId] = useState<number | null>(null);

  const [awards, setAwards] = useState("");
  const [publications, setPublications] = useState("");
  const [languages, setLanguages] = useState("");
  const [leadership, setLeadership] = useState("");
  const [other, setOther] = useState("");

  // Preload any previously entered values (user may navigate back and forth).
  useEffect(() => {
    (async () => {
      const id = await getOrCreateProfile();
      setProfileId(id);
      const a = await getAdditional(id);
      if (a) {
        setAwards(a.awards ?? "");
        setPublications(a.publications ?? "");
        setLanguages(a.languages ?? "");
        setLeadership(a.leadership ?? "");
        setOther(a.other ?? "");
      }
    })();
  }, []);

  const finish = async () => {
    if (profileId != null) {
      await saveAdditional(profileId, {
        awards,
        publications,
        languages,
        leadership,
        other,
      });
    }
    // Flip the onboarding gate, then hard-replace back to the entry gate, which
    // routes on to model-setup (auto-download) or the main app.
    await refreshOnboarded();
    router.replace("/");
  };

  return (
    <OnboardingScaffold
      title="Additional Information"
      subtitle="Anything else worth mentioning. All optional."
      step={7}
      total={7}
      nextLabel="Finish"
      onBack={() => router.back()}
      onSkip={finish}
      onNext={finish}
    >
      <TextField label="Awards" value={awards} onChangeText={setAwards} optional multiline />
      <TextField label="Publications" value={publications} onChangeText={setPublications} optional multiline />
      <TextField label="Languages" value={languages} onChangeText={setLanguages} optional placeholder="English, Mandarin" />
      <TextField label="Leadership experience" value={leadership} onChangeText={setLeadership} optional multiline />
      <TextField label="Other achievements" value={other} onChangeText={setOther} optional multiline />
    </OnboardingScaffold>
  );
}
