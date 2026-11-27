// Tia's face: a VRM character (pixiv/three-vrm, MIT) with toon shading, lip-sync, blinking, eye contact and moods.
// Same API as the older avatar.js (createAvatar → { speak, stop, mood, gesture, look }), so the stage code does not care.
// Lip-sync: the loudness of Tia's voice opens the mouth (exact timing), the letters of the current word pick the
// mouth shape (aa / ee / ih / oh / ou). Word timings come from the voice service (edge-tts word boundaries).
// Bundled by esbuild → src/renderer/avatar.js (window.TiaAvatar).
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

const VOWEL = { a: "aa", e: "ee", i: "ih", y: "ih", o: "oh", u: "ou", w: "ou" };
const SHAPES = ["aa", "ee", "ih", "oh", "ou"];
const MOODS = { neutral: {  }, happy: { }, relaxed: { }, sad: {}, surprised: { }, angry: {} };

export async function createAvatar(container, { url, mood = "neutral", tint = {}, onProgress } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(24, 1, 0.1, 20);
  const key = new THREE.DirectionalLight(0xfff6ee, 1.25);
  key.position.set(0.6, 1.6, 2.2);
  const rim = new THREE.DirectionalLight(0xc9b2ff, 1.1); // lavender back light – Tia's accent colour
  rim.position.set(-1.2, 1.8, -1.6);
  scene.add(key, rim, new THREE.AmbientLight(0xffffff, 0.35));

  const loader = new GLTFLoader();
  loader.register((parser) => new VRMLoaderPlugin(parser));
  const gltf = await loader.loadAsync(url, onProgress);
  const vrm = gltf.userData.vrm;
  if (!vrm) throw new Error("not a VRM file");
  VRMUtils.removeUnnecessaryVertices(gltf.scene);
  VRMUtils.combineSkeletons(gltf.scene);
  // Tia's model (VRoid Studio export, VRM 1.0, by Ralfs) needs the 180° turn to face the camera – the arm check
  // below fixes the pose either way. For another model, change this test if she shows her back.
  const vrm0 = !!(vrm.meta && vrm.meta.metaVersion === "1");
  if (vrm0) VRMUtils.rotateVRM0(vrm);
  const flip = vrm0 ? -1 : 1; // …and their bones turn the other way round the vertical and depth axes
  vrm.scene.traverse((o) => (o.frustumCulled = false));
  scene.add(vrm.scene);
  // brand colours: { "<part of material name>": 0xRRGGBB } multiplies that material's colour (e.g. a lavender blouse)
  vrm.scene.traverse((o) => {
    for (const m of [].concat(o.material || []))
      for (const [part, hex] of Object.entries(tint)) if (m.name.includes(part) && m.color) m.color.setHex(hex);
  });

  const bone = (n) => vrm.humanoid.getNormalizedBoneNode(n);
  const em = vrm.expressionManager;
  if (em) for (const e of em.expressions) e.overrideMouth = "none";
  const has = (n) => !!(em && em.getExpression(n));

  // Relaxed standing pose instead of the T-pose: arms down, slight elbow bend, hands relaxed.
  const pose = {
    leftUpperArm: [0, 0, -1.22], rightUpperArm: [0, 0, 1.22],
    leftLowerArm: [0, -0.25, -0.1], rightLowerArm: [0, 0.25, 0.1],
    leftHand: [0, 0, 0.1], rightHand: [0, 0, -0.1],
  };
  const applyPose = (s) => {
    for (const [n, [x, y, z]] of Object.entries(pose)) bone(n) && bone(n).rotation.set(x, y * s, z * s);
    for (const side of ["left", "right"])
      for (const f of ["Index", "Middle", "Ring", "Little"])
        for (const j of ["Proximal", "Intermediate", "Distal"]) {
          const b = bone(`${side}${f}${j}`);
          if (b) b.rotation.z = (side === "left" ? -1 : 1) * 0.28 * s;
        }
    vrm.update(0);
  };
  applyPose(flip);
  // Safety check: if the hand ended up above the shoulder, the arms went the wrong way, so flip them.
  const handPos = new THREE.Vector3();
  const shoulderPos = new THREE.Vector3();
  bone("leftHand").getWorldPosition(handPos);
  bone("leftUpperArm").getWorldPosition(shoulderPos);
  if (handPos.y > shoulderPos.y) applyPose(-flip);

  // Video-call framing: chest up, eyes a little above the middle.
  const head = new THREE.Vector3();
  bone("head").getWorldPosition(head);
  const target = new THREE.Vector3(0, head.y - 0.06, 0);
  camera.position.set(0, head.y - 0.02, 1.3);
  camera.lookAt(target);
  const eyeTarget = new THREE.Object3D();
  camera.add(eyeTarget);
  scene.add(camera);
  if (vrm.lookAt) vrm.lookAt.target = eyeTarget;

  const resize = () => {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // keep the head comfortably in frame on narrow screens too
    camera.fov = w / h < 1 ? 36 : 25;
    camera.updateProjectionMatrix();
  };
  new ResizeObserver(resize).observe(container);
  resize();

  // ---------- state ----------
  let ctx = null;
  const audioCtx = () => ctx || (ctx = new (window.AudioContext || window.webkitAudioContext)());
  let analyser = null;
  let level = null;
  let talk = null; // { source, start, words, wtimes, wdurations }
  let moodNow = MOODS[mood] || MOODS.neutral;
  const mouth = Object.fromEntries(SHAPES.map((s) => [s, 0]));
  let blinkAt = 1.5;
  let blinkT = -1;
  let nod = null;
  let glance = { x: 0, y: 0, until: 0 };
  const clock = new THREE.Clock();
  let time = 0;

  function shapeAt(t) {
    // which vowel shape fits the word being spoken at time t (ms)
    if (!talk || !talk.words) return "aa";
    const { words, wtimes, wdurations } = talk;
    let i = -1;
    for (let k = 0; k < wtimes.length; k++) if (wtimes[k] <= t) i = k;
    if (i < 0) return null;
    const dur = wdurations[i] || 250;
    if (t > wtimes[i] + dur + 60) return null; // pause between words
    const vowels = (words[i].toLowerCase().match(/[aeiouyw]/g) || ["a"]).map((c) => VOWEL[c]);
    const pos = Math.min(0.999, Math.max(0, (t - wtimes[i]) / dur));
    return vowels[Math.floor(pos * vowels.length)];
  }

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.1);
    time += dt;

    // breathing + a calm sway
    const spine = bone("spine");
    const chest = bone("chest") || bone("upperChest");
    if (spine) spine.rotation.x = Math.sin(time * 1.6) * 0.012;
    if (chest) chest.rotation.z = Math.sin(time * 0.5) * 0.01;
    const neck = bone("neck");
    const h = bone("head");
    let nodX = 0;
    if (nod) {
      const p = (time - nod.t0) / nod.len;
      if (p >= 1) nod = null;
      else nodX = Math.sin(p * Math.PI * 2) * 0.06 * (1 - p);
    }
    const speaking = !!talk;
    if (neck) neck.rotation.y = Math.sin(time * 0.37) * 0.035 + (speaking ? Math.sin(time * 1.3) * 0.02 : 0);
    if (h) {
      h.rotation.x = Math.sin(time * 0.53) * 0.02 + nodX + (speaking ? Math.sin(time * 2.1) * 0.012 : 0);
      h.rotation.z = Math.sin(time * 0.29) * 0.025;
    }

    // eye contact with the viewer, now and then a glance away (less while speaking)
    if (time > glance.until) {
      const away = Math.random() < (speaking ? 0.15 : 0.35);
      glance = { x: away ? (Math.random() - 0.5) * 0.5 : 0, y: away ? (Math.random() - 0.3) * 0.2 : 0, until: time + 1.2 + Math.random() * 2.5 };
    }
    eyeTarget.position.lerp(new THREE.Vector3(glance.x, glance.y, 0), 0.08);

    if (em) {
      // blinking
      if (time > blinkAt && blinkT < 0) blinkT = 0;
      let blink = 0;
      if (blinkT >= 0) {
        blinkT += dt;
        blink = Math.sin(Math.min(1, blinkT / 0.16) * Math.PI);
        if (blinkT > 0.16) {
          blinkT = -1;
          blinkAt = time + 2 + Math.random() * 3.5;
        }
      }
      em.setValue("blink", blink);

      // mouth
      const MOUTH_GAIN = 5;   // how wide she opens: 4 = subtle, 6 = clearly visible
      let open = 0;
      let shape = null;
      if (talk && analyser) {
        analyser.getFloatTimeDomainData(level);
        let sum = 0;
        for (let k = 0; k < level.length; k++) sum += level[k] * level[k];
        open = Math.min(0.9, Math.pow(Math.sqrt(sum / level.length) * MOUTH_GAIN, 0.85));
        shape = shapeAt((audioCtx().currentTime - talk.start) * 1000);
        if (!shape) open *= 0.35;
      }
      for (const s of SHAPES) {
        const want = s === (shape || "aa") ? open * (s === "aa" ? 0.85 : 0.7) : open * 0.08;
        mouth[s] += (want - mouth[s]) * Math.min(1, dt * 18);
        if (!talk && mouth[s] < 0.01) mouth[s] = 0;   // fully shut when silent, no leftover gap
        if (has(s)) em.setValue(s, mouth[s]);
      }

      // mood: smiles that open the mouth are switched off while she talks
      for (const m of ["happy", "relaxed", "sad", "surprised", "angry"]) {
        if (!has(m)) continue;
        const mouthy = m === "happy" || m === "surprised";
        const want = (moodNow[m] || 0) * (speaking ? (mouthy ? 0 : 0.5) : 1);
        em.setValue(m, em.getValue(m) + (want - em.getValue(m)) * Math.min(1, dt * 6));
      }
    }

    vrm.update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  function stop() {
    if (talk && talk.source) {
      try {
        talk.source.onended = null;
        talk.source.stop();
      } catch {}
      if (talk.done) talk.done();
    }
    talk = null;
  }

  return {
    vrm,
    // Speak an mp3/wav (base64) with word timings. Resolves when she has finished (or was stopped).
    async speak({ audio, words, wtimes, wdurations }) {
      stop();
      const ac = audioCtx();
      if (ac.state === "suspended") await ac.resume().catch(() => {});
      const bytes = Uint8Array.from(atob(audio), (c) => c.charCodeAt(0));
      const buffer = await ac.decodeAudioData(bytes.buffer);
      if (!analyser) {
        analyser = ac.createAnalyser();
        analyser.fftSize = 1024;
        level = new Float32Array(analyser.fftSize);
        analyser.connect(ac.destination);
      }
      const source = ac.createBufferSource();
      source.buffer = buffer;
      source.connect(analyser);
      nod = { t0: time, len: 0.9 };
      return new Promise((resolve) => {
        const lead = 0.05;
        talk = { source, start: ac.currentTime + lead, words, wtimes, wdurations, done: resolve };
        source.onended = () => {
          talk = null;
          resolve();
        };
        source.start(ac.currentTime + lead);
      });
    },
    stop,
    mood(m) {
      moodNow = MOODS[m] || MOODS.neutral;
    },
    gesture() {
      nod = { t0: time, len: 0.9 }; // a small nod – the only gesture that suits a calm secretary
    },
    look(x = 0, y = 0, ms = 1200) {
      glance = { x, y, until: time + ms / 1000 };
    },
  };
}
