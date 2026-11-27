// The owner's REAL accounts on the screen (Gmail, Slack, Instagram, LinkedIn, Meta Ads, WhatsApp) through Composio.
// Read + draft only: Tia reads, writes drafts and ad suggestions, the owner edits them in the familiar views.
// Nothing is sent, posted, paid or changed in a live ad account from here (composio.js blocks those tools too).
// Results are cached in data/live/*.json for a few minutes so the screen is fast and the free Composio quota lasts.
const fs = require("fs");
const path = require("path");
const https = require("https");
const C = require("./composio");

const TTL = { status: 60e3, gmail: 3 * 60e3, outlook: 3 * 60e3, slack: 3 * 60e3, instagram: 15 * 60e3, linkedin: 60 * 60e3, ads: 30 * 60e3 };
const dir = (cfg) => {
  const d = path.join(cfg.dataDir, "live");
  fs.mkdirSync(d, { recursive: true });
  return d;
};
const readJ = (f, d) => {
  try {
    return JSON.parse(fs.readFileSync(f, "utf8"));
  } catch {
    return d;
  }
};
const writeJ = (f, v) => fs.writeFileSync(f, JSON.stringify(v, null, 2));
const inflight = {};
async function cached(cfg, key, fresh, load) {
  const f = path.join(dir(cfg), `${key}.json`);
  const c = readJ(f, null);
  if (!fresh && c && Date.now() - c.at < (TTL[key] || 5 * 60e3)) return c.data;
  if (inflight[key]) return inflight[key];
  inflight[key] = load()
    .then((data) => (writeJ(f, { at: Date.now(), data }), data))
    .catch((e) => {
      if (c) return { ...c.data, stale: true, error: String(e.message || e).slice(0, 200) }; // keep showing the last good copy
      throw e;
    })
    .finally(() => delete inflight[key]);
  return inflight[key];
}
const hhmm = (d) => (d && !isNaN(d) ? d.toTimeString().slice(0, 5) : "");
const day = (d) => (d && !isNaN(d) ? d.toISOString().slice(0, 10) : "");

// ---------- which accounts are linked ----------
const APPS = { calendar: "googlecalendar", gmail: "gmail", slack: "slack", instagram: "instagram", linkedin: "linkedin", ads: "metaads", whatsapp: "whatsapp", outlook: "outlook" };
async function status(cfg, fresh) {
  return cached(cfg, "status", fresh, async () => {
    const all = await C.connections();
    const out = {};
    for (const [app, kit] of Object.entries(APPS)) {
      const list = all[kit] || [];
      const st = list.find((a) => a.status === "ACTIVE") ? "connected" : list.find((a) => a.status === "INITIALIZING" || a.status === "INITIATED") ? "pending" : list.length ? "expired" : "missing";
      const chosen = app === "instagram" && cfg.instagramAccount; // config.json picks which linked Instagram Tia reads
      const acc = (chosen && list.find((a) => a.id === chosen && a.status === "ACTIVE")) || list.find((a) => a.status === "ACTIVE");
      const ig = chosen && (readJ(path.join(dir(cfg), "instagram.json"), null) || {}).data;
      out[app] = { state: st, name: (ig && ig.profile && ig.profile.username ? `@${ig.profile.username}` : "") || (acc && (acc.display_name || acc.alias)) || "" };
    }
    return out;
  });
}

// ---------- Outlook (classic Outlook on this PC, through outlook.py – read + drafts only) ----------
async function outlook(cfg, fresh) {
  return cached(cfg, "outlook", fresh, async () => {
    const msgs = await require("./outlook").fetchInbox({ ...cfg, inboxHours: cfg.outlookHours || 168, inboxLimit: 15 });
    return { account: (msgs[0] && msgs[0].mailbox) || "Outlook", items: msgs.map((m) => ({ ...m, id: `o_${String(m.entryId).slice(-24)}`, live: "outlook" })) };
  });
}

// ---------- Gmail ----------
async function gmail(cfg, fresh) {
  return cached(cfg, "gmail", fresh, async () => {
    const msgs = await C.gmailInbox({ max: 15, query: "in:inbox" });
    return { account: (await status(cfg)).gmail.name, items: msgs.map((m) => ({ ...m, id: `g_${m.gmailId}`, live: "gmail" })) };
  });
}

