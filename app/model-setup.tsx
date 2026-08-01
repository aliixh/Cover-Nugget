// First-run model setup. Shown once, right after onboarding, so the on-device
// AI model downloads automatically (no button tap) — the closest a JS/Expo app
// gets to "downloaded with the app". The user can defer (e.g. on cellular) and
// grab it later from the AI Model screen.
//
// A "model_setup_done" meta flag makes this appear only until the user either
// completes or skips it, so it never nags on every launch.

import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { Text } from "../src/ui/serif";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Button } from "../src/components/Button";
import { ProgressBar } from "../src/components/ProgressBar";
import { Logo } from "../src/components/Logo";
import { MODEL } from "../src/ai/modelConfig";
import { downloadModel, getModelStatus } from "../src/ai/modelManager";
import { setMeta } from "../src/db/repositories";

type Phase = "idle" | "downloading" | "done" | "error";

export default function ModelSetup() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false); // guard against double-start in strict mode

  // Kick off the download automatically on mount.
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    (async () => {
      const status = await getModelStatus();
      if (status.downloaded) {
        setPhase("done");
        return;
      }
      await runDownload();
    })();
  }, []);

  const runDownload = async () => {
    setPhase("downloading");
    setError(null);
    setProgress(0);
    try {
      await downloadModel((f) => setProgress(f));
      await setMeta("model_setup_done", "1");
      setPhase("done");
    } catch (e: any) {
      setError(e?.message ?? "Download failed.");
      setPhase("error");
    }
  };

  // Mark setup handled and enter the app.
  const finish = async () => {
    await setMeta("model_setup_done", "1");
    router.replace("/home");
  };

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 items-center justify-center">
        <Logo width={140} />
        <Text className="mt-6 text-center text-2xl font-bold text-primary dark:text-dark-primary">
          Hold on tight!
        </Text>
        <Text className="mt-2 text-center text-base text-secondary dark:text-dark-ink">
          We're setting up your assistant. This is a{" "}
          <Text className="font-semibold">one-time download</Text> (~
          {MODEL.approxSizeMB} MB) — once it's done, Cover Nugget is{" "}
          <Text className="font-semibold">100% free forever</Text> and runs
          completely offline and private on your device.
        </Text>

        <View className="mt-8 w-full">
          {phase === "downloading" ? (
            <>
              <ProgressBar value={progress} />
              <Text className="mt-2 text-center text-sm text-muted dark:text-dark-muted">
                {Math.round(progress * 100)}%
              </Text>
            </>
          ) : null}

          {phase === "done" ? (
            <Text className="text-center font-semibold text-secondary dark:text-dark-primary">
              ✓ Ready to go
            </Text>
          ) : null}

          {phase === "error" ? (
            <Text className="text-center text-sm text-accent">{error}</Text>
          ) : null}
        </View>
      </View>

      {/* Footer actions adapt to the phase. */}
      {phase === "done" ? (
        <Button label="Continue" onPress={finish} />
      ) : phase === "error" ? (
        <View>
          <Button label="Try again" onPress={runDownload} className="mb-3" />
          <Button label="Skip for now" variant="ghost" onPress={finish} />
        </View>
      ) : (
        <Button label="Skip for now — download later" variant="ghost" onPress={finish} />
      )}
    </ScreenContainer>
  );
}
