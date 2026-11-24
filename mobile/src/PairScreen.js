// First screen: connect the phone to Tia on the computer by scanning the QR code on the big screen.
import { useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import { SafeAreaView } from "react-native-safe-area-context";
import Orb from "./Orb";
import { Btn } from "./Card";
import { api, parsePairCode, savePair } from "./api";
import { C } from "./theme";

export default function PairScreen({ onPaired }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function tryPair(raw) {
    const pair = parsePairCode(raw);
    if (!pair) return setError("That isn't a Tia code. Scan the QR code on Tia's screen (Connect phone).");
    setBusy(true);
    setError("");
    try {
      const hello = await api.hello(pair);
      await savePair({ ...pair, business: hello.business, owner: hello.owner });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      onPaired({ ...pair, business: hello.business, owner: hello.owner });
    } catch (e) {
      setScanning(false);
      setError(
        e.unpaired
          ? "The code is old. Open Connect phone on Tia's screen and scan the new one."
          : `Can't reach Tia at ${pair.url}. The phone and the computer must be on the same Wi-Fi (or the phone's hotspot).`
      );
    } finally {
      setBusy(false);
    }
  }

  async function startScan() {
    setError("");
    if (!permission?.granted) {
      const p = await requestPermission();
      if (!p.granted) return setError("Camera access is needed to scan the code. You can paste the code instead.");
    }
    setScanning(true);
  }

  if (scanning) {
    return (
      <View style={styles.fill}>
        <CameraView
          style={StyleSheet.absoluteFill}
          facing="back"
          barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
          onBarcodeScanned={busy ? undefined : ({ data }) => tryPair(data)}
        />
        <SafeAreaView style={styles.scanOverlay}>
          <Text style={styles.scanTitle}>Point at the QR code on Tia's screen</Text>
          <View style={styles.frame} />
          {busy ? <ActivityIndicator color="#fff" /> : <Btn label="Cancel" onPress={() => setScanning(false)} />}
        </SafeAreaView>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.fill}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <Orb mode="idle" size={120} />
        <Text style={styles.title}>Hi, I'm Tia.</Text>
        <Text style={styles.lead}>Your secretary lives on your computer. Connect this phone and you can talk to me from anywhere in the office.</Text>

        <View style={styles.steps}>
          <Text style={styles.step}>1  On the big screen, press Connect phone</Text>
          <Text style={styles.step}>2  Scan the code with this phone</Text>
        </View>

        <Btn label={busy ? "Connecting…" : "Scan the code"} tone="accent" onPress={startScan} disabled={busy} style={styles.primary} />
        {!!error && <Text style={styles.error}>{error}</Text>}

        {manual ? (
          <View style={styles.manual}>
            <TextInput
              value={code}
              onChangeText={setCode}
              placeholder="tia:http://192.168.…?t=…"
              placeholderTextColor={C.faint}
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.input}
            />
            <Btn label="Connect" onPress={() => tryPair(code)} disabled={busy || !code} />
          </View>
        ) : (
          <Pressable onPress={() => setManual(true)} hitSlop={10}>
            <Text style={styles.link}>No camera? Paste the code instead</Text>
          </Pressable>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: 28 },
  title: { color: C.text, fontSize: 30, fontWeight: "700", letterSpacing: -0.5, marginTop: 4 },
  lead: { color: C.muted, fontSize: 15.5, lineHeight: 22, textAlign: "center", marginTop: 10, maxWidth: 340 },
  steps: { marginTop: 26, marginBottom: 22, alignSelf: "stretch", backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.line, padding: 16, gap: 10 },
  step: { color: "#D7D2DF", fontSize: 14.5 },
  primary: { alignSelf: "stretch", paddingVertical: 15 },
  error: { color: C.warn, fontSize: 13.5, lineHeight: 19, textAlign: "center", marginTop: 14 },
  link: { color: C.accent, fontSize: 14, marginTop: 18 },
  manual: { alignSelf: "stretch", marginTop: 16, gap: 8 },
  input: { backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: 12, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  scanOverlay: { flex: 1, alignItems: "center", justifyContent: "space-between", paddingVertical: 40 },
  scanTitle: { color: "#fff", fontSize: 17, fontWeight: "600", backgroundColor: "rgba(0,0,0,0.55)", paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, overflow: "hidden" },
  frame: { width: 240, height: 240, borderRadius: 28, borderWidth: 3, borderColor: "rgba(255,255,255,0.9)" },
});
