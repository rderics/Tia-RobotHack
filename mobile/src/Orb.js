// Tia's face on the phone: a glowing orb with two eyes. It breathes when idle, swells while listening,
// spins a ring while thinking and pulses while speaking – so a visitor always sees what Tia is doing.
import { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { C } from "./theme";

export default function Orb({ mode = "idle", size = 168 }) {
  const breathe = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const blink = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const speed = mode === "speaking" ? 380 : mode === "listening" ? 650 : 2600;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: speed, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [mode]);

  useEffect(() => {
    const loop = Animated.loop(Animated.timing(spin, { toValue: 1, duration: 1100, easing: Easing.linear, useNativeDriver: true }));
    if (mode === "thinking") loop.start();
    else spin.setValue(0);
    return () => loop.stop();
  }, [mode]);

  useEffect(() => {
    let t;
    const tick = () => {
      Animated.sequence([
        Animated.timing(blink, { toValue: 0.1, duration: 70, useNativeDriver: true }),
        Animated.timing(blink, { toValue: 1, duration: 110, useNativeDriver: true }),
      ]).start();
      t = setTimeout(tick, 2600 + Math.random() * 2600);
    };
    t = setTimeout(tick, 1800);
    return () => clearTimeout(t);
  }, []);

  const swell = mode === "listening" ? 0.14 : mode === "speaking" ? 0.07 : 0.04;
  const glowScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + swell * 2.2] });
  const coreScale = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1 + swell * 0.5] });
  const glowOpacity = breathe.interpolate({ inputRange: [0, 1], outputRange: mode === "idle" ? [0.16, 0.26] : [0.28, 0.5] });
  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const glowColor = mode === "listening" ? "#F08A8A" : C.accent;
  const eye = size * 0.075;

  return (
    <View style={{ width: size * 1.6, height: size * 1.6, alignItems: "center", justifyContent: "center" }}>
      <Animated.View
        style={[
          styles.abs,
          { width: size * 1.25, height: size * 1.25, borderRadius: size, backgroundColor: glowColor, opacity: glowOpacity, transform: [{ scale: glowScale }] },
        ]}
      />
      {mode === "thinking" && (
        <Animated.View
          style={[
            styles.abs,
            {
              width: size * 1.18,
              height: size * 1.18,
              borderRadius: size,
              borderWidth: 2,
              borderColor: "transparent",
              borderTopColor: C.accent,
              borderRightColor: "rgba(185,163,242,0.35)",
              transform: [{ rotate }],
            },
          ]}
        />
      )}
      <Animated.View style={{ transform: [{ scale: coreScale }] }}>
        <LinearGradient
          colors={["#EDE6FF", "#B9A3F2", "#5B3BAE"]}
          locations={[0, 0.45, 1]}
          start={{ x: 0.25, y: 0.05 }}
          end={{ x: 0.8, y: 1 }}
          style={{ width: size, height: size, borderRadius: size / 2, alignItems: "center", justifyContent: "center" }}
        >
          <View style={[styles.visor, { width: size * 0.62, height: size * 0.36, borderRadius: size * 0.18 }]}>
            <Animated.View style={[styles.eye, { width: eye, height: eye * 1.5, borderRadius: eye, transform: [{ scaleY: blink }] }]} />
            <Animated.View style={[styles.eye, { width: eye, height: eye * 1.5, borderRadius: eye, transform: [{ scaleY: blink }] }]} />
          </View>
        </LinearGradient>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  abs: { position: "absolute" },
  visor: { backgroundColor: "#16121F", flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 18 },
  eye: { backgroundColor: "#F4EEFF", shadowColor: "#C9B6FF", shadowOpacity: 0.9, shadowRadius: 6 },
});