// ---------- Slack ----------
async function slack(cfg, fresh) {
  return cached(cfg, "slack", fresh, async () => {
    const [ch, us] = await Promise.all([C.execute("SLACK_LIST_ALL_CHANNELS", { limit: 50, exclude_archived: true }), C.execute("SLACK_LIST_ALL_USERS", { limit: 200 }).catch(() => ({}))]);
    const users = {};
    for (const u of us.members || []) users[u.id] = u.real_name || u.name || u.id;
    const channels = (ch.channels || []).filter((c) => c.is_member).slice(0, 8);
    const team = channels[0] && channels[0].context_team_id;
    const items = [];
    await Promise.all(
      channels.map(async (c) => {
        const h = await C.execute("SLACK_FETCH_CONVERSATION_HISTORY", { channel: c.id, limit: 25 }).catch(() => ({}));
        for (const m of h.messages || []) {
          if (m.subtype === "channel_join") continue;
          const d = new Date(Number(m.ts) * 1000);
          items.push({ id: `s_${c.id}_${m.ts}`, live: "slack", channel: "slack", address: `#${c.name}`, channelId: c.id, from: users[m.user] || m.username || "Someone", text: String(m.text || "").replace(/<@(\w+)>/g, (_, id) => `@${users[id] || id}`), time: hhmm(d), received: d.toISOString() });
        }
      })
    );
    return { workspace: (await status(cfg)).slack.name, team, channels: channels.map((c) => ({ id: c.id, name: `#${c.name}`, members: c.num_members })), items };
  });
}

// ---------- Instagram (business/creator account: profile, recent posts with insights, DMs) ----------
async function instagram(cfg, fresh) {
  return cached(cfg, "instagram", fresh, async () => {
    const acc = { account: cfg.instagramAccount || process.env.TIA_INSTAGRAM_ACCOUNT || undefined }; // which linked Instagram (config.json)
    const [me, media, conv] = await Promise.all([
      C.execute("INSTAGRAM_GET_USER_INFO", { ig_user_id: "me" }, acc),
      C.execute("INSTAGRAM_GET_IG_USER_MEDIA", { ig_user_id: "me", limit: 12, fields: "id,caption,media_type,thumbnail_url,media_url,permalink,timestamp,like_count,comments_count,insights.metric(views,reach,saved,shares,total_interactions)" }, acc).catch(() => ({})),
      C.execute("INSTAGRAM_LIST_ALL_CONVERSATIONS", {}, acc).catch(() => ({})),
    ]);
    const metric = (p, k) => ((p.insights && p.insights.data) || []).find((x) => x.name === k)?.values?.[0]?.value ?? null;
    const posts = (media.data || []).map((p) => ({
      id: p.id, caption: p.caption || "", type: p.media_type, image: p.thumbnail_url || (p.media_type !== "VIDEO" ? p.media_url : "") /* a carousel's media_url = its first photo */, link: p.permalink, date: day(new Date(p.timestamp)),
      likes: Number(p.like_count || 0), comments: Number(p.comments_count || 0), views: metric(p, "views"), reach: metric(p, "reach"), saved: metric(p, "saved"), shares: metric(p, "shares"),
    }));
    const threads = ((conv.data && conv.data.data) || conv.data || []).filter((x) => x && x.id);
    return {
      profile: { username: me.username, name: me.name, bio: me.biography || "", followers: me.followers_count, follows: me.follows_count, posts: me.media_count, picture: me.profile_picture_url || "", type: me.account_type },
      posts,
      dms: threads.length,
      dmNote: threads.length ? "" : "No DMs can be read yet: Instagram only shares DMs with a Business account linked to a Facebook Page (Meta Business Suite), with message access turned on.",
    };
  });
}

// ---------- LinkedIn (profile; LinkedIn does not let apps read your feed) ----------
async function linkedin(cfg, fresh) {
  return cached(cfg, "linkedin", fresh, async () => {
    const me = await C.execute("LINKEDIN_GET_MY_INFO", {});
    const loc = (x) => (x && (x.localized ? Object.values(x.localized)[0] : x)) || "";
    const pics = me.profilePicture && me.profilePicture["displayImage~"] && me.profilePicture["displayImage~"].elements;
    return {
      profile: { name: `${loc(me.firstName) || me.localizedFirstName || ""} ${loc(me.lastName) || me.localizedLastName || ""}`.trim(), headline: loc(me.headline) || me.localizedHeadline || "", url: me.profileUrl || (me.vanityName ? `https://www.linkedin.com/in/${me.vanityName}` : "https://www.linkedin.com/feed/"), picture: (pics && pics.length && pics[pics.length - 1].identifiers?.[0]?.identifier) || "" },
    };
  });
}

