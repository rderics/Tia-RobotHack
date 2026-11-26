// Fictional data for the demo business (Oakline Studio) – used on the public replay and when the screen is set to
// "demo". The live Tia shows the owner's real Meta Ads / LinkedIn / Instagram instead (connectors/live.js).
(function () {
  const k = (spend, impressions, reach, clicks, leads) => ({
    spend, impressions, reach, clicks, linkClicks: Math.round(clicks * 0.8), ctr: +((clicks / impressions) * 100).toFixed(2), cpc: +(spend / clicks).toFixed(2), cpm: +((spend / impressions) * 1000).toFixed(2), leads, purchases: 0, carts: 0, results: leads,
  });
  const ads = [
    { id: "d_ad1", name: "Kitchen – before/after video", status: "ACTIVE", campaignId: "d_c1", headline: "Free kitchen measuring in Riga", text: "Your kitchen, made to measure in oak. We design it, build it in our workshop in Riga and fit it in one day. Book a free measuring visit this month.", cta: "BOOK_NOW", image: "", ...k(286.4, 24310, 14200, 301, 7) },
    { id: "d_ad2", name: "Kitchen – showroom photo", status: "ACTIVE", campaignId: "d_c1", headline: "Oakline Studio", text: "Oakline Studio is a Riga-based interior studio founded in 2016. We offer custom furniture, kitchens, wardrobes and interior design services for private clients and businesses. Contact us to learn more about our services and prices.", cta: "LEARN_MORE", image: "", ...k(125.9, 14110, 9020, 101, 2) },
    { id: "d_ad3", name: "Wardrobe – spring offer", status: "PAUSED", campaignId: "d_c2", headline: "-15% wardrobes until 31.03", text: "Spring clean-out? A built-in wardrobe fits 2x more than a free-standing one. -15% on all wardrobes ordered until 31 March.", cta: "SHOP_NOW", image: "", ...k(188.1, 30200, 18400, 187, 2) },
    { id: "d_ad4", name: "Retargeting – visited price page", status: "ACTIVE", campaignId: "d_c3", headline: "Still thinking about your kitchen?", text: "You looked at our price list – here is what Ieva from Mārupe said after her oak kitchen: “Fitted in one day, not a crumb left behind.” Free measuring, answer within 24 h.", cta: "BOOK_NOW", image: "", ...k(96.4, 6850, 3100, 199, 6) },
  ];
  const sum = (list, f) => list.reduce((a, x) => a + (x[f] || 0), 0);
  const camp = (id, name, status, objective, budget, created) => {
    const mine = ads.filter((a) => a.campaignId === id);
    const spend = +sum(mine, "spend").toFixed(2);
    const impressions = sum(mine, "impressions");
    const clicks = sum(mine, "clicks");
    return { id, name, status, objective, budget, created, spend, impressions, reach: Math.round(sum(mine, "reach") * 0.85), clicks, linkClicks: sum(mine, "linkClicks"), ctr: +((clicks / impressions) * 100).toFixed(2), cpc: +(spend / clicks).toFixed(2), cpm: +((spend / impressions) * 1000).toFixed(2), leads: sum(mine, "leads"), purchases: 0, carts: 0, results: sum(mine, "leads"), ads: mine.map((a) => a.id) };
  };
  const reviews = {
    d_ad1: { score: 78, verdict: "Your best ad: the most leads at a good price – keep it running.", works: ["CTR 1.24% is close to the ~1.5% average", "7 bookings at 40.91 € each – your best cost per lead", "The offer (free measuring) is in the headline"], problems: ["CPM 11.78 € is a little above the ~10 € average", "The first line doesn't say ‘Riga’ – people outside Riga click too"], tips: ["Start the text with the place: ‘Riga: …’", "Move 30 € from the showroom ad to this one", "Try a 15-second version of the video – most watch under 10 s"], headline: "Riga: free kitchen measuring", text: "Riga: your oak kitchen, measured for free this month. We design it, build it in our own workshop and fit it in one day – no mess left behind. 2 measuring slots left this week. Book yours now.", budget: "Raise this ad's budget by ~30% using money from the showroom ad; keep the audience to Riga + 25 km." },
    d_ad2: { score: 31, verdict: "Expensive and vague: 62.95 € per lead and a third of the video ad's clicks.", works: ["Real showroom photo builds trust", "Clear company name"], problems: ["CTR 0.72% is half the ~1.5% average", "2 leads for 125.90 € = 62.95 € per lead", "The first 125 characters are about the company, not the customer"], tips: ["Lead with the customer's problem, not the company history", "One offer: free measuring or a price from-…", "Swap ‘Learn more’ for ‘Book now’", "Pause it if the new version is under 1% CTR after 3 days"], headline: "Kitchens from 4 900 € – fitted in 1 day", text: "Tired of a kitchen that doesn't fit your room? We make it to measure in oak – from 4 900 €, fitted in one day. See the showroom photo, then book a free measuring visit in Riga.", budget: "Cut this ad to 5 €/day while the new text is tested; move the rest to the video ad." },
    d_ad3: { score: 44, verdict: "Good offer, weak click rate – it was paused at the right time.", works: ["Clear deadline (31.03)", "A concrete benefit: 2x more space"], problems: ["CTR 0.62% is well below ~1.5%", "2 leads for 188.10 € = 94.05 € per lead"], tips: ["Show a filled wardrobe, not an empty one", "Restart only with a new picture, in early March", "Aim at people who visited the wardrobe page"], headline: "2x more space in the same wall", text: "Same wall, twice the space: a built-in oak wardrobe fits 2x more than a free-standing one. -15% on all wardrobes ordered until 31 March – we measure for free.", budget: "Keep it paused; restart in March at 8 €/day for website visitors only." },
    d_ad4: { score: 91, verdict: "Excellent: 2.91% CTR and 16.07 € per lead – the cheapest leads you have.", works: ["CTR 2.91% is about double the average", "A real customer quote", "‘Answer within 24 h’ removes doubt"], problems: ["Small audience: only 3 100 people reached – it will tire out soon"], tips: ["Widen the audience to all website visitors from the last 60 days", "Add a second quote so people don't see the same ad too often"], headline: "Still thinking about your kitchen?", text: "You looked at our price list – here is what Ieva from Mārupe said after her oak kitchen: “Fitted in one day, not a crumb left behind.” Free measuring, answer within 24 h.", budget: "Raise to 6 €/day and widen to 60-day website visitors – this is your cheapest lead." },
  };
  window.TiaDemoData = {
    ads: {
      range: { since: "2026-09-01", until: "2026-11-19" },
      accounts: [
        { id: "act_demo", name: "Oakline Studio", currency: "EUR", ads, campaigns: [camp("d_c1", "Kitchens – Riga – leads", "ACTIVE", "leads", "25.00/day", "2026-09-01"), camp("d_c2", "Wardrobes – spring offer", "PAUSED", "leads", "12.00/day", "2026-03-01"), camp("d_c3", "Retargeting – website visitors", "ACTIVE", "leads", "5.00/day", "2026-09-15")] },
      ],
    },
    reviews,
    linkedin: { profile: { name: "Mārtiņš Ozols", headline: "Founder, Oakline Studio · custom oak kitchens & interiors in Riga", url: "https://www.linkedin.com/feed/", picture: "" } },
    linkedinPost:
      "We fitted a whole kitchen in one day last week. Here's what made it possible.\n\nNot speed. Preparation.\n\nEvery panel was cut, drilled and test-assembled in our Riga workshop before we drove to Mārupe. On site we only had to put it together – no sawdust in the client's home, no second visit.\n\nThe client, Ieva, told us the best part wasn't the oak or the design. It was having her kitchen back the same evening.\n\nI think small workshops win on exactly this: the boring planning nobody sees.\n\nWhat's one thing a contractor did that made you trust them?\n\n#interiordesign #riga #smallbusiness",
  };
})();
