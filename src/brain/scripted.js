// Offline demo script for voice commands. Used when Claude can't be reached (no internet at the venue,
// usage limit) or when config.json says "commandMode": "scripted".
// These answers are WRITTEN BY HAND for the stand script – they are not AI output, and the screen says so.
// Facts and prices come from demo/Business vault TIA (Clients/Ieva Bērziņa, Price list, Suppliers/Bolt Food).

const OFFER_BASE = [
  { item: "L-shaped kitchen 4.2 m, painted MDF fronts (sage green), soft-close, installed", amount_eur: 7200 },
  { item: "Integrated appliance housing – fridge", amount_eur: 180 },
  { item: "Integrated appliance housing – dishwasher", amount_eur: 180 },
  { item: "Extra drawer unit under the corner (4 drawers)", amount_eur: 390 },
];
const WORKTOPS = {
  quartz: { item: "Quartz worktop", amount_eur: 1450 },
  oak: { item: "Solid oak worktop", amount_eur: 650 },
  laminate: { item: "Laminate worktop", amount_eur: 0 },
};

function offer(worktop) {
  const lines = [...OFFER_BASE, WORKTOPS[worktop]];
  const total = lines.reduce((s, l) => s + l.amount_eur, 0);
  return {
    heard_as: `Ieva's worktop: ${worktop}`,
    say: `Done. Ieva's offer comes to ${total.toLocaleString("en-US")} euros with the ${worktop} worktop, inside her budget. It's on your phone to approve.`,
    missing_info: "",
    proposal: {
      kind: "offer",
      title: "Kitchen offer – Ieva Bērziņa",
      to: "Ieva Bērziņa",
      summary: `L-shaped kitchen 4.2 m with ${worktop} worktop – ${total.toLocaleString("en-US")} €`,
      message_text: `Hi Ieva,\n\nThank you for having us over on Monday. As promised, here is the offer for your kitchen at Ganību dambis 12 – with the ${worktop} worktop, the integrated fridge and dishwasher housing and the four extra drawers under the corner.\n\nThe offer is valid for 14 days. Happy to walk through it on a call.\n\nTia, assistant to Mārtiņš – Oakline Studio`,
      lines,
      total_eur: total,
      valid_until: "3 December 2026",
      when: "",
    },
    vault_sources: ["Clients/Ieva Bērziņa", "Price list", "Owner preferences"],
  };
}

const none = (heard_as, say, missing_info = "", vault_sources = []) => ({
  heard_as,
  say,
  missing_info,
  proposal: { kind: "none", title: "", to: "", summary: "", message_text: "", lines: [], total_eur: 0, valid_until: "", when: "" },
  vault_sources,
});

function answer({ text, history, desk }) {
  const t = text.toLowerCase();
  const recent = history.map((h) => h.text.toLowerCase()).join(" \n ");
  const worktop = /quartz|courts|quarts/.test(t) ? "quartz" : /\boak\b|\bdoc\b/.test(t) ? "oak" : /laminate/.test(t) ? "laminate" : null;
  const waitingForWorktop = /worktop/.test(recent) && /oak or quartz/.test(recent);

  // Step 2 of the stand script: the owner answers the worktop question.
  if (worktop && (waitingForWorktop || /ieva|eva|offer/.test(t))) return offer(worktop);

  // Step 1: the offer request – Tia notices the missing worktop instead of guessing.
  if (/offer|quote|proposal/.test(t) && /ieva|eva|kitchen|bērziņa|berzina/.test(t)) {
    return none(
      "Prepare Ieva Bērziņa's kitchen offer by Friday",
      "I have Ieva's measurements, but she hadn't chosen her worktop yet. Oak or quartz?",
      "Which worktop did Ieva choose – oak or quartz?",
      ["Clients/Ieva Bērziņa", "Price list"]
    );
  }

  // What's waiting – answered from the real desk, not from a script.
  if (/urgent|waiting|need me|needs me|what.*(today|now)|anything/.test(t)) {
    const open = desk.filter((d) => d.state === "needs owner");
    if (!desk.length) return none("What needs me today?", "Nothing yet – I haven't been through today's inbox. Press Start the day on the big screen.");
    if (!open.length) return none("What needs me today?", "Nothing needs you right now. I've handled the rest.");
    const first = open.slice(0, 2).map((d) => d.from).join(" and ");
    return none("What needs me today?", `${open.length} ${open.length === 1 ? "thing needs" : "things need"} you. Start with ${first} – the details are on your phone.`);
  }

  // The usual team lunch (Bolt Food note) – real money, so it waits for approval.
  if (/lunch|food|order.*(team|office)/.test(t)) {
    const lines = [
      { item: "4 × lunch of the day – Lido Krasta", amount_eur: 35.6 },
      { item: "4 × lemonade", amount_eur: 11.6 },
      { item: "Delivery to the office, 12:15", amount_eur: 2.5 },
    ];
    return {
      heard_as: "Order the usual team lunch",
      say: "The usual team lunch from Lido is ready to order, 49 euros 70. Approve it on your phone and I'll place it.",
      missing_info: "",
      proposal: { kind: "order", title: "Team lunch – Bolt Food", to: "Lido Krasta via Bolt Food", summary: "Usual Tuesday lunch for 4, delivered 12:15 – 49.70 €", message_text: "", lines, total_eur: 49.7, valid_until: "", when: "Today 12:15" },
      vault_sources: ["Suppliers/Bolt Food — usual team lunch"],
    };
  }

  return none(
    text,
    "I'm running on my offline demo script right now, so I can only do a few things: prepare Ieva's kitchen offer, tell you what needs you, or order the team lunch."
  );
}

module.exports = { answer };