// ---------- Meta Ads (accounts → campaigns + insights → ads with creatives) ----------
const num = (v) => (v === undefined || v === null || v === "" ? null : Number(v));
const act = (row, type) => num(((row && row.actions) || []).find((a) => a.action_type === type)?.value) || 0;
function kpis(row) {
  if (!row) return { spend: 0, impressions: 0, reach: 0, clicks: 0, ctr: null, cpc: null, cpm: null, results: 0, purchases: 0, carts: 0, leads: 0 };
  const purchases = act(row, "purchase") || act(row, "offsite_conversion.fb_pixel_purchase");
  const leads = act(row, "lead");
  const linkClicks = act(row, "link_click");
  return { spend: num(row.spend) || 0, impressions: num(row.impressions) || 0, reach: num(row.reach) || 0, clicks: num(row.clicks) || 0, linkClicks, ctr: num(row.ctr), cpc: num(row.cpc), cpm: num(row.cpm), purchases, carts: act(row, "add_to_cart"), leads, results: purchases || leads || linkClicks };
}
async function ads(cfg, fresh) {
  return cached(cfg, "ads", fresh, async () => {
    const accs = ((await C.execute("METAADS_GET_AD_ACCOUNTS", { fields: "id,name,account_status,currency" })).data || []).slice(0, 6);
    const until = new Date().toISOString().slice(0, 10);
    const since = new Date(Date.now() - 36 * 30 * 864e5).toISOString().slice(0, 10); // Meta allows ~37 months back
    const range = { since, until };
    const F = "campaign_id,campaign_name,ad_id,ad_name,spend,impressions,clicks,ctr,cpc,cpm,reach,actions";
    const accounts = await Promise.all(
      accs.map(async (a) => {
        const [camps, cIns, adList, aIns] = await Promise.all([
          C.execute("METAADS_LIST_CAMPAIGNS", { ad_account_id: a.id, fields: "id,name,status,objective,daily_budget,lifetime_budget,created_time", limit: 25 }).catch(() => ({})),
          C.execute("METAADS_GET_INSIGHTS", { object_id: a.id, level: "campaign", time_range: range, fields: F }).catch(() => ({})),
          C.execute("METAADS_LIST_ADS", { ad_account_id: a.id, fields: "id,name,status,campaign_id,creative{title,body,call_to_action_type,image_url,thumbnail_url,link_url,object_story_spec}", limit: 25 }).catch(() => ({})),
          C.execute("METAADS_GET_INSIGHTS", { object_id: a.id, level: "ad", time_range: range, fields: F }).catch(() => ({})),
        ]);
        const cRow = Object.fromEntries((cIns.data || []).map((r) => [r.campaign_id, r]));
        const aRow = Object.fromEntries((aIns.data || []).map((r) => [r.ad_id, r]));
        const adsOut = (adList.data || []).map((ad) => {
          const cr = ad.creative || {};
          const link = cr.object_story_spec && cr.object_story_spec.link_data;
          return { id: ad.id, name: ad.name, status: ad.status, campaignId: ad.campaign_id, headline: cr.title || (link && link.name) || "", text: cr.body || (link && link.message) || "", cta: cr.call_to_action_type || "", image: cr.image_url || cr.thumbnail_url || "", url: cr.link_url || (link && link.link) || "", ...kpis(aRow[ad.id]) };
        });
        return {
          id: a.id, name: a.name, currency: a.currency || "EUR",
          campaigns: (camps.data || []).map((c) => ({ id: c.id, name: c.name, status: c.status, objective: String(c.objective || "").replace(/^OUTCOME_/, "").toLowerCase(), budget: num(c.daily_budget) ? `${(c.daily_budget / 100).toFixed(2)}/day` : num(c.lifetime_budget) ? `${(c.lifetime_budget / 100).toFixed(2)} total` : "Ad set budget", created: String(c.created_time || "").slice(0, 10), ...kpis(cRow[c.id]), ads: adsOut.filter((x) => x.campaignId === c.id).map((x) => x.id) })),
          ads: adsOut.sort((x, y) => y.spend - x.spend),
        };
      })
    );
    return { range, accounts };
  });
}

