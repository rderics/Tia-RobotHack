// "Tia was updated" bar: the server pulled new commits from GitHub (src/updater.js). Screen-only changes need a reload,
// server changes a restart – one click either way.
(function () {
  const T = () => window.tia || {};
  if (!T().onEvent) return;
  function show(u) {
    let bar = document.getElementById("tiaUpdate");
    if (!bar) {
      bar = document.createElement("div");
      bar.id = "tiaUpdate";
      bar.className = "upd-bar";
      document.body.append(bar);
    }
    bar.textContent = "";
    const txt = document.createElement("span");
    txt.textContent = `Tia was updated${u.subject ? `: ${u.subject.slice(0, 80)}` : ""}`;
    const go = document.createElement("button");
    go.className = "upd-go";
    go.textContent = u.needsRestart ? "Restart now" : "Reload";
    go.onclick = async () => {
      go.disabled = true;
      go.textContent = u.needsRestart ? "Restarting…" : "Reloading…";
      if (u.needsRestart && T().restartTia) {
        try {
          await T().restartTia();
        } catch {}
        // wait until the new Tia answers, then reload
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          try {
            await T().info();
            break;
          } catch {}
        }
      }
      location.reload();
    };
    const later = document.createElement("button");
    later.className = "upd-later";
    later.textContent = "Later";
    later.onclick = () => bar.remove();
    bar.append(txt, go, later);
  }
  T().onEvent((ev) => ev.type === "update" && show(ev));
  window.TiaUpdate = { show };
})();
