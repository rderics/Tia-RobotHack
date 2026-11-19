// Runs Tia's day in the terminal, no window. Usage: npm run day   (add -- --replay to replay the saved run)
const { runDay } = require("../src/brain/engine");

const mode = process.argv.includes("--replay") ? "replay" : "live";
runDay({
  mode,
  onEvent: (e) => {
    if (e.type === "start") console.log(`Tia starting (${e.mode}, ${e.provider}, ${e.model}) – ${e.total} messages`);
    if (e.type === "result") {
      const r = e.result;
      if (r.error) return console.log(`✖ ${r.message.id} ${r.message.from}: ERROR ${r.error}`);
      const tag = r.decision === "handle" ? "✔ HANDLED " : "➜ NEEDS YOU";
      console.log(`${tag} ${r.message.id} [${r.proposal.category}] ${r.message.from}: ${r.proposal.summary}${r.overridden ? "  (Guard overrode the model)" : ""}${r.seconds ? `  ${r.seconds}s` : ""}`);
      for (const n of r.guardNotes) console.log(`            · ${n}`);
    }
    if (e.type === "done") console.log(`Done: ${e.summary.handled} handled, ${e.summary.needsYou} need you, ~${e.summary.minutesSaved} min saved, $${e.summary.costUsd.toFixed(3)} model cost`);
  },
}).catch((e) => {
  console.error(e);
  process.exit(1);
});