// ---------- drafts the owner edits on the screen (Gmail drafts are real; the rest wait here) ----------
const draftsFile = (cfg) => path.join(dir(cfg), "drafts.json");
const drafts = (cfg) => readJ(draftsFile(cfg), {});
async function saveDraft(cfg, b) {
  const all = drafts(cfg);
  const rec = { app: b.app, text: String(b.text || ""), to: b.to || "", subject: b.subject || "", savedAt: new Date().toISOString(), where: "Tia drafts" };
  if (b.app === "gmail") {
    const id = await C.gmailDraft({ to: b.to, subject: b.isNew || /^re:/i.test(b.subject || "") ? b.subject || "" : `Re: ${b.subject || ""}`, body: rec.text, threadId: b.threadId });
    rec.where = "Gmail → Drafts";
    rec.draftId = id;
    rec.link = "https://mail.google.com/mail/u/0/#drafts";
  } else if (b.app === "outlook") {
    // Outlook opens and Tia types the draft in front of the owner; it is saved in Drafts – he presses Send
    const A = require("../actions");
    const reply = b.entryId ? { entryId: b.entryId, storeId: b.storeId } : null;
    await A.outlook(cfg, { to: b.to, subject: reply ? "" : b.subject || "", text: rec.text, attach: b.attach || [], replyTo: reply, save: true });
    rec.where = "Outlook → Drafts";
  } else if (b.app === "slack") rec.link = b.team && b.channelId ? `https://app.slack.com/client/${b.team}/${b.channelId}` : "https://app.slack.com/client";
  else if (b.app === "linkedin") rec.link = "https://www.linkedin.com/feed/?shareActive=true";
  else if (b.app === "ads") rec.link = b.account ? `https://adsmanager.facebook.com/adsmanager/manage/ads?act=${String(b.account).replace(/^act_/, "")}` : "https://adsmanager.facebook.com/";
  else if (b.app === "instagram") rec.link = "https://www.instagram.com/";
  all[b.id] = { ...(all[b.id] || {}), ...rec, history: [...((all[b.id] && all[b.id].history) || []), { text: rec.text, at: rec.savedAt }].slice(-10) };
  writeJ(draftsFile(cfg), all);
  return all[b.id];
}

