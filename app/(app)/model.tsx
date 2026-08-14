// AI Model screen: lets the user download the on-device LLM (spec §16 / Phase 4
// groundwork). The model is fetched to local storage with live progress; once
// present it runs fully offline. Downloading works in Expo Go and dev builds;
// actual inference requires the Dev Client build.

import { useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { ProgressBar } from "../../src/components/ProgressBar";
import { MODEL } from "../../src/ai/modelConfig";
import { deleteModel, getModelStatus, type ModelStatus } from "../../src/ai/modelManager";
import {
  useModelDownload,
  startModelDownload,
  resetModelDownload,
  setDownloadUiFocused,
} from "../../src/ai/modelDownload";
import { getLlamaRuntime } from "../../src/ai/runtime";

export default function ModelScreen() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const dl = useModelDownload();
  const downloading = dl.status === "downloading";

  const refresh = useCallback(async () => {
    setStatus(await getModelStatus());
  }, []);

  // Refresh the on-disk status, and mark this screen focused so the global
  // "ready" popup stays quiet here (progress is shown inline instead).
  useFocusEffect(
    useCallback(() => {
      refresh();
      setDownloadUiFocused(true);
      return () => setDownloadUiFocused(false);
    }, [refresh])
  );

  // When the background download finishes, refresh the on-disk status.
  useEffect(() => {
    if (dl.status === "done") void refresh();
  }, [dl.status, refresh]);

  const onDownload = () => {
    void startModelDownload();
  };

  const onDelete = async () => {
    Alert.alert("Delete model?", "You can download it again later.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteModel();
          resetModelDownload();
          refresh();
        },
      },
    ]);
  };

  const isWeb = Platform.OS === "web";
  const runtimeReady = getLlamaRuntime() !== null;

  return (
    <ScreenContainer>
      <Text className="mb-1 text-2xl font-bold text-primary dark:text-dark-primary">
        Your Assistant
      </Text>
      <Text className="mb-5 text-base text-secondary dark:text-dark-ink">
        Cover Nugget runs completely privately on your device. Download the model
        once and it will work fully offline! Your information will never be sent
        anywhere.
      </Text>

      <Card className="mb-5">
        <Text className="text-lg font-semibold text-ink dark:text-dark-ink">
          {MODEL.displayName}
        </Text>
        <Text className="mt-1 text-sm text-muted dark:text-dark-muted">{MODEL.formatNote}</Text>

        <View className="mt-4">
          {status?.downloaded ? (
            <Text className="mb-3 font-semibold text-secondary dark:text-dark-primary">
              ✓ Downloaded
            </Text>
          ) : (
            <Text className="mb-3 text-muted dark:text-dark-muted">Not downloaded yet</Text>
          )}

          {downloading ? (
            <View className="mb-2">
              <ProgressBar value={dl.fraction} />
              <Text className="mt-2 text-sm text-muted dark:text-dark-muted">
                Downloading… {Math.round(dl.fraction * 100)}%
                {dl.eta ? `  ·  ${dl.eta}` : ""}
                {dl.speed ? `  ·  ${dl.speed}` : ""}
              </Text>
            </View>
          ) : null}

          {dl.status === "error" ? (
            <Text className="mb-2 text-sm text-accent">{dl.error}</Text>
          ) : null}

          {isWeb ? (
            <Text className="text-sm text-accent">
              On-device download is available in the iOS/Android app, not on web.
            </Text>
          ) : status?.downloaded ? (
            <Button label="Delete model" variant="ghost" onPress={onDelete} />
          ) : (
            <Button
              label={downloading ? "Downloading…" : dl.status === "error" ? "Try again" : "Download model"}
              onPress={onDownload}
              disabled={downloading}
            />
          )}
        </View>
      </Card>

      {/* Honest note about where inference actually runs. */}
      {!isWeb && status?.downloaded && !runtimeReady ? (
        <Card>
          <Text className="text-sm text-muted dark:text-dark-muted">
            The model is downloaded. Running it needs the full Cover Nugget app
            build. In the Expo Go preview, generating and editing stay disabled.
          </Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
