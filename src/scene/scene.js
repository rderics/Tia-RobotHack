// Tia's 3D stage (three.js). Bundled by esbuild into src/renderer/scene.js → window.TiaScene.
// Tia is built from simple shapes (no downloaded model): pearl body, glass visor face with glowing eyes,
// and a clock halo (the logo). Each message flies in as a 3D card, she reads it, then the reply flies out
// to "Sent" (handled) or the card turns amber and flies to the owner's phone (needs you).
import * as THREE from "three";

export const CHANNELS = {
  email: { color: "#4f8cff", label: "EMAIL" },
  whatsapp: { color: "#25d366", label: "WHATSAPP" },
  instagram: { color: "#e1306c", label: "INSTAGRAM" },
  slack: { color: "#b062e8", label: "SLACK" },
};
const PURPLE = 0x8a63e0;
const LAVENDER = 0xc8b4ee;
const OK = "#34d399";
const WARN = "#f5a524";

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrap(ctx, text, maxWidth, maxLines) {
  const words = String(text || "").split(/\s+/);
  const lines = [];
  let line = "";
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
      if (lines.length === maxLines) break;
    } else line = test;
  }
  if (lines.length < maxLines && line) lines.push(line);
  if (lines.length === maxLines && words.join(" ").length > lines.join(" ").length) lines[maxLines - 1] = lines[maxLines - 1].replace(/\s*\S*$/, "") + "…";
  return lines;
}