// ---------- Tia's writing and ad review ----------
const brain = () => require("../brain/providers");
async function suggest(cfg, b) {
  const who = cfg.owner || "the owner";
  const where = { gmail: "an email", slack: "a Slack message", instagram: "an Instagram message", whatsapp: "a WhatsApp message from a customer" }[b.app] || "a message";
  if (b.mode === "caption") {
    const r = await brain().chat(cfg, {
      system: "You are Tia, a social media assistant. Rewrite this Instagram caption so the first line stops the scroll, keep the same language, voice and topic, add one call to action and 3-5 relevant hashtags at the end. Max 600 characters. Return only the caption.",
      prompt: `Caption: ${String(b.text || "").slice(0, 2000)}
Numbers: ${b.stats || "-"}`,
    });
    return { text: String(r.text || "").trim(), via: r.via };
  }
  if (b.mode === "compose") {
    // a NEW mail from a few words ("ask Ieva if Friday works for the worktop") – facts from the business vault
    const ctx = b.vault ? require("../brain/vault").contextFor(cfg, `${b.to || ""} ${b.subject || ""} ${b.text || ""}`).text.slice(0, 9000) : "";
    const r = await brain().ask(cfg, {
      system: `You are Tia, the assistant of ${who}${cfg.business ? ` at ${cfg.business}` : ""}. Write one short, friendly, ready-to-send email from the owner (first person, signed with the owner's first name). Use only facts from the notes and the business facts; never invent prices or dates.${ctx ? `\n\nBusiness facts:\n${ctx}` : ""}`,
      schema: { type: "object", additionalProperties: false, properties: { subject: { type: "string" }, text: { type: "string" } }, required: ["subject", "text"] },
      prompt: `To: ${b.to || "(not given)"}\nSubject: ${b.subject || "(write one)"}\nWhat it should say: ${String(b.text || "").slice(0, 2000)}`,
    });
    return { subject: String(r.answer.subject || "").trim(), text: String(r.answer.text || "").trim(), via: r.via };
  }
  // Messages to the business itself (WhatsApp Business number) are answered from the business vault – the notes Tia
  // reads light up live in the Vault tab. The owner's private inbox apps get no vault context.
  let facts = "";
  if (b.vault) {
    const ctx = require("../brain/vault").contextFor(cfg, String(b.text || ""));
    facts = `\n\nWhat you know about the business (use these facts; anything not here – don't promise it, offer to check):\n${ctx.text.slice(0, 9000)}`;
  }
  const r = await brain().chat(cfg, {
    system: `You are Tia, the assistant of ${who}${b.vault && cfg.business ? ` at ${cfg.business}` : ""}. Write a short, friendly, ready-to-send reply to ${where}. Same language as the message. No subject line, no placeholders like [Name] – if a fact is missing, write the reply so it asks for it. Never promise or invent dates, prices or facts that are not in the message${b.vault ? " or the business facts below" : ""}.${facts} If nobody should answer it (no-reply sender, automatic notification, security alert, newsletter, receipt), return exactly: NO_REPLY: <one short sentence what it is and what the owner should do, if anything>. Otherwise return only the reply text.`,
    prompt: `From: ${b.from || ""} <${b.address || ""}>\nSubject: ${b.subject || ""}\n\n${String(b.text || "").slice(0, 3000)}`,
  });
  const text = String(r.text || "").trim();
  const m = text.match(/^NO_REPLY:\s*([\s\S]*)/i);
  if (m) return { text: "", skip: m[1].trim() || "No reply needed.", via: r.via };
  return { text, via: r.via };
}
async function linkedinPost(cfg, b) {
  const p = (await linkedin(cfg).catch(() => ({ profile: {} }))).profile || {};
  const r = await brain().chat(cfg, {
    system: `You are Tia, a ghostwriter for ${p.name || cfg.owner}${p.headline ? ` (${p.headline})` : ""}. Write one LinkedIn post: a strong first line, short paragraphs, concrete details, one question at the end, max 3 hashtags. No emojis in every line, no buzzwords like "game-changer", "thrilled", "delve". Use ONLY facts from the topic or draft: never invent numbers, percentages, testers, customers, results or features – if a detail would help, write around it. Return only the post.`,
    prompt: `Topic / notes: ${String(b.topic || "").slice(0, 1500)}${b.draft ? `\n\nImprove this draft instead of starting over:\n${String(b.draft).slice(0, 3000)}` : ""}`,
  });
  return { text: String(r.text || "").trim(), via: r.via };
}

