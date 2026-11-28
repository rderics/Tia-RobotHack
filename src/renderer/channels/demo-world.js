// The fictional business's everyday history in the app look-alikes (public demo + the desktop's demo mode):
// older mail, Sent Items, Drafts, WhatsApp chats with their history, Slack channels and DMs, the Instagram profile.
// Everything here is invented (Oakline Studio, .example domains, no real people). The messages Tia works on
// today come from demo/inbox.json (channels/store.js) – this file is only the "life around them".
// d = how many days ago (0 = today), t = time.
(function () {
  const ME = "Mārtiņš Ozols";
  const BOX = "info@oakline-studio.example";

  // Tia's mail categories (Outlook colour categories / Gmail labels on the live Tia)
  const CATS = {
    "Action needed": { color: "#D13438", bg: "#FDE7E9" },
    Suspicious: { color: "#A4262C", bg: "#F9D3D6" },
    Clients: { color: "#0F6CBD", bg: "#DEECF9" },
    Leads: { color: "#107C10", bg: "#DFF6DD" },
    Suppliers: { color: "#CA5010", bg: "#FDE7D9" },
    Finance: { color: "#986F0B", bg: "#FFF4CE" },
    Team: { color: "#8764B8", bg: "#EFE6F8" },
    Updates: { color: "#038387", bg: "#DAF2F2" },
    Newsletters: { color: "#605E5C", bg: "#EDEBE9" },
  };
  // what Tia decided for today's demo mails (demo/inbox.json ids)
  const DESK_CATS = { m01: ["Suppliers"], m04: ["Leads"], m05: ["Clients", "Action needed"], m07: ["Suspicious"], m08: ["Finance", "Action needed"], m10: ["Newsletters"], m12: ["Clients"] };

  const mail = [
    { id: "w_m1", folder: "inbox", d: 1, t: "17:52", from: "Elīna Zariņa", address: "elina@oakline-studio.example", subject: "Install schedule 1–5 December", cats: ["Team"], read: true,
      text: "Hi Mārtiņš,\n\nhere is next week's plan:\nMon – Kalniņa, Teika (measurement 10:00)\nTue – Vītola, Brīvības iela 120 (countertops + finishing)\nWed – Bērziņa, Ganību dambis (start)\nThu – workshop day\nFri – Kalniņa, Teika (measurement moved to 15:00 if she confirms)\n\nKaspars and Jānis are on all installs. Let me know if anything changes.\n\nElīna" },
    { id: "w_m2", folder: "inbox", d: 1, t: "15:10", from: "Ieva Bērziņa", address: "ieva.berzina@example.com", subject: "Re: Contract – kitchen, Ganību dambis", cats: ["Clients"], read: true,
      text: "Thank you, Mārtiņš! The contract looks good. I'll sign it tonight and send it back. Can we choose the handles at the showroom on Saturday?\n\nIeva" },
    { id: "w_m3", folder: "inbox", d: 1, t: "11:24", from: "Kaspars Liepiņš", address: "kaspars@oakline-studio.example", subject: "Photos – Kalnciema iela finished", cats: ["Team"], read: true, attach: "IMG_2231.jpg, IMG_2232.jpg, IMG_2236.jpg",
      text: "All done at the Eglītis kitchen. Photos attached – the oak island came out great. Roberts said he'll leave a review.\n\nKaspars" },
    { id: "w_m4", folder: "inbox", d: 2, t: "16:03", from: "Arhitektu birojs Smilga", address: "projects@smilga-arch.example", subject: "Mežaparks villa – kitchen + library wall", cats: ["Leads"], read: true,
      text: "Good afternoon,\n\nwe are designing a villa in Mežaparks and our client wants a custom kitchen (approx. 5.5 m + island) and a library wall in the living room. Could you prepare a rough estimate? Drawings attached.\n\nKind regards,\nAnda Smilga" },
    { id: "w_m5", folder: "inbox", d: 2, t: "09:41", from: "Hettich Baltic", address: "orders@hettich-baltic.example", subject: "Order confirmation HB-24117", cats: ["Suppliers"], read: true,
      text: "Thank you for your order HB-24117.\n\n40 × Sensys hinges 110°\n12 × InnoTech Atira drawer sets 470 mm\n\nDelivery to Ķekava workshop: Thursday, 4 December." },
    { id: "w_m6", folder: "inbox", d: 3, t: "13:15", from: "Swedbank", address: "noreply@bank.example", subject: "Your November account statement is ready", cats: ["Finance"], read: true,
      text: "Your statement for November 2026 is available in Internet Bank. This is an automatic message." },
    { id: "w_m7", folder: "inbox", d: 3, t: "08:02", from: "Google Business Profile", address: "noreply@business.example", subject: "You got a new 5-star review", cats: ["Updates"], read: true,
      text: "Oakline Studio has a new review: ★★★★★ \"Precise, on time and the kitchen is beautiful. Thank you Kaspars and team!\" – Evija L." },
    { id: "w_m8", folder: "inbox", d: 4, t: "10:30", from: "EGGER Decors", address: "news@egger.example", subject: "New decors 2027 – samples ready", cats: ["Newsletters"], read: true,
      text: "Discover the EGGER Decorative Collection 2027: 22 new oak and stone decors. Order free samples for your studio." },
    { id: "w_m9", folder: "inbox", d: 5, t: "07:15", from: "Latvenergo", address: "rekini@energy.example", subject: "Rēķins par elektroenerģiju – novembris", cats: ["Finance"], read: true,
      text: "Rēķins Nr. 26-114583 par novembri: 184,20 EUR. Apmaksas termiņš 15.12.2026." },
    { id: "w_m10", folder: "inbox", d: 6, t: "14:44", from: "Līga Upīte", address: "liga@oakline-studio.example", subject: "Instagram plan for December", cats: ["Team"], read: true,
      text: "Hi! December posts: Eglītis kitchen reveal (Mon), workshop reel (Wed), Christmas opening hours (Fri), Ganību dambis before/after when it's done. Ok?" },
    { id: "w_j1", folder: "junk", d: 2, t: "03:12", from: "Prize Center", address: "win@prize-center.example", subject: "Congratulations! You have won an iPhone 17", cats: ["Suspicious"], read: false,
      text: "Click here to claim your prize within 24 hours." },
    // Sent Items
    { id: "w_s1", folder: "sent", d: 1, t: "14:02", from: "Ieva Bērziņa", address: "ieva.berzina@example.com", subject: "Contract – kitchen, Ganību dambis", cats: ["Clients"], read: true, attach: "Contract – Ieva Bērziņa.pdf",
      text: "Hi Ieva,\n\nthe contract for your kitchen is attached – 6 weeks from signing, 40% deposit. Any questions, just call me.\n\nMārtiņš Ozols\nOakline Studio" },
    { id: "w_s2", folder: "sent", d: 2, t: "17:20", from: "Arhitektu birojs Smilga", address: "projects@smilga-arch.example", subject: "Re: Mežaparks villa – kitchen + library wall", cats: ["Leads"], read: true,
      text: "Hello Anda,\n\nthank you – a beautiful project. We'll send a rough estimate by Friday. Could we visit the site next week?\n\nMārtiņš" },
    { id: "w_s3", folder: "sent", d: 3, t: "10:05", from: "Ojārs – Kokmateriāli Baltic", address: "orders@kokmateriali-baltic.example", subject: "Order: quartz worktops for Vītola", cats: ["Suppliers"], read: true,
      text: "Hi Ojārs,\n\nplease cut the 2 quartz worktops (Calacatta, 20 mm) per the attached drawing. Delivery to Brīvības iela 120.\n\nThanks,\nMārtiņš" },
    { id: "w_s4", folder: "sent", d: 7, t: "16:48", from: "Ilze – grāmatvede", address: "ilze@gramatvede.example", subject: "September receipts", cats: ["Finance"], read: true,
      text: "Hi Ilze, all September receipts are in the shared folder. Mārtiņš" },
    // Drafts
    { id: "w_d1", folder: "drafts", d: 0, t: "08:12", from: "Partners", address: "partners@oakline-studio.example", subject: "Price list 2027 for partner studios", cats: ["Leads"], read: true,
      text: "Hello,\n\nfrom January our partner prices for custom kitchens start at 780 €/m. Referral partners get 10% of every signed contract…" },
  ];

  // ---------- WhatsApp ----------
  // msgs: [dir, text, d, t, extra] – dir "in" | "out"; extra: { from } in groups
  const wa = [
    { id: "wa_team", name: "Oakline komanda 🛠", group: true, members: "Elīna, Kaspars, Jānis, Agnese, Ivo, Līga, You", pinned: true,
      msgs: [["in", "Rīt 8:30 Teikā, ņemam lielo kāpni", 1, "18:40", { from: "Kaspars" }], ["in", "Ok 👍", 1, "18:42", { from: "Jānis" }], ["in", "Ivo, vai Vītolas fasādes gatavas?", 0, "07:55", { from: "Elīna" }], ["in", "Gatavas, piektdien lakoju pēdējās", 0, "08:10", { from: "Ivo" }], ["out", "Super, paldies visiem 🙌", 0, "08:14"]] },
    { id: "wa_ieva", name: "Ieva Bērziņa", msgs: [["in", "Labdien! Vai līgumu var parakstīt ar Smart-ID?", 1, "13:20"], ["out", "Labdien, Ieva! Jā, protams – nosūtīju uz e-pastu.", 1, "14:05"], ["in", "Paldies, parakstīšu šovakar 👍", 1, "14:07"]] },
    { id: "wa_kaspars", name: "Kaspars Liepiņš", msgs: [["in", "Eglītim viss uzstādīts, bildes e-pastā", 1, "11:20"], ["out", "Izskatās lieliski! Paldies 💪", 1, "11:31"], ["in", "Rīt sākam ar Vītolu 8:00", 0, "07:40"]] },
    { id: "wa_ojars", name: "Ojārs (Kokmateriāli)", msgs: [["out", "Ojār, vai kvarca virsmas būs līdz piektdienai?", 2, "10:12"], ["in", "Jā, ceturtdien 9:00 vedam uz Brīvības ielu", 2, "10:30"]] },
    { id: "wa_roberts", name: "Roberts Eglītis", msgs: [["in", "Virtuve ir fantastiska, paldies jums!", 1, "19:02"], ["out", "Paldies, Robert! Priecājamies 😊", 1, "19:15"]] },
    { id: "wa_juris", name: "Juris – elektriķis", msgs: [["out", "Juri, vai trešdien vari pieslēgt plīti Ganību dambī?", 3, "12:00"], ["in", "Varu pēc 14:00", 3, "12:40"], ["out", "Lieliski, sarunāts", 3, "12:41"]] },
    { id: "wa_agnese", name: "Agnese Kalēja", msgs: [["in", "Nosūtīju Smilgas villai 3 variantus 🎨", 2, "17:05"], ["out", "Paskatīšos vakarā", 2, "17:30"]] },
  ];
  // earlier messages before today's demo WhatsApp (by phone number / name)
  const waHistory = {
    "Anna Kalniņa": [["in", "Labdien! Vai varam sarunāt mērīšanu virtuvei Teikā?", 4, "10:15"], ["out", "Labdien, Anna! Piektdien 10:00 der?", 4, "10:40"], ["in", "Jā, lieliski! 👍", 4, "10:42"]],
  };

  // ---------- Slack ----------
  const slack = {
    ws: "Oakline Studio",
    channels: [
      { name: "#general", topic: "Company-wide announcements", members: 8 },
      { name: "#install-team", topic: "Installs, sites, tools", members: 5 },
      { name: "#office", topic: "Office, orders, schedule", members: 6 },
      { name: "#orders", topic: "Supplier orders and deliveries", members: 4 },
      { name: "#social-media", topic: "Instagram, reviews, photos", members: 4 },
      { name: "#random", topic: "Non-work banter", members: 8 },
    ],
    people: { "Elīna Zariņa": "active", "Kaspars Liepiņš": "active", "Jānis Krūmiņš": "away", "Agnese Kalēja": "active", "Ivo Sproģis": "away", "Līga Upīte": "active" },
    // [channel, from, text, d, t, { reactions, replies }]
    msgs: [
      ["#general", "Elīna Zariņa", "Reminder: Christmas party on 19 December at the workshop 🎄 Partners welcome!", 3, "09:00", { reactions: [["🎉", 6], ["🙌", 3]] }],
      ["#general", ME, "Great November everyone – 7 kitchens installed and 5 new 5-star reviews. Thank you! 💪", 2, "18:10", { reactions: [["🔥", 7], ["❤️", 4]] }],
      ["#install-team", "Jānis Krūmiņš", "Need a new 18V battery for the Makita, the old one is dead", 1, "16:20", { replies: 2 }],
      ["#install-team", "Kaspars Liepiņš", "Eglītis kitchen is finished ✅ photos in #social-media", 1, "11:22", { reactions: [["👏", 4]] }],
      ["#office", "Agnese Kalēja", "Smilga villa – 3 layout options are in the shared drive (Projects/Smilga)", 2, "17:02", { replies: 3 }],
      ["#office", "Elīna Zariņa", "Hettich order HB-24117 confirmed, arrives Thursday", 2, "09:50", {}],
      ["#orders", "Ivo Sproģis", "Low on 18 mm oak veneer boards – 6 left. Order 20 more?", 1, "08:30", { replies: 1 }],
      ["#orders", "Elīna Zariņa", "Ordered from Kokmateriāli Baltic, delivery Monday", 1, "10:05", { reactions: [["👍", 2]] }],
      ["#social-media", "Līga Upīte", "Eglītis reveal post is scheduled for Monday 18:00 📸", 1, "15:40", { reactions: [["😍", 3]] }],
      ["#social-media", "Līga Upīte", "Last week's reel got 12k views – best this year!", 4, "12:12", { reactions: [["🚀", 5]] }],
      ["#random", "Ivo Sproģis", "Who took my good chisel again 😅", 1, "13:33", { reactions: [["😂", 5]] }],
      ["#random", "Agnese Kalēja", "Cake in the office kitchen 🍰", 0, "08:40", { reactions: [["🍰", 4]] }],
    ],
    dms: {
      "Elīna Zariņa": [["Elīna Zariņa", "Can you sign the Hettich invoice today?", 0, "08:20"], [ME, "Yes, after lunch", 0, "08:26"]],
      "Kaspars Liepiņš": [["Kaspars Liepiņš", "Vītola doesn't like the colour on site – I'll post in #install-team", 0, "09:40"]],
      "Līga Upīte": [["Līga Upīte", "Can Tia write the caption for the Eglītis reveal?", 1, "15:42"]],
    },
  };

  // ---------- Instagram (@oakline.studio) ----------
  // art: which illustration (see apps.js igArt); stats are the numbers Tia reads
  const ig = {
    profile: { username: "oakline.studio", name: "Oakline Studio", category: "Interior design studio", bio: "Custom kitchens & built-in furniture · Riga 🌲\nMade in our Ķekava workshop since 2017\n📩 Free measurement – DM or link below", link: "oakline-studio.example", posts: 214, followers: 3482, following: 612 },
    highlights: ["Kitchens", "Workshop", "Reviews", "Before/After", "Team"],
    posts: [
      { id: "p1", art: "k-oak", date: "2026-11-27", likes: 412, comments: 38, views: null, reach: 5120, saved: 96, shares: 21, caption: "The Eglītis kitchen on Kalnciema iela ✨ Solid oak island, quartz worktop, handle-less fronts. Swipe for the details →" },
      { id: "p2", art: "reel-workshop", type: "VIDEO", date: "2026-11-24", likes: 865, comments: 54, views: 12400, reach: 9800, saved: 210, shares: 88, caption: "From a raw oak board to a kitchen front – 60 seconds in our Ķekava workshop 🎬" },
      { id: "p3", art: "k-sage", date: "2026-11-20", likes: 298, comments: 17, views: null, reach: 3900, saved: 64, shares: 9, caption: "Sage green + brass. Kitchen in Teika, 4.2 m." },
      { id: "p4", art: "quote-review", date: "2026-11-17", likes: 184, comments: 12, views: null, reach: 2600, saved: 11, shares: 4, caption: "Thank you Evija for the kind words ★★★★★" },
      { id: "p5", art: "k-navy", date: "2026-11-13", likes: 356, comments: 29, views: null, reach: 4400, saved: 88, shares: 15, caption: "Navy blue never goes out of style. Mežaparks, 5.1 m with a pantry wall." },
      { id: "p6", art: "before-after", date: "2026-11-09", likes: 521, comments: 47, views: null, reach: 6700, saved: 132, shares: 40, caption: "Before → After. A Soviet-era kitchen in Imanta, 6 weeks later." },
      { id: "p7", art: "k-black", date: "2026-11-05", likes: 267, comments: 15, views: null, reach: 3500, saved: 51, shares: 6, caption: "Black oak and warm light. Jūrmala summer house." },
      { id: "p8", art: "tips", date: "2026-11-01", likes: 143, comments: 9, views: null, reach: 2100, saved: 74, shares: 18, caption: "5 things to decide before your kitchen measurement 📏" },
      { id: "p9", art: "k-white", date: "2026-10-28", likes: 231, comments: 13, views: null, reach: 3100, saved: 39, shares: 5, caption: "Bright, simple, handle-less. Ziepniekkalns apartment." },
      { id: "p10", art: "reel-install", type: "VIDEO", date: "2026-10-24", likes: 602, comments: 31, views: 8900, reach: 7100, saved: 120, shares: 52, caption: "Install day timelapse ⏱️ 8 hours in 30 seconds" },
      { id: "p11", art: "k-terra", date: "2026-10-20", likes: 204, comments: 11, views: null, reach: 2800, saved: 33, shares: 3, caption: "Terracotta tiles + oak. Āgenskalns." },
      { id: "p12", art: "team", date: "2026-10-16", likes: 318, comments: 41, views: null, reach: 3600, saved: 8, shares: 6, caption: "Meet the team behind every kitchen 🙌" },
    ],
    // Tia's review of these numbers (the live Tia makes it from the real account)
    review: {
      score: 72,
      verdict: "Good engagement for a local studio – videos and before/after posts work best, plain photos and text posts much less.",
      working: ["Reels reach 2–3× more people than photos (12.4k views on the workshop reel)", "Before → After posts get the most saves (132) – people keep them for their own renovation", "Real project names and districts make the posts feel local and trusted"],
      fix: ["Post 2 reels a week – right now it's one every 2–3 weeks", "Start every caption with the result, not the place (\"6 weeks, 1 kitchen, 0 stress\")", "Add a call to action – \"DM 'MEASURE' for a free measurement\" – only 2 of 12 posts ask for anything", "Answer every comment within an hour: posts with replies got 40% more reach"],
      next_post_idea: "A 30-second reel: the Ganību dambis kitchen, from the empty room to the finished kitchen, with Kaspars explaining one clever detail.",
    },
  };

  window.TiaWorld = { ME, BOX, CATS, DESK_CATS, mail, wa, waHistory, slack, ig };
})();
