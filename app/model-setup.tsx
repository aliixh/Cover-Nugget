// First-run model setup. Shown once, right after onboarding, so the on-device
// AI model downloads automatically (no button tap) - the closest a JS/Expo app
// gets to "downloaded with the app". The user can defer (e.g. on cellular) and
// grab it later from the AI Model screen.
//
// The download itself runs in the global controller (src/ai/modelDownload.ts),
// so if the user skips into the app mid-download it keeps going in the background
// and finishes with the app-wide "AI is ready" popup.
//
// A "model_setup_done" meta flag makes this appear only until the user either
// completes or skips it, so it never nags on every launch.

import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { View } from "react-native";
import { Text } from "../src/ui/serif";
import { ScreenContainer } from "../src/components/ScreenContainer";
import { Button } from "../src/components/Button";
import { ProgressBar } from "../src/components/ProgressBar";
import { Logo } from "../src/components/Logo";
import { getModelStatus } from "../src/ai/modelManager";
import {
  useModelDownload,
  startModelDownload,
  setDownloadUiFocused,
} from "../src/ai/modelDownload";
import { setMeta } from "../src/db/repositories";

export default function ModelSetup() {
  const router = useRouter();
  const dl = useModelDownload();
  const started = useRef(false);

  // Kick off the download automatically on first mount (unless already present).
  // Mark this as a download screen so the global "ready" popup stays quiet here.
  useEffect(() => {
    setDownloadUiFocused(true);
    if (!started.current) {
      started.current = true;
      (async () => {
        const status = await getModelStatus();
        if (!status.downloaded) void startModelDownload();
      })();
    }
    return () => setDownloadUiFocused(false);
  }, []);

  // Once the model is present, remember it so this screen never nags again.
  useEffect(() => {
    if (dl.status === "done") void setMeta("model_setup_done", "1");
  }, [dl.status]);

  const finish = async () => {
    await setMeta("model_setup_done", "1");
    router.replace("/home");
  };

  const downloading = dl.status === "downloading";
  const done = dl.status === "done";
  const errored = dl.status === "error";

  return (
    <ScreenContainer scroll={false}>
      <View className="flex-1 items-center justify-center">
        <Logo width={140} />
        <Text className="mt-6 text-center text-2xl font-bold text-primary dark:text-dark-primary">
          Hold on tight!
        </Text>
        <Text className="mt-2 text-center text-base text-secondary dark:text-dark-ink">
          We're setting up your assistant. This is a{" "}
          <Text className="font-semibold">one-time download</Text>. Once it's
          done, Cover Nugget is{" "}
          <Text className="font-semibold">100% free forever</Text> and runs
          completely offline and private on your device.
        </Text>

        <View className="mt-8 w-full">
          {downloading ? (
            <>
              <ProgressBar value={dl.fraction} />
              <Text className="mt-2 text-center text-sm text-muted dark:text-dark-muted">
                {Math.round(dl.fraction * 100)}%{dl.eta ? `  ·  ${dl.eta}` : ""}
              </Text>
              {dl.speed ? (
                <Text className="mt-1 text-center text-xs text-muted dark:text-dark-muted">
                  {dl.speed}
                </Text>
              ) : null}
            </>
          ) : null}

          {done ? (
            <Text className="text-center font-semibold text-secondary dark:text-dark-primary">
              ✓ Ready to go
            </Text>
          ) : null}

          {errored ? (
            <Text className="text-center text-sm text-accent">{dl.error}</Text>
          ) : null}
        </View>
      </View>

      {/* Footer actions adapt to the state. */}
      {done ? (
        <Button label="Continue" onPress={finish} />
      ) : errored ? (
        <View>
          <Button label="Try again" onPress={() => startModelDownload()} className="mb-3" />
          <Button label="Skip for now" variant="ghost" onPress={finish} />
        </View>
      ) : (
        <Button label="Skip for now, download later" variant="ghost" onPress={finish} />
      )}
    </ScreenContainer>
  );
}
