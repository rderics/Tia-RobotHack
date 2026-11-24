// One thing on Tia's desk. Tap to open; open cards show her draft, the money, why she asks, and the notes she used.
import { useState } from "react";
import { LayoutAnimation, Pressable, StyleSheet, Text, View } from "react-native";
import { C, CHANNEL, KIND_LABEL, eur } from "./theme";

export default function Card({ card, onDecide, onEdit, busy, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const ch = CHANNEL[card.channel] || { label: card.channel, color: C.muted };
  const isOpenItem = card.state === "open";
  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((o) => !o);
  };

  return (
    <View style={[styles.card, card.urgent && isOpenItem && styles.urgent]}>
      <Pressable onPress={toggle} style={styles.head} accessibilityRole="button" accessibilityLabel={`${card.from}: ${card.summary}`}>
        <View style={styles.row}>
          <View style={[styles.dot, { backgroundColor: ch.color }]} />
          <Text style={styles.channel}>
            {card.kind !== "message" ? KIND_LABEL[card.kind] || "Task" : ch.label}
            {card.urgent && isOpenItem ? "  ·  urgent" : ""}
          </Text>
          <Text style={styles.time}>{card.time}</Text>
        </View>
        <Text style={styles.from} numberOfLines={1}>
          {card.title || card.from}
        </Text>
        <Text style={styles.summary} numberOfLines={open ? undefined : 2}>
          {card.summary}
        </Text>
        {card.money > 0 && !open && <Text style={styles.money}>{eur(card.money)}</Text>}
      </Pressable>

      {open && (
        <View style={styles.body}>
          {card.lines && card.lines.length > 0 && (
            <View style={styles.lines}>
              {card.lines.map((l, i) => (
                <View key={i} style={styles.lineRow}>
                  <Text style={styles.lineItem}>{l.item}</Text>
                  <Text style={styles.lineAmt}>{eur(l.amount_eur)}</Text>
                </View>
              ))}
              <View style={[styles.lineRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalAmt}>{eur(card.total)}</Text>
              </View>
            </View>
          )}
          {!!card.text && (
            <View style={styles.draft}>
              <Text style={styles.label}>{card.kind === "message" ? "My reply" : "Message"}</Text>
              <Text style={styles.draftText}>{card.text}</Text>
            </View>
          )}
          {!!card.reason && <Text style={styles.reason}>{card.reason}</Text>}
          {card.guard && card.guard.length > 0 && <Text style={styles.guard}>{card.guard.join(" ")}</Text>}
          {card.sources && card.sources.length > 0 && <Text style={styles.sources}>From your notes: {card.sources.join(", ")}</Text>}
        </View>
      )}

      {isOpenItem ? (
        <View style={styles.buttons}>
          <Btn label={card.approveLabel || (card.kind === "order" ? "Approve order" : card.text ? "Approve & send" : "Approve")} tone="ok" onPress={() => onDecide(card, "approve")} disabled={busy} />
          {!!card.text && <Btn label="Edit" onPress={() => onEdit(card)} disabled={busy} />}
          <Btn label="Reject" tone="ghost" onPress={() => onDecide(card, "reject")} disabled={busy} />
        </View>
      ) : (
        <Text style={[styles.outcome, card.state === "rejected" && { color: C.faint }]}>
          {card.state === "handled" ? "Handled by Tia" : card.state === "rejected" ? "Rejected" : card.state === "edited" ? "Edited and approved" : "Approved"}
        </Text>
      )}
    </View>
  );
}

export function Btn({ label, onPress, tone = "plain", disabled, style }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [styles.btn, styles[`btn_${tone}`], pressed && { opacity: 0.75 }, disabled && { opacity: 0.4 }, style]}
      accessibilityRole="button"
    >
      <Text style={[styles.btnText, (tone === "ok" || tone === "accent") && { color: "#120E1C" }, tone === "ghost" && { color: C.muted }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: 18, borderWidth: 1, borderColor: C.line, marginBottom: 10, overflow: "hidden" },
  urgent: { borderColor: "rgba(239,106,106,0.45)" },
  head: { padding: 16, paddingBottom: 12 },
  row: { flexDirection: "row", alignItems: "center", marginBottom: 6 },
  dot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  channel: { color: C.muted, fontSize: 12, fontWeight: "600", letterSpacing: 0.3, flex: 1 },
  time: { color: C.faint, fontSize: 12, fontVariant: ["tabular-nums"] },
  from: { color: C.text, fontSize: 16, fontWeight: "600", marginBottom: 3 },
  summary: { color: "#CFCAD8", fontSize: 14.5, lineHeight: 20 },
  money: { color: C.warn, fontSize: 13, fontWeight: "600", marginTop: 6 },
  body: { paddingHorizontal: 16, paddingBottom: 4 },
  lines: { backgroundColor: C.surface2, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 4, marginBottom: 10 },
  lineRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, gap: 12 },
  lineItem: { color: "#CFCAD8", fontSize: 13, flex: 1, lineHeight: 18 },
  lineAmt: { color: C.text, fontSize: 13, fontVariant: ["tabular-nums"] },
  totalRow: { borderTopWidth: 1, borderTopColor: C.lineStrong, marginTop: 2, paddingTop: 9 },
  totalLabel: { color: C.text, fontWeight: "700", fontSize: 14 },
  totalAmt: { color: C.text, fontWeight: "700", fontSize: 15, fontVariant: ["tabular-nums"] },
  draft: { borderLeftWidth: 2, borderLeftColor: C.accent, paddingLeft: 12, marginBottom: 10 },
  label: { color: C.accent, fontSize: 11, fontWeight: "700", letterSpacing: 0.8, textTransform: "uppercase", marginBottom: 4 },
  draftText: { color: C.text, fontSize: 14, lineHeight: 20 },
  reason: { color: C.muted, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  guard: { color: C.warn, fontSize: 13, lineHeight: 18, marginBottom: 6 },
  sources: { color: C.faint, fontSize: 12, marginBottom: 6 },
  buttons: { flexDirection: "row", gap: 8, padding: 12, paddingTop: 4 },
  outcome: { color: C.ok, fontSize: 12.5, fontWeight: "600", paddingHorizontal: 16, paddingBottom: 14 },
  btn: { paddingVertical: 11, paddingHorizontal: 14, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btn_plain: { backgroundColor: C.surface2, borderWidth: 1, borderColor: C.lineStrong },
  btn_ok: { backgroundColor: C.ok, flexGrow: 1 },
  btn_ghost: { backgroundColor: "transparent" },
  btn_accent: { backgroundColor: C.accent },
  btnText: { color: C.text, fontWeight: "700", fontSize: 14 },
});
