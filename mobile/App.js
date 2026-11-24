// Tia on the phone. Opened from the "Connect phone" QR on Tia's screen it connects by itself
// (the link carries Tia's address and code); otherwise pair once by scanning the code inside the app.
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import PairScreen from "./src/PairScreen";
import HomeScreen from "./src/HomeScreen";
import { api, forgetPair, loadPair, savePair } from "./src/api";
import { C } from "./src/theme";

// …/--/connect?u=https%3A%2F%2Frderics.id.lv%2Ftia&t=CODE  →  { url, token }
function pairFromLink(link) {
  if (!link) return null;
  const t = link.match(/[?&]t=([\w-]+)/);
  const u = link.match(/[?&]u=([^&#]+)/);
  if (!t || !u) return null;
  const url = decodeURIComponent(u[1]).replace(/\/$/, "");
  return /^https?:\/\//.test(url) ? { url, token: t[1] } : null;
}

export default function App() {
  const [pair, setPair] = useState(undefined); // undefined = still loading, null = not paired

  async function connectFromLink(link) {
    const next = pairFromLink(link);
    if (!next) return false;
    try {
      const hello = await api.hello(next);
      const full = { ...next, business: hello.business, owner: hello.owner };
      await savePair(full);
      setPair(full);
      return true;
    } catch {
      return false; // keep whatever pairing the phone already had
    }
  }

  useEffect(() => {
    (async () => {
      const opened = await Linking.getInitialURL().catch(() => null);
      if (await connectFromLink(opened)) return;
      setPair(await loadPair());
    })();
    const sub = Linking.addEventListener("url", ({ url }) => connectFromLink(url));
    return () => sub.remove();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {pair === undefined ? (
        <View style={{ flex: 1, backgroundColor: C.bg, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.accent} />
        </View>
      ) : pair ? (
        <HomeScreen key={pair.url + pair.token} pair={pair} onUnpair={() => forgetPair().finally(() => setPair(null))} onRepair={setPair} />
      ) : (
        <PairScreen onPaired={setPair} />
      )}
    </SafeAreaProvider>
  );
}