// Draws a card face on a canvas. accent = colour bar + badge, badge = small label, title/body = text.
function cardTexture({ accent, badge, title, body, footer, tint }) {
  const W = 1024;
  const H = 640;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d");
  roundRect(ctx, 8, 8, W - 16, H - 16, 48);
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, tint ? tint[0] : "#221d30");
  g.addColorStop(1, tint ? tint[1] : "#15121e");
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(255,255,255,0.10)";
  ctx.stroke();
  ctx.fillStyle = accent;
  roundRect(ctx, 8, 8, 18, H - 16, 9);
  ctx.fill();

  const font = "'Segoe UI', system-ui, -apple-system, sans-serif";
  ctx.font = `700 34px ${font}`;
  const bw = ctx.measureText(badge).width + 44;
  roundRect(ctx, 64, 56, bw, 58, 29);
  ctx.fillStyle = accent;
  ctx.fill();
  ctx.fillStyle = "#0b0a10";
  ctx.fillText(badge, 86, 97);

  ctx.fillStyle = "#f4f2fa";
  ctx.font = `700 54px ${font}`;
  wrap(ctx, title, W - 140, 1).forEach((l, i) => ctx.fillText(l, 64, 196 + i * 62));
  ctx.fillStyle = "#b7b1c8";
  ctx.font = `400 42px ${font}`;
  wrap(ctx, body, W - 140, 4).forEach((l, i) => ctx.fillText(l, 64, 272 + i * 58));
  if (footer) {
    ctx.fillStyle = accent;
    ctx.font = `600 36px ${font}`;
    ctx.fillText(footer, 64, H - 52);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

export function createScene(container, { reducedMotion = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x0b0a10, 14, 32);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 100);
  const camBase = new THREE.Vector3(0, 2.35, 10.2);
  camera.position.copy(camBase);
  const lookAt = new THREE.Vector3(0, 1.75, 0);

  // Lights: soft sky, warm key, purple rim behind her.
  scene.add(new THREE.HemisphereLight(0xcfc3ff, 0x0b0a10, 0.9));
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(3, 6, 6);
  scene.add(key);
  const rim = new THREE.PointLight(PURPLE, 60, 14, 2);
  rim.position.set(-2.5, 3.6, -2.5);
  scene.add(rim);
  const fill = new THREE.PointLight(LAVENDER, 14, 10, 2);
  fill.position.set(2.5, 1.2, 3);
  scene.add(fill);

  // Stage floor with glowing rings.
  const floor = new THREE.Mesh(new THREE.CircleGeometry(7, 96), new THREE.MeshStandardMaterial({ color: 0x15121d, roughness: 0.45, metalness: 0.3 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const ringMat = new THREE.MeshBasicMaterial({ color: PURPLE, transparent: true, opacity: 0.85 });
  const ring1 = new THREE.Mesh(new THREE.RingGeometry(1.55, 1.6, 128), ringMat);
  ring1.rotation.x = -Math.PI / 2;
  ring1.position.y = 0.01;
  scene.add(ring1);
  const ring2 = new THREE.Mesh(new THREE.RingGeometry(2.4, 2.42, 128, 1, 0, Math.PI * 1.6), new THREE.MeshBasicMaterial({ color: LAVENDER, transparent: true, opacity: 0.35 }));
  ring2.rotation.x = -Math.PI / 2;
  ring2.position.y = 0.012;
  scene.add(ring2);

  // ---- Tia ----
  const tia = new THREE.Group();
  scene.add(tia);
  const pearl = new THREE.MeshPhysicalMaterial({ color: 0xf4f1fb, roughness: 0.28, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.15, sheen: 0.4, sheenColor: new THREE.Color(LAVENDER) });
  const bodyProfile = [
    [0.0, 0.35], [0.62, 0.35], [0.7, 0.5], [0.62, 0.9], [0.45, 1.45], [0.36, 1.85], [0.42, 2.05], [0.5, 2.2], [0.46, 2.33], [0.2, 2.42], [0.0, 2.43],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const body = new THREE.Mesh(new THREE.LatheGeometry(bodyProfile, 64), pearl);
  tia.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.37, 0.035, 16, 64), new THREE.MeshStandardMaterial({ color: PURPLE, emissive: PURPLE, emissiveIntensity: 0.6, roughness: 0.3 }));
  belt.rotation.x = Math.PI / 2;
  belt.position.y = 1.86;
  tia.add(belt);

  const head = new THREE.Group();
  head.position.y = 2.95;
  tia.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.48, 64, 48), pearl);
  skull.scale.set(1, 1.05, 0.98);
  head.add(skull);
  const visor = new THREE.Mesh(
    // phi = around the head (front = PI/2), theta = from the top; this cuts a face-shaped window at the front.
    new THREE.SphereGeometry(0.49, 64, 48, Math.PI * 0.18, Math.PI * 0.64, Math.PI * 0.28, Math.PI * 0.42),
    new THREE.MeshPhysicalMaterial({ color: 0x0d0b14, roughness: 0.08, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.05 })
  );
  visor.scale.set(1, 1.05, 0.99);
  head.add(visor);
  const glow = new THREE.MeshBasicMaterial({ color: LAVENDER });
  const eyeGeo = new THREE.CapsuleGeometry(0.045, 0.06, 6, 12);
  const eyeL = new THREE.Mesh(eyeGeo, glow);
  const eyeR = new THREE.Mesh(eyeGeo, glow);
  eyeL.position.set(-0.15, 0.05, 0.47);
  eyeR.position.set(0.15, 0.05, 0.47);
  head.add(eyeL, eyeR);
  const mouth = new THREE.Mesh(new THREE.CapsuleGeometry(0.022, 0.12, 4, 10), glow);
  mouth.rotation.z = Math.PI / 2;
  mouth.position.set(0, -0.14, 0.47);
  head.add(mouth);

  // Clock halo = the TiA logo.
  const halo = new THREE.Group();
  halo.position.set(0, 0.72, 0);
  halo.rotation.x = -0.35;
  head.add(halo);
  const haloMat = new THREE.MeshStandardMaterial({ color: PURPLE, emissive: PURPLE, emissiveIntensity: 1.4, roughness: 0.3 });
  halo.add(new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.03, 16, 96), haloMat));
  const handMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: LAVENDER, emissiveIntensity: 0.8 });
  const minute = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.34, 0.02), handMat);
  minute.geometry.translate(0, 0.17, 0);
  const hour = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.22, 0.02), handMat);
  hour.geometry.translate(0, 0.11, 0);
  hour.rotation.z = -Math.PI / 3;
  const pivot = new THREE.Mesh(new THREE.SphereGeometry(0.05, 20, 16), new THREE.MeshBasicMaterial({ color: LAVENDER }));
  halo.add(minute, hour, pivot);

  // Floating hands that hold the card while reading.
  const handGeo = new THREE.SphereGeometry(0.13, 32, 24);
  const handL = new THREE.Mesh(handGeo, pearl);
  const handR = new THREE.Mesh(handGeo, pearl);
  const handRestL = new THREE.Vector3(-0.95, 1.55, 0.25);
  const handRestR = new THREE.Vector3(0.95, 1.55, 0.25);
  handL.position.copy(handRestL);
  handR.position.copy(handRestR);
  tia.add(handL, handR);

  // Portals: inbox (left), sent (right). Each shows a live number in its centre and a small label under it.
  function portal(color, css, x, label) {
    const g = new THREE.Group();
    g.position.set(x, 3.15, -1.2);
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.014, 16, 128), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.75 }));
    const halo = new THREE.Mesh(new THREE.RingGeometry(0.64, 0.78, 96), new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.07, depthWrite: false }));
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.6, 64), new THREE.MeshBasicMaterial({ color: 0x0e0d13, transparent: true, opacity: 0.55 }));
    g.add(disc, halo, m);
    const c = document.createElement("canvas");
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext("2d");
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    function draw(n) {
      ctx.clearRect(0, 0, 512, 512);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f3f1f6";
      ctx.font = "300 190px 'Segoe UI Variable Display', 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(String(n), 256, 268);
      ctx.fillStyle = css;
      ctx.font = "600 44px 'Segoe UI', system-ui, sans-serif";
      ctx.fillText(label.split("").join(String.fromCharCode(8202)), 256, 500);
      t.needsUpdate = true;
    }
    draw(0);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 1.5), new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false }));
    face.position.set(0, -0.2, 0.01);
    g.add(face);
    g.userData.draw = draw;
    scene.add(g);
    return g;
  }
  const inbox = portal(0xb9a3f2, "#b9a3f2", -3.7, "INBOX");
  const sent = portal(0x4cc38a, "#4cc38a", 3.7, "SENT");

  // Particles for little bursts.
  const bursts = [];
  function burst(pos, color) {
    const n = 26;
    const geo = new THREE.BufferGeometry();
    const arr = new Float32Array(n * 3);
    const vel = [];
    for (let i = 0; i < n; i++) {
      arr.set([pos.x, pos.y, pos.z], i * 3);
      vel.push(new THREE.Vector3((Math.random() - 0.5) * 2.4, (Math.random() - 0.2) * 2.4, (Math.random() - 0.5) * 1.2));
    }
    geo.setAttribute("position", new THREE.BufferAttribute(arr, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color, size: 0.07, transparent: true, opacity: 1 }));
    scene.add(pts);
    bursts.push({ pts, vel, born: performance.now(), last: performance.now() });
  }

  // ---- animation helpers ----
  const tweens = [];
  const speed = { k: 1 };
  function tween(ms, fn) {
    return new Promise((resolve) => tweens.push({ start: performance.now(), ms: ms * speed.k, fn, resolve }));
  }
  const wait = (ms) => tween(ms, () => {});
  const lerp = (a, b, t) => a + (b - a) * t;

  let talking = false;
  let reading = 0; // 0..1 lean-in amount
  const READ = new THREE.Vector3(0, 2.05, 1.75);

  function makeCard(tex) {
    const card = new THREE.Mesh(new THREE.PlaneGeometry(2.05, 1.28), new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide }));
    const scanMat = new THREE.MeshBasicMaterial({ color: LAVENDER, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const scan = new THREE.Mesh(new THREE.PlaneGeometry(1.95, 0.05), scanMat);
    scan.position.z = 0.01;
    card.add(scan);
    card.userData.scan = scan;
    scene.add(card);
    return card;
  }

  function dispose(card) {
    scene.remove(card);
    card.geometry.dispose();
    card.material.map && card.material.map.dispose();
    card.material.dispose();
  }

  // Plays one result. phonePos(): world position of the phone (bottom right), from the screen.
  async function play(result, { phoneTarget } = {}) {
    const m = result.message;
    const p = result.proposal || {};
    const ch = CHANNELS[m.channel] || { color: "#8b7bb0", label: m.channel.toUpperCase() };
    const card = makeCard(cardTexture({ accent: ch.color, badge: ch.label, title: m.from, body: m.subject ? `${m.subject} – ${m.text}` : m.text, footer: m.time }));
    const start = inbox.position.clone();
    card.position.copy(start);
    card.scale.setScalar(0.25);

    // 1. Fly in from the inbox.
    await tween(750, (t) => {
      const e = ease(t);
      card.position.lerpVectors(start, READ, e);
      card.position.y += Math.sin(e * Math.PI) * 0.6;
      card.scale.setScalar(lerp(0.25, 1, e));
      card.rotation.y = lerp(0.9, 0, e);
      card.rotation.z = lerp(-0.25, 0, e);
      handL.position.lerpVectors(handRestL, new THREE.Vector3(-0.98, 1.78, 1.55), e);
      handR.position.lerpVectors(handRestR, new THREE.Vector3(0.98, 1.78, 1.55), e);
      reading = e;
    });

    // 2. Read it (scan line sweeps).
    const scan = card.userData.scan;
    await tween(1100, (t) => {
      scan.material.opacity = Math.sin(t * Math.PI) * 0.9;
      scan.position.y = lerp(0.55, -0.55, (t * 1.6) % 1);
    });
    scan.material.opacity = 0;

    if (result.decision === "handle" && !result.error) {
      const types = (p.actions || []).map((a) => a.type);
      const archive = types.length && types.every((t) => t === "archive");
      if (archive) {
        // 3a. Archive: card sinks into the floor.
        await tween(700, (t) => {
          const e = ease(t);
          card.position.y = lerp(READ.y, -0.4, e);
          card.rotation.x = lerp(0, -1.2, e);
          card.material.opacity = 1 - e;
        });
      } else {
        // 3b. Flip into the reply and send it.
        const what = types.includes("reply") ? "Reply sent" : types.includes("calendar") ? "Calendar updated" : "Done";
        await tween(260, (t) => (card.rotation.y = (ease(t) * Math.PI) / 2));
        card.material.map.dispose();
        card.material.map = cardTexture({ accent: OK, badge: what.toUpperCase(), title: `To ${m.from}`, body: p.draft_reply || p.summary, footer: "✓ handled by Tia", tint: ["#14261f", "#101a17"] });
        card.material.needsUpdate = true;
        await tween(260, (t) => (card.rotation.y = -Math.PI / 2 + (ease(t) * Math.PI) / 2));
        await wait(500);
        const from = card.position.clone();
        const to = sent.position.clone();
        await tween(800, (t) => {
          const e = ease(t);
          card.position.lerpVectors(from, to, e);
          card.position.y += Math.sin(e * Math.PI) * 0.8;
          card.scale.setScalar(lerp(1, 0.2, e));
          card.rotation.y = lerp(0, -0.9, e);
          card.rotation.z = lerp(0, 0.3, e);
        });
        burst(to, 0x34d399);
      }
    } else {
      // 3c. Needs the owner: card turns amber, then flies to the phone.
      await tween(220, (t) => card.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.06));
      card.material.map.dispose();
      card.material.map = cardTexture({ accent: WARN, badge: "NEEDS YOU", title: m.from, body: p.summary || "I couldn't process this one", footer: "→ sent to your phone", tint: ["#2a2112", "#1a150d"] });
      card.material.needsUpdate = true;
      await tween(240, (t) => card.scale.setScalar(1 + Math.sin(t * Math.PI) * 0.08));
      await wait(550);
      const from = card.position.clone();
      const to = phoneTarget ? phoneTarget() : new THREE.Vector3(4, 0.6, 2.5);
      await tween(800, (t) => {
        const e = ease(t);
        card.position.lerpVectors(from, to, e);
        card.scale.setScalar(lerp(1, 0.12, e));
        card.rotation.z = lerp(0, -0.4, e);
        card.material.opacity = 1 - Math.max(0, (e - 0.7) / 0.3);
      });
    }
    dispose(card);
    tween(500, (t) => {
      const e = easeOut(t);
      handL.position.lerpVectors(handL.position.clone(), handRestL, e);
      handR.position.lerpVectors(handR.position.clone(), handRestR, e);
      reading = 1 - e;
    });
  }

  // Screen point (px, relative to the canvas) → world point near the camera, for flying to the phone.
  function screenToWorld(x, y, depth = 5.5) {
    const rect = renderer.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector3((x / rect.width) * 2 - 1, -(y / rect.height) * 2 + 1, 0.5).unproject(camera);
    const dir = ndc.sub(camera.position).normalize();
    return camera.position.clone().add(dir.multiplyScalar(depth));
  }

  // ---- render loop ----
  const clock = new THREE.Clock();
  let mouseX = 0;
  container.addEventListener("pointermove", (e) => {
    const r = container.getBoundingClientRect();
    mouseX = ((e.clientX - r.left) / r.width - 0.5) * 2;
  });

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Pull back on narrow screens so Tia and both portals stay in view.
    const far = w / h < 1.25 ? lerp(15.5, 10.2, Math.max(0, (w / h - 0.6) / 0.65)) : 10.2;
    camBase.z = far;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(container);
  resize();

  // Tweens advance on the clock. Browsers pause animation frames when the page is hidden, so a backup
  // timer keeps them moving (otherwise the demo would freeze until the tab is visible again).
  let lastStep = performance.now();
  setInterval(() => {
    if (performance.now() - lastStep > 150) stepTweens(performance.now());
  }, 100);

  function frame() {
    const t = clock.getElapsedTime();
    stepTweens(performance.now());
    renderFrame(t);
    requestAnimationFrame(frame);
  }

  function stepTweens(now) {
    lastStep = now;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i];
      const k = Math.min(1, (now - tw.start) / tw.ms);
      tw.fn(k);
      if (k >= 1) {
        tweens.splice(i, 1);
        tw.resolve();
      }
    }
  }

  function renderFrame(t) {
    const nowMs = performance.now();
    for (let i = bursts.length - 1; i >= 0; i--) {
      const b = bursts[i];
      const dt = Math.min(0.05, (nowMs - b.last) / 1000); // real time, so it looks the same at any frame rate
      b.last = nowMs;
      const life = (nowMs - b.born) / 1000;
      const pos = b.pts.geometry.attributes.position;
      for (let j = 0; j < b.vel.length; j++) {
        pos.setXYZ(j, pos.getX(j) + b.vel[j].x * dt, pos.getY(j) + b.vel[j].y * dt, pos.getZ(j) + b.vel[j].z * dt);
        b.vel[j].y -= 3 * dt;
      }
      pos.needsUpdate = true;
      b.pts.material.opacity = Math.max(0, 1 - life / 0.9);
      if (life > 0.9) {
        scene.remove(b.pts);
        b.pts.geometry.dispose();
        b.pts.material.dispose();
        bursts.splice(i, 1);
      }
    }
    const motion = reducedMotion ? 0.2 : 1;
    tia.position.y = Math.sin(t * 1.3) * 0.08 * motion;
    tia.rotation.y = Math.sin(t * 0.4) * 0.12 * motion + mouseX * 0.08;
    head.rotation.x = lerp(0, 0.22, reading) + Math.sin(t * 0.9) * 0.02;
    head.rotation.z = Math.sin(t * 0.7) * 0.03 * motion;
    minute.rotation.z = -t * 0.9;
    hour.rotation.z = -Math.PI / 3 - t * 0.08;
    ring2.rotation.z = t * 0.15;
    const blink = Math.sin(t * 2.1) > 0.985 ? 0.15 : 1;
    eyeL.scale.y = eyeR.scale.y = blink;
    mouth.scale.y = talking ? 1 + Math.abs(Math.sin(t * 16)) * 2.2 : 1;
    if (reading < 0.01) {
      handL.position.y = handRestL.y + Math.sin(t * 1.3 + 1) * 0.06;
      handR.position.y = handRestR.y + Math.sin(t * 1.3 + 2) * 0.06;
    }
    camera.position.set(camBase.x + mouseX * 0.35, camBase.y, camBase.z);
    camera.lookAt(lookAt);
    renderer.render(scene, camera);
  }
  requestAnimationFrame(frame);

  return {
    play,
    screenToWorld,
    setTalking: (on) => (talking = on),
    setCounts: ({ inbox: a, sent: b }) => {
      if (a != null) inbox.userData.draw(a);
      if (b != null) sent.userData.draw(b);
    },
    setSpeed: (k) => (speed.k = k),
  };
}
