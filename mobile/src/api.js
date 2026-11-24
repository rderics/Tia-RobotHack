// Talking to Tia on the computer. The phone only knows the address + pairing token from the QR code.
import { useEffect, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const KEY = "tia.pair.v1";

// QR code format: tia:http://192.168.1.20:4747?t=TOKEN
export function parsePairCode(raw) {
  const m = String(raw || "").trim().match(/^tia:(https?:\/\/[^?\s]+)\?t=([\w-]+)$/);
  return m ? { url: m[1].replace(/\/$/, ""), token: m[2] } : null;
}

export async function loadPair() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
export async function savePair(pair) {
  await AsyncStorage.setItem(KEY, JSON.stringify(pair));
}
export async function forgetPair() {
  await AsyncStorage.removeItem(KEY);
}

async function call(pair, path, { method = "GET", body, timeout = 15000 } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const isForm = body instanceof FormData;
    const res = await fetch(`${pair.url}/api/m/${path}`, {
      method,
      headers: { "x-tia-token": pair.token, ...(body && !isForm ? { "content-type": "application/json" } : {}) },
      body: body ? (isForm ? body : JSON.stringify(body)) : undefined,
      signal: ctrl.signal,
    });
    const json = await res.json().catch(() => ({}));
    if (res.status === 401) {
      const e = new Error(json.error || "Not paired");
      e.unpaired = true;
      throw e;
    }
    if (!res.ok) throw new Error(json.error || `Tia answered ${res.status}`);
    return json;
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  hello: (pair) => call(pair, "hello", { timeout: 6000 }),
  say: (pair, text) => call(pair, "say", { method: "POST", body: { text }, timeout: 90000 }),
  decide: (pair, id, verdict, editedText) => call(pair, "decide", { method: "POST", body: { id, verdict, editedText } }),
  run: (pair) => call(pair, "run", { method: "POST", body: { mode: "auto" } }),
  reset: (pair) => call(pair, "reset", { method: "POST", body: {} }),
  voice: (pair, uri) => {
    const form = new FormData();
    const ext = (uri.split(".").pop() || "m4a").toLowerCase();
    form.append("file", { uri, name: `clip.${ext}`, type: ext === "webm" ? "audio/webm" : ext === "wav" ? "audio/wav" : "audio/m4a" });
    return call(pair, "voice", { method: "POST", body: form, timeout: 120000 });
  },
};

// Live copy of Tia's desk. Long-polls: the computer answers the moment anything changes.
export function useDesk(pair, onUnpaired) {
  const [desk, setDesk] = useState(null);
  const [online, setOnline] = useState(true);
  const version = useRef(0);

  useEffect(() => {
    if (!pair) return;
    let alive = true;
    (async () => {
      while (alive) {
        try {
          const snap = await call(pair, `state?v=${version.current}`, { timeout: 25000 });
          if (!alive) break;
          version.current = snap.version;
          setDesk(snap);
          setOnline(true);
        } catch (e) {
          if (!alive) break;
          if (e.unpaired) return onUnpaired && onUnpaired();
          setOnline(false);
          await new Promise((r) => setTimeout(r, 2000));
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [pair]);

  return { desk, online };
}
