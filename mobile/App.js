// Tia on the phone. Pair once with the QR code on Tia's screen, then talk to her.
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import PairScreen from "./src/PairScreen";
import HomeScreen from "./src/HomeScreen";
import { forgetPair, loadPair } from "./src/api";
import { C } from "./src/theme";

export default function App() {
  const [pair, setPair] = useState(undefined); // undefined = still loading, null = not paired

  useEffect(() => {
    loadPair().then(setPair);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {pair === undefined ? (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : pair ? (
        <HomeScreen pair={pair} onUnpair={() => forgetPair().finally(() => setPair(null))} onRepair={setPair} />
      ) : (
        <PairScreen onPaired={setPair} />
      )}
    </SafeAreaProvider>
  );
}
