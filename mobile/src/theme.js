// One place for Tia's look on the phone. Dark, calm, one accent (the logo's lavender).
export const C = {
  bg: "#0C0B0F",
  surface: "#15131A",
  surface2: "#1C1A22",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  text: "#F3F1F6",
  muted: "#9C97A6",
  faint: "#6A6573",
  accent: "#B9A3F2", // lavender from the logo
  accentDeep: "#6E4BC4",
  ok: "#4CC38A",
  okDeep: "#1F5C42",
  warn: "#E3A653",
  danger: "#EF6A6A",
};

export const CHANNEL = {
  email: { label: "Email", color: "#7EA8F8" },
  whatsapp: { label: "WhatsApp", color: "#4CC38A" },
  instagram: { label: "Instagram", color: "#E879A6" },
  slack: { label: "Slack", color: "#C9A2F5" },
  voice: { label: "You asked", color: C.accent },
};

export const KIND_LABEL = { offer: "Offer", contract: "Contract", order: "Order", reply: "Email draft", whatsapp: "WhatsApp", calendar: "Calendar", task: "Task", find_leads: "Lead search" };

export const eur = (n) => {
  const v = Math.round(Number(n || 0) * 100) / 100;
  const [i, d] = v.toFixed(2).split(".");
  return `${i.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${d === "00" ? "" : "," + d} €`;
};
