// The main phone screen: hold the button and talk to Tia, hear her answer, approve what she prepared.
// Everything here is a live mirror of Tia's desk on the computer.
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useAudioRecorder, RecordingPresets, requestRecordingPermissionsAsync, getRecordingPermissionsAsync, setAudioModeAsync } from "expo-audio";
import * as Speech from "expo-speech";
import * as Haptics from "expo-haptics";
import Orb from "./Orb";
import Card, { Btn } from "./Card";
import { api, useDesk, forgetPair } from "./api";
import { C } from "./theme";

const SUGGESTIONS = ["Prepare Ieva's kitchen offer", "What needs me today?", "Order the team lunch"];

export default function HomeScreen({ pair, onUnpair }) {
  const insets = useSafeAreaInsets();
  const { desk, online } = useDesk(pair, onUnpair);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [mode, setMode] = useState("idle"); // idle | listening | thinking | speaking
  const [caption, setCaption] = useState("Hold the button and tell me what you need.");
  const [heard, setHeard] = useState("");
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState("");
  const [voiceOn, setVoiceOn] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showDone, setShowDone] = useState(false);
  const [menu, setMenu] = useState(false);
  const rec = useRef({ starting: null, startedAt: 0, active: false });
  const seenNeeds = useRef(null);

  // Buzz when something new needs the owner (urgent = strong buzz). Handled work never buzzes.
  useEffect(() => {
    if (!desk) return;
    const ids = new Set(desk.needs.map((c) => c.id));
    if (seenNeeds.current) {
      const fresh = desk.needs.filter((c) => !seenNeeds.current.has(c.id));
      if (fresh.some((c) => c.urgent)) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      else if (fresh.length) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    seenNeeds.current = ids;
  }, [desk && desk.version]);

  // When the big screen or the inbox run makes Tia say something, show it here too (spoken only for this phone's own requests).
  useEffect(() => {
    if (!desk || mode !== "idle") return;
    const last = [...desk.feed].reverse().find((f) => f.who === "tia");
    if (last) setCaption(last.text);
    const asked = [...desk.feed].reverse().find((f) => f.who === "owner");
    setHeard(asked ? asked.text : "");
  }, [desk && desk.version]);

  function speak(line) {
    setCaption(line);
    if (!voiceOn || !line) return setMode("idle");
    Speech.stop();
    setMode("speaking");
    Speech.speak(line, {
      language: "en-US",
      rate: 1.0,
      pitch: 1.05,
      onDone: () => setMode("idle"),
      onStopped: () => setMode("idle"),
      onError: () => setMode("idle"),
    });
  }

  async function handleReply(res) {
    if (res.transcript) setHeard(res.transcript); // typed requests keep the words the owner typed
    if (res.item) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    speak(res.say || "Done.");
  }

  // ---------- hold to talk ----------
  async function startTalking() {
    if (mode === "thinking") return;
    Speech.stop();
    rec.current.active = true;
    rec.current.starting = (async () => {
      let perm = await getRecordingPermissionsAsync();
      if (!perm.granted) {
        perm = await requestRecordingPermissionsAsync();
        rec.current.active = false; // the permission popup interrupted the hold – ask to hold again
        if (!perm.granted) Alert.alert("Microphone", "Tia needs the microphone to hear you. You can type instead.");
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      await recorder.prepareToRecordAsync();
      recorder.record();
      rec.current.startedAt = Date.now();
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      setHeard("");
      setMode("listening");
      setCaption("Listening…");
      return true;
    })().catch((e) => {
      setCaption(`I couldn't start the microphone (${e.message}).`);
      return false;
    });
  }

  async function stopTalking() {
    const started = await rec.current.starting;
    if (!started || !rec.current.active) return;
    rec.current.active = false;
    const held = Date.now() - rec.current.startedAt;
    try {
      await recorder.stop();
    } catch {}
    await setAudioModeAsync({ allowsRecording: false, playsInSilentMode: true }).catch(() => {});
    if (held < 600) {
      setMode("idle");
      return setCaption("Hold the button while you talk, then let go.");
    }
    const uri = recorder.uri;
    if (!uri) {
      setMode("idle");
      return setCaption("I didn't get any sound. Try again?");
    }
    setMode("thinking");
    setCaption("One moment…");
    try {
      handleReply(await api.voice(pair, uri));
    } catch (e) {
      setMode("idle");
      setCaption(`I couldn't reach the computer. ${e.message}`);
    }
  }

  async function send(t) {
    const line = (t ?? text).trim();
    if (!line || mode === "thinking") return;
    setText("");
    setHeard(line);
    setMode("thinking");
    setCaption("One moment…");
    try {
      handleReply(await api.say(pair, line));
    } catch (e) {
      setMode("idle");
      setCaption(`I couldn't reach the computer. ${e.message}`);
    }
  }

  // ---------- decisions ----------
  async function decide(card, verdict, editedText) {
    setBusyId(card.id);
    try {
      const res = await api.decide(pair, card.id, verdict, editedText);
      Haptics.notificationAsync(verdict === "reject" ? Haptics.NotificationFeedbackType.Warning : Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (res.say) speak(res.say);
    } catch (e) {
      setCaption(e.message);
    } finally {
      setBusyId(null);
    }
  }

  const tiaMode = mode !== "idle" ? mode : desk && (desk.thinking || desk.run.running) ? "thinking" : "idle";
  const status = !online ? { label: "Offline", color: C.danger } : desk && desk.mode === "scripted" ? { label: "Demo script", color: C.warn } : { label: "Live", color: C.ok };
  const needs = desk ? desk.needs : [];
  const done = desk ? desk.done : [];
  const neverRan = desk && !desk.run.running && !desk.run.total;
  const dockHeight = 196 + insets.bottom;

  return (
    <SafeAreaView style={styles.fill} edges={["top"]}>
      <View style={styles.top}>
        <View>
          <Text style={styles.brand}>Tia</Text>
          <Text style={styles.business}>{pair.business || "Your business"}</Text>
        </View>
        <View style={styles.topRight}>
          <View style={styles.pill}>
            <View style={[styles.pillDot, { backgroundColor: status.color }]} />
            <Text style={styles.pillText}>{status.label}</Text>
          </View>
          <Pressable onPress={() => setMenu(true)} hitSlop={12} style={styles.menuBtn} accessibilityLabel="Menu">
            <Text style={styles.menuDots}>•••</Text>
          </Pressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: dockHeight + 16 }} showsVerticalScrollIndicator={false}>
        <View style={styles.hero}>
          <Orb mode={tiaMode} size={132} />
          {mode === "listening" && <Text style={styles.rec}>●  Listening · nothing is saved</Text>}
          {!!heard && mode !== "listening" && <Text style={styles.heard}>“{heard}”</Text>}
          <Text style={styles.caption}>{caption}</Text>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHead}>
            <Text style={styles.sectionTitle}>Needs you</Text>
            <Text style={styles.count}>{needs.length}</Text>
            {desk && desk.run.running && (
              <Text style={styles.progress}>
                Reading inbox {desk.run.done}/{desk.run.total}
              </Text>
            )}
          </View>

          {!desk && <ActivityIndicator color={C.accent} style={{ marginTop: 20 }} />}
          {desk && needs.length === 0 && (
            <View style={styles.empty}>
              <Text style={styles.emptyText}>
                {neverRan ? "I haven't been through today's inbox yet." : desk.run.running ? "Working through the inbox…" : "Nothing needs you. I've handled the rest."}
              </Text>
              {neverRan && <Btn label="Start the day" tone="accent" onPress={() => api.run(pair).catch((e) => setCaption(e.message))} style={{ marginTop: 12 }} />}
            </View>
          )}
          {needs.map((c) => (
            <Card key={c.id} card={c} busy={busyId === c.id} onDecide={decide} onEdit={setEditing} defaultOpen={c.kind !== "message"} />
          ))}
        </View>

        {done.length > 0 && (
          <View style={styles.section}>
            <Pressable onPress={() => setShowDone((s) => !s)} style={styles.sectionHead} hitSlop={8}>
              <Text style={styles.sectionTitle}>Done</Text>
              <Text style={styles.count}>{done.length}</Text>
              <Text style={styles.progress}>
                {desk.stats.minutes} min saved · {showDone ? "hide" : "show"}
              </Text>
            </Pressable>
            {showDone && done.map((c) => <Card key={c.id} card={c} />)}
          </View>
        )}
      </ScrollView>

      {/* ---------- dock: suggestions + hold to talk ---------- */}
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={[styles.dock, { paddingBottom: insets.bottom + 14 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips} keyboardShouldPersistTaps="handled">
          {SUGGESTIONS.map((s) => (
            <Pressable key={s} onPress={() => send(s)} style={({ pressed }) => [styles.chip, pressed && { opacity: 0.7 }]}>
              <Text style={styles.chipText}>{s}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {typing ? (
          <View style={styles.typeRow}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Tell Tia what you need…"
              placeholderTextColor={C.faint}
              style={styles.typeInput}
              autoFocus
              returnKeyType="send"
              onSubmitEditing={() => send()}
            />
            <Btn label="Send" tone="accent" onPress={() => send()} disabled={!text.trim() || mode === "thinking"} />
            <Pressable onPress={() => setTyping(false)} hitSlop={10} style={styles.sideBtn}>
              <Text style={styles.sideIcon}>🎙</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.talkRow}>
            <Pressable onPress={() => setTyping(true)} style={styles.sideBtn} hitSlop={10} accessibilityLabel="Type instead">
              <Text style={styles.sideIcon}>⌨</Text>
            </Pressable>
            <Pressable
              onPressIn={startTalking}
              onPressOut={stopTalking}
              disabled={mode === "thinking"}
              style={({ pressed }) => [styles.mic, (pressed || mode === "listening") && styles.micOn, mode === "thinking" && { opacity: 0.5 }]}
              accessibilityRole="button"
              accessibilityLabel="Hold to talk to Tia"
            >
              {mode === "thinking" ? <ActivityIndicator color="#120E1C" /> : <View style={[styles.micGlyph, mode === "listening" && styles.micGlyphOn]} />}
            </Pressable>
            <Pressable onPress={() => setVoiceOn((v) => !v)} style={styles.sideBtn} hitSlop={10} accessibilityLabel={voiceOn ? "Mute Tia" : "Unmute Tia"}>
              <Text style={styles.sideIcon}>{voiceOn ? "🔊" : "🔇"}</Text>
            </Pressable>
          </View>
        )}
        {!typing && <Text style={styles.hint}>{mode === "listening" ? "Let go when you're done" : "Hold to talk"}</Text>}
      </KeyboardAvoidingView>

      {/* ---------- edit a draft ---------- */}
      <Modal visible={!!editing} animationType="slide" transparent onRequestClose={() => setEditing(null)}>
        <EditSheet
          card={editing}
          onCancel={() => setEditing(null)}
          onSave={(t) => {
            const c = editing;
            setEditing(null);
            decide(c, "edit", t);
          }}
        />
      </Modal>

      {/* ---------- menu ---------- */}
      <Modal visible={menu} animationType="fade" transparent onRequestClose={() => setMenu(false)}>
        <Pressable style={styles.backdrop} onPress={() => setMenu(false)}>
          <View style={[styles.sheet, { paddingBottom: insets.bottom + 18 }]}>
            <Text style={styles.sheetTitle}>Connected to {pair.url.replace("http://", "")}</Text>
            <Btn
              label="Reset the demo"
              onPress={() => {
                setMenu(false);
                Alert.alert("Reset the demo?", "Clears today's desk and what Tia learned, for the next visitor.", [
                  { text: "Cancel", style: "cancel" },
                  { text: "Reset", style: "destructive", onPress: () => api.reset(pair).then(() => { setHeard(""); setCaption("Fresh start. Hold the button and tell me what you need."); }).catch((e) => setCaption(e.message)) },
                ]);
              }}
            />
            <Btn
              label="Disconnect this phone"
              tone="ghost"
              onPress={async () => {
                setMenu(false);
                await forgetPair();
                onUnpair();
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function EditSheet({ card, onCancel, onSave }) {
  const [value, setValue] = useState(card ? card.text : "");
  useEffect(() => setValue(card ? card.text : ""), [card && card.id]);
  if (!card) return null;
  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.backdrop}>
      <View style={[styles.sheet, { paddingBottom: 28 }]}>
        <Text style={styles.sheetTitle}>Edit before it goes to {card.from}</Text>
        <TextInput value={value} onChangeText={setValue} multiline style={styles.editInput} textAlignVertical="top" />
        <Text style={styles.editHint}>Tia saves your version as a rule and writes like this next time.</Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          <Btn label="Cancel" tone="ghost" onPress={onCancel} />
          <Btn label="Save & send" tone="ok" onPress={() => onSave(value)} disabled={!value.trim()} style={{ flex: 1 }} />
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: C.bg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 6, paddingBottom: 4 },
  brand: { color: C.text, fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  business: { color: C.muted, fontSize: 13 },
  topRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  pill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: C.line, borderRadius: 99, paddingHorizontal: 10, paddingVertical: 5 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { color: C.muted, fontSize: 12, fontWeight: "600" },
  menuBtn: { paddingHorizontal: 6, paddingVertical: 4 },
  menuDots: { color: C.muted, fontSize: 14, letterSpacing: 1 },
  hero: { alignItems: "center", paddingHorizontal: 28, paddingBottom: 18 },
  rec: { color: "#F08A8A", fontSize: 12.5, fontWeight: "700", letterSpacing: 0.3, marginBottom: 6 },
  heard: { color: C.muted, fontSize: 14, fontStyle: "italic", textAlign: "center", marginBottom: 6 },
  caption: { color: C.text, fontSize: 19, lineHeight: 26, fontWeight: "500", textAlign: "center", maxWidth: 360 },
  section: { paddingHorizontal: 16, marginTop: 8 },
  sectionHead: { flexDirection: "row", alignItems: "baseline", gap: 8, paddingHorizontal: 4, marginBottom: 10 },
  sectionTitle: { color: C.text, fontSize: 17, fontWeight: "700" },
  count: { color: C.accent, fontSize: 15, fontWeight: "700" },
  progress: { color: C.faint, fontSize: 12.5, marginLeft: "auto" },
  empty: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, padding: 18, alignItems: "flex-start" },
  emptyText: { color: C.muted, fontSize: 14.5, lineHeight: 20 },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.line, paddingTop: 12 },
  chips: { paddingHorizontal: 16, gap: 8 },
  chip: { borderWidth: 1, borderColor: C.lineStrong, backgroundColor: C.surface, borderRadius: 99, paddingHorizontal: 14, paddingVertical: 9 },
  chipText: { color: "#DAD5E3", fontSize: 13.5 },
  talkRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 40, marginTop: 14 },
  sideBtn: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center", backgroundColor: C.surface, borderWidth: 1, borderColor: C.line },
  sideIcon: { fontSize: 19, color: C.text },
  mic: { width: 84, height: 84, borderRadius: 42, backgroundColor: C.accent, alignItems: "center", justifyContent: "center", shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 18, elevation: 8 },
  micOn: { backgroundColor: "#F08A8A", shadowColor: "#F08A8A", transform: [{ scale: 1.08 }] },
  micGlyph: { width: 18, height: 30, borderRadius: 9, backgroundColor: "#120E1C" },
  micGlyphOn: { height: 18, width: 18, borderRadius: 4 },
  hint: { color: C.faint, fontSize: 12, textAlign: "center", marginTop: 8 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginTop: 12 },
  typeInput: { flex: 1, backgroundColor: C.surface, borderWidth: 1, borderColor: C.lineStrong, borderRadius: 14, color: C.text, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "flex-end" },
  sheet: { backgroundColor: C.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, gap: 10, borderWidth: 1, borderColor: C.line },
  sheetTitle: { color: C.muted, fontSize: 13.5, marginBottom: 4 },
  editInput: { minHeight: 180, backgroundColor: C.surface2, borderRadius: 14, color: C.text, padding: 14, fontSize: 15, lineHeight: 21, borderWidth: 1, borderColor: C.lineStrong },
  editHint: { color: C.faint, fontSize: 12.5 },
});