const REVIEW_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", description: "0-100, how well this ad is doing for its goal" },
    verdict: { type: "string", description: "one short sentence" },
    works: { type: "array", items: { type: "string" }, description: "max 3, what is good" },
    problems: { type: "array", items: { type: "string" }, description: "max 3, each tied to a number" },
    tips: { type: "array", items: { type: "string" }, description: "max 4 concrete next steps" },
    headline: { type: "string", description: "improved headline, max 40 characters" },
    text: { type: "string", description: "improved primary text, same language, max 600 characters" },
    budget: { type: "string", description: "one sentence on budget/targeting" },
  },
  required: ["score", "verdict", "works", "problems", "tips", "headline", "text", "budget"],
};
// Simple benchmarks Tia compares against (Meta averages across industries – rough, said as such on screen)
const BENCH = { ctr: 1.5, cpc: 1.0, cpm: 10 };
async function reviewAd(cfg, b) {
  const file = path.join(dir(cfg), "ad-reviews.json");
  const all = readJ(file, {});
  const key = `${b.ad.id}:${b.ad.text.length}:${b.ad.spend}`;
  if (!b.fresh && all[key]) return all[key];
  const a = b.ad;
  const facts = [
    `Ad: ${a.name} (status ${a.status}); campaign "${b.campaign && b.campaign.name}", goal ${b.campaign && b.campaign.objective}.`,
    `Headline: ${a.headline || "(none)"}`, `Primary text: ${a.text || "(none)"}`, `Button: ${a.cta || "(none)"}`,
    `Results (whole life): spent ${a.spend} ${b.currency || "EUR"}, impressions ${a.impressions}, reach ${a.reach}, clicks ${a.clicks}, link clicks ${a.linkClicks}, CTR ${a.ctr ?? "-"}%, CPC ${a.cpc ?? "-"}, CPM ${a.cpm ?? "-"}, add-to-carts ${a.carts}, purchases ${a.purchases}, leads ${a.leads}.`,
    `Rough Meta averages: CTR ~${BENCH.ctr}%, CPC ~${BENCH.cpc} EUR, CPM ~${BENCH.cpm} EUR.`,
  ].join("\n");
  const r = await brain().ask(cfg, {
    system: [
      "You are Tia, a careful performance-marketing assistant for a small business owner.",
      "Judge the ad only from the numbers and text given; tie every problem to a number. Never invent results.",
      "Under ~1000 impressions there is too little data: say so in the verdict and judge the text, not the numbers.",
      "Rewrite for real (not a copy with small edits): the first 125 characters must hook on their own (that is what shows before 'See more'),",
      "one clear promise, one proof, one call to action, max 450 characters, same language and product, no clichés like 'game-changer'.",
      "Headline: max 40 characters, a benefit or the offer, not the product name alone.",
      "Never add facts that are not in the original ad: no new numbers, customer counts, reviews, guarantees or prices.",
      "Budget advice: only from spend and results; you do not know the targeting, so don't describe it.",
    ].join(" "),
    schema: REVIEW_SCHEMA,
    prompt: facts,
  });
  const out = { ...r.answer, via: r.via, at: new Date().toISOString(), bench: BENCH };
  all[key] = out;
  writeJ(file, all);
  return out;
}

// ---------- Instagram account review: what works, what to fix, the next post (numbers from the account only) ----------
const IG_REVIEW_SCHEMA = {
  type: "object", additionalProperties: false,
  required: ["score", "verdict", "working", "fix", "next_post_idea", "next_post_caption"],
  properties: {
    score: { type: "number", description: "0-100: how well the account's recent posts perform for its size" },
    verdict: { type: "string", description: "One spoken sentence: the main finding, tied to a number." },
    working: { type: "array", items: { type: "string" }, description: "2-3 things that work, each tied to a post or number" },
    fix: { type: "array", items: { type: "string" }, description: "2-3 concrete improvements, each tied to a number" },
    next_post_idea: { type: "string", description: "One post idea built on what already works" },
    next_post_caption: { type: "string", description: "A ready caption for that post in the account's language and voice, hook first, one call to action, 3-5 hashtags" },
  },
};
async function instagramReview(cfg, fresh) {
  const d = await instagram(cfg);
  const file = path.join(dir(cfg), "ig-review.json");
  const old = readJ(file, null);
  const key = `${d.profile.username}:${d.posts.map((p) => p.id).join(",")}`;
  if (!fresh && old && old.key === key) return old.review;
  const lines = d.posts.map((p, i) => `${i + 1}. ${p.date} ${p.type} – views ${p.views ?? "-"}, reach ${p.reach ?? "-"}, likes ${p.likes}, comments ${p.comments}, saves ${p.saved ?? "-"}, shares ${p.shares ?? "-"} – caption: ${String(p.caption || "").replace(/\s+/g, " ").slice(0, 160)}`);
  const r = await brain().ask(cfg, {
    system: "You are Tia, a careful social-media analyst for a small business owner. Judge only from the numbers and captions given, tie every point to a number or a post date, never invent results, followers or facts. Short, plain sentences.",
    schema: IG_REVIEW_SCHEMA,
    prompt: `Instagram @${d.profile.username} (${d.profile.type}): ${d.profile.followers} followers, ${d.profile.posts} posts. Bio: ${d.profile.bio}
Last ${d.posts.length} posts, newest first:
${lines.join("\n")}`,
  });
  const review = { ...r.answer, score: Math.max(0, Math.min(100, Math.round(Number(r.answer.score) || 0))), via: r.via, at: new Date().toISOString() };
  writeJ(file, { key, review });
  return review;
}

