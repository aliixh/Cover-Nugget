// AI Model screen: lets the user download the on-device LLM (spec §16 / Phase 4
// groundwork). The model is fetched to local storage with live progress; once
// present it runs fully offline. Downloading works in Expo Go and dev builds;
// actual inference requires the Dev Client build.

import { useFocusEffect } from "expo-router";
import { useCallback, useRef, useState } from "react";
import { Alert, Platform, View } from "react-native";
import { Text } from "../../src/ui/serif";
import { ScreenContainer } from "../../src/components/ScreenContainer";
import { Button } from "../../src/components/Button";
import { Card } from "../../src/components/Card";
import { ProgressBar } from "../../src/components/ProgressBar";
import { MODEL } from "../../src/ai/modelConfig";
import { makeEtaTracker, formatEta, formatSpeed } from "../../src/utils/downloadProgress";
import {
  deleteModel,
  downloadModel,
  getModelStatus,
  type ModelStatus,
} from "../../src/ai/modelManager";
import { getLlamaRuntime } from "../../src/ai/runtime";

function formatMB(bytes?: number): string {
  if (!bytes) return "";
  return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

export default function ModelScreen() {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [eta, setEta] = useState("");
  const [speed, setSpeed] = useState("");
  const tracker = useRef(makeEtaTracker());

  const refresh = useCallback(async () => {
    setStatus(await getModelStatus());
  }, []);

  useFocusEffect(
    useCallback(() => {
      refresh();
    }, [refresh])
  );

  const onDownload = async () => {
    setDownloading(true);
    setProgress(0);
    setEta("");
    setSpeed("");
    tracker.current.reset();
    try {
      await downloadModel((p) => {
        setProgress(p.fraction);
        const { speed, eta } = tracker.current.push(p.written, p.total, Date.now());
        setSpeed(formatSpeed(speed));
        setEta(formatEta(eta));
      });
      await refresh();
      Alert.alert("Downloaded", `${MODEL.displayName} is ready to use offline.`);
    } catch (e: any) {
      Alert.alert("Download failed", e?.message ?? "Something went wrong.");
    } finally {
      setDownloading(false);
    }
  };

  const onDelete = async () => {
    Alert.alert("Delete model?", "You can download it again later.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteModel();
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
        once (~{MODEL.approxSizeMB} MB) and it will work fully offline! Your
        information will never be sent anywhere.
      </Text>

      <Card className="mb-5">
        <Text className="text-lg font-semibold text-ink dark:text-dark-ink">
          {MODEL.displayName}
        </Text>
        <Text className="mt-1 text-sm text-muted dark:text-dark-muted">{MODEL.formatNote}</Text>
        <Text className="mt-1 text-sm text-muted dark:text-dark-muted">
          Approx. download size: ~{MODEL.approxSizeMB} MB
        </Text>

        <View className="mt-4">
          {status?.downloaded ? (
            <Text className="mb-3 font-semibold text-secondary dark:text-dark-primary">
              ✓ Downloaded {formatMB(status.sizeBytes)}
            </Text>
          ) : (
            <Text className="mb-3 text-muted dark:text-dark-muted">Not downloaded yet</Text>
          )}

          {downloading ? (
            <View className="mb-2">
              <ProgressBar value={progress} />
              <Text className="mt-2 text-sm text-muted dark:text-dark-muted">
                Downloading… {Math.round(progress * 100)}%
                {eta ? `  ·  ${eta}` : ""}
                {speed ? `  ·  ${speed}` : ""}
              </Text>
            </View>
          ) : null}

          {isWeb ? (
            <Text className="text-sm text-accent">
              On-device download is available in the iOS/Android app, not on web.
            </Text>
          ) : status?.downloaded ? (
            <Button label="Delete model" variant="ghost" onPress={onDelete} />
          ) : (
            <Button
              label={downloading ? "Downloading…" : "Download model"}
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
            build — in the Expo Go preview, generating and editing stay disabled.
          </Text>
        </Card>
      ) : null}
    </ScreenContainer>
  );
}