// ---------- images from the apps' CDNs (the screen's CSP only loads our own address) ----------
const IMG_HOSTS = /(^|\.)(fbcdn\.net|cdninstagram\.com|licdn\.com|slack-edge\.com|googleusercontent\.com)$/i;
function image(u, res) {
  let url;
  try {
    url = new URL(u);
  } catch {
    res.writeHead(400);
    return res.end();
  }
  if (url.protocol !== "https:" || !IMG_HOSTS.test(url.hostname)) {
    res.writeHead(403);
    return res.end();
  }
  https
    .get(url, { headers: { "user-agent": "Mozilla/5.0 Tia" } }, (r) => {
      if (r.statusCode !== 200 || !/^image\//.test(r.headers["content-type"] || "")) {
        r.resume();
        res.writeHead(502);
        return res.end();
      }
      res.writeHead(200, { "content-type": r.headers["content-type"], "cache-control": "private, max-age=3600" });
      r.pipe(res);
    })
    .on("error", () => (res.writeHead(502), res.end()));
}

// ---------- Google Calendar: the week, add an event (the owner presses Add), Tia turns a sentence into an event ----------
// Google Calendar's event colours (colorId 1–11, as the Calendar web app shows them); no colorId = the calendar's colour
const GC_COLORS = { 1: "#7986CB", 2: "#33B679", 3: "#8E24AA", 4: "#E67C73", 5: "#F6BF26", 6: "#F4511E", 7: "#039BE5", 8: "#616161", 9: "#3F51B5", 10: "#0B8043", 11: "#D50000" };
async function calendar(cfg, week) {
  const start = new Date(`${week || new Date().toISOString().slice(0, 10)}T00:00:00`);
  const end = new Date(start.getTime() + 7 * 864e5);
  const data = await C.execute("GOOGLECALENDAR_EVENTS_LIST", { calendarId: "primary", timeMin: start.toISOString(), timeMax: end.toISOString(), singleEvents: true, orderBy: "startTime", maxResults: 100 });
  const items = data.items || data.events || [];
  return {
    account: ((await status(cfg)).calendar || {}).name || "",
    events: items.map((e) => ({
      id: e.id, title: e.summary || "(no title)", location: e.location || "", description: String(e.description || "").slice(0, 400), link: e.htmlLink || "",
      allDay: !!(e.start && e.start.date), start: (e.start && (e.start.dateTime || e.start.date)) || "", end: (e.end && (e.end.dateTime || e.end.date)) || "",
      color: GC_COLORS[e.colorId] || "#039BE5",
    })),
  };
}
async function addEvent(cfg, b) {
  const title = String(b.title || "").trim();
  if (!title || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(String(b.start || ""))) throw new Error("title and start time are needed");
  const minutes = Math.max(15, Math.min(24 * 60, Number(b.minutes) || 60));
  const r = await C.execute("GOOGLECALENDAR_CREATE_EVENT", {
    calendar_id: "primary", summary: title, start_datetime: String(b.start).slice(0, 16) + ":00", timezone: cfg.timezone || "Europe/Riga",
    event_duration_hour: Math.floor(minutes / 60), event_duration_minutes: minutes % 60, location: String(b.location || ""), description: String(b.description || ""), send_updates: false,
  });
  return { ok: true, id: r.id || (r.response_data && r.response_data.id) || "", link: r.htmlLink || (r.response_data && r.response_data.htmlLink) || "" };
}
async function parseEvent(cfg, b) {
  const r = await brain().ask(cfg, {
    system: "Turn the owner's sentence into ONE calendar event. Dates relative to TODAY. Use 24h time. If no time is given, choose 10:00. If no length is given, 60 minutes. Keep the title short (max 6 words) and in the owner's language.",
    schema: { type: "object", additionalProperties: false, properties: { title: { type: "string" }, date: { type: "string", description: "YYYY-MM-DD" }, time: { type: "string", description: "HH:MM" }, minutes: { type: "integer" }, location: { type: "string" } }, required: ["title", "date", "time", "minutes", "location"] },
    prompt: `TODAY: ${b.today || new Date().toISOString().slice(0, 10)} (${new Date(b.today || Date.now()).toLocaleDateString("en-GB", { weekday: "long" })})
Sentence: ${String(b.text || "").slice(0, 500)}`,
  });
  return r.answer;
}

module.exports = { status, gmail, outlook, slack, instagram, instagramReview, linkedin, ads, drafts, saveDraft, suggest, linkedinPost, reviewAd, image, calendar, addEvent, parseEvent };
