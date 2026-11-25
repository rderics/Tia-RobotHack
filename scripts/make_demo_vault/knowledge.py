"""Hand-written knowledge for the demo business: how Oakline Studio works (SOPs, materials, sales,
marketing, rules), decisions with their reasons, and document templates. Fictional business."""

# Each entry: (folder, title, tags-line, body). Bodies use [[links]] to people, suppliers, other notes.
KNOWLEDGE = [
("Knowledge/How we work", "SOP — Measurement visit", "sop", """
**Goal:** leave the client's flat with everything needed to design and price the job – no second visit.

## Before
- Confirm the time the day before by the client's own channel (WhatsApp or email).
- Ask for photos of the room and the approximate size, so [[Agnese Kalēja]] can prepare 2 layout ideas.
- Take the laser, 5 m tape, level, camera, sample case (fronts, worktops, handles) and the [[Template — Measurement checklist]].

## On site (45–60 min)
1. Measure every wall at three heights (floor, 90 cm, ceiling) – old Riga walls are rarely straight.
2. Mark windows, radiators, sockets, water and drain points, gas pipe, ventilation.
3. Check the floor level across the room; more than 10 mm means adjustable legs at the low end.
4. Ask about appliances: models if already bought, otherwise sizes. Integrated fridge or dishwasher → we need exact models before production.
5. Show 2 front colours and 2 worktops that fit the budget. Never more – too many options slow the decision.
6. Ask the budget plainly. Write down the number the client says.
7. Agree when the offer will come: **within 7 working days**.

## After
- Same day: write the client note and the project note; put photos in the project folder.
- [[Mārtiņš Ozols]] designs and prices; [[Elīna Zariņa]] checks supplier lead times before the offer goes out.

Related: [[SOP — Writing an offer]], [[Price list]], [[Kitchen ergonomics — the numbers we use]].
"""),
("Knowledge/How we work", "SOP — Writing an offer", "sop", """
**Rule:** every written offer uses the **exact prices** from the [[Price list]], never the ranges.

## Structure (see [[Template — Offer]])
1. Greeting by first name, one sentence about their room.
2. What we will build – the layout in plain words (shape, length, fronts, colour).
3. Line-by-line price table: kitchen body, worktop, appliance housings, extra drawers, island, lighting, removal of old kitchen.
4. What is included: installation, soft-close everywhere, delivery, waste removal of our packaging.
5. What is **not** included: appliances, plumbing and electrical works (partners [[Santehnika Pluss]] and [[Elektro Meistars]] quote separately).
6. Timeline: production weeks + install date range (never a fixed date before [[Kaspars Liepiņš]] confirms).
7. Payment terms: 50 % with the contract, 50 % on handover – see [[Payment terms and deposits]].
8. Validity: 30 days.

## Things that must be true before sending
- Every open choice is closed or listed as an option with its own price (e.g. worktop oak 650 € / quartz 1 450 €).
- The total matches the line items.
- If the client said a budget and we are over it by more than 10 %, add a cheaper option line.

Mārtiņš signs every offer. Tia may prepare the draft; it goes to **Needs you** for approval.
"""),
("Knowledge/How we work", "SOP — Contract and deposit", "sop", """
- The contract is generated from [[Template — Contract]] with the offer's line items attached as Annex 1.
- Two copies signed (or e-signed via Dokobit). Client keeps one.
- Deposit **50 %** on the invoice issued the same day; production starts only after the deposit is on our account.
- [[Elīna Zariņa]] orders fronts and worktops the day the deposit arrives and writes the expected delivery dates into the project note.
- Any change after signing → written change order with price (see [[SOP — Change orders]]).
- Install date is fixed only when fronts have a confirmed production slot (see [[Fasādes LV]]).
"""),
("Knowledge/How we work", "SOP — Change orders", "sop", """
Clients change their minds – that is normal. What matters is that every change has a price and a date effect **in writing** before we do it.

| Change | When it is free | When it costs |
|---|---|---|
| Handles | before order | after order: new handles + 15 € per front labour |
| Front colour | before fronts are ordered | after: new fronts at cost, +2–3 weeks |
| Appliance model | before production | after: niche rework 80–180 € |
| Extra drawer unit | any time before install | 390 € (price list) |

- The change order is one short message: what changes, price, new date. Client answers "yes" in writing.
- A colour change on fronts already installed is **never** handled by the installer on site – it goes to [[Mārtiņš Ozols]] (complaint process: [[SOP — Complaints and quality issues]]).
"""),
("Knowledge/How we work", "SOP — Install day", "sop", """
## The day before
- [[Kaspars Liepiņš]] calls the client: access, parking, lift, who will be home.
- Van checklist: tools, spare hinges, touch-up pens ([[Krāsu Nams]]), silicone, protection film for floors.

## On the day
1. Protect floors and the path from the door.
2. Carcasses first, levelled to the highest floor point.
3. Worktop: laminate/oak fitted the same day; quartz is templated after carcasses and fitted 8–10 working days later ([[Kokmateriāli Baltic]]).
4. Fronts, handles, adjustments, soft-close check on every door.
5. Clean up, photos for Instagram (only with the client's OK).

## End of day message
Short message to the client and to [[Elīna Zariņa]]: what is done, what is left, the next date.
"""),
("Knowledge/How we work", "SOP — Handover and final payment", "sop", """
- Walk through the kitchen with the client using [[Template — Handover protocol]]; every small issue goes on the punch list with a date.
- Show care: [[Care guide — painted fronts]], [[Care guide — oak worktop]] or [[Care guide — quartz worktop]].
- Final invoice (50 %) issued the same day, payment within 5 days.
- One week later: thank-you message and, if the client is happy, the Google review link (see [[Reviews — how we ask]]).
"""),
("Knowledge/How we work", "SOP — Complaints and quality issues", "sop", """
**Owner handles every complaint personally.** Tia and the team never promise refunds, discounts or redoing work by message.

1. Thank the client for telling us, say [[Mārtiņš Ozols]] will call today.
2. Collect facts: photos, which item, since when. Check the project note – was it our mistake, the supplier's, or a change of taste?
3. Mārtiņš calls and offers a fix: repair, replacement, or a goodwill gesture he decides himself.
4. Write the outcome in the project note and in [[Decisions log — complaints]].

**Delays caused by us** (late supplier, our planning): we say so plainly, give a new date, and Mārtiņš decides compensation. Never a percentage discount by message – see [[2025-02-10 No discounts by message]].
"""),
("Knowledge/How we work", "SOP — Warranty", "sop", """
- 2 years on our workmanship and carcasses, 5 years on hinges and drawer runners (manufacturer).
- Warranty visit within 10 working days. Small fixes (hinge adjustment, loose handle) done by [[Jānis Krūmiņš]].
- Not covered: water damage from leaks we did not install, heat damage on laminate, scratches from use.
"""),
("Knowledge/How we work", "SOP — Supplier orders", "sop", """
- [[Elīna Zariņa]] keeps one order sheet: supplier, project, order date, promised date, confirmed date, received.
- Fronts from [[Fasādes LV]] are the long pole (15–18 working days). Order them first, the day the deposit arrives.
- Quartz from [[Kokmateriāli Baltic]] only after templating on site.
- Hardware from [[Furnitūra Rīga]] – monthly invoice, stock items next day.
- Every supplier invoice is checked against the order before payment. **Bank details are confirmed by phone if they ever look different** – [[2025-05-14 Bank details are only confirmed by phone]].
"""),
("Knowledge/How we work", "SOP — Monthly documents for the accountant", "sop", """
- [[Elīna Zariņa]] collects every purchase receipt and supplier invoice (PDF, one file per document).
- Sent to [[Ilze Kronberga]] by the Friday before the 20th (VAT return).
- Card receipts from [[Krāsu Nams]] and fuel are photographed the same day in the shared folder.
- Tia may answer Ilze's document requests herself; she never sends payment data.
"""),
("Knowledge/How we work", "SOP — Answering new leads", "sop", """
1. Reply within 2 working hours (Instagram: [[Līga Upīte]]; email/website: [[Elīna Zariņa]]; Tia drafts).
2. Thank them, use **price-list ranges only** ([[Price list]]), never an exact price before measurement.
3. Offer a **free measurement** in Riga and Pierīga with 2 time options from the calendar.
4. Ask 3 things: room size, timeline, budget.
5. Log the lead in `Leads/` with source and date.

Until [[Mārtiņš Ozols]] says otherwise, every first reply to a new lead goes to him for approval.
See also [[Lead qualification — who is a good fit]].
"""),
("Knowledge/How we work", "SOP — Team lunch and office", "sop", """
- Team lunch every Tuesday 12:30 at the office – usually [[Bolt Food — usual team lunch]] (≈ 50 €).
- Every order is a purchase: Tia prepares the basket and asks [[Mārtiņš Ozols]] to approve it; after his OK [[Elīna Zariņa]] orders and pays. Tia never enters the company card.
- Office: Ūdens iela (Pārdaugava), workshop in Ķekava ([[Ivo Sproģis]]).
"""),
("Knowledge/Materials", "Painted MDF vs laminate fronts", "materials", """
| | Laminate | Painted MDF |
|---|---|---|
| Price (4 m kitchen) | base | +1 800 – 2 500 € |
| Colours | ~60 decors | any NCS/RAL |
| Edges | ABS edge, visible line | seamless, rounded |
| Durability | very scratch resistant | chips can be touched up |
| Lead time | 5 days ([[Laminātu centrs]]) | 15–18 days ([[Fasādes LV]]) |

**What we recommend:** laminate for rentals and tight budgets; painted MDF when the client cares about colour or has an open-plan living room.
Most sold colours 2026: sage green, greige, cashmere, warm white, anthracite. See [[Colour trends 2026 — what clients actually choose]].
"""),
("Knowledge/Materials", "Worktops — laminate, oak, quartz", "materials", """
| | Laminate | Solid oak | Quartz |
|---|---|---|---|
| Price (≤ 5 m kitchen) | included | 650 € | 1 450 € |
| Heat | trivet always | trivet always | short contact OK |
| Care | wipe | oil 2× a year | wipe, no acids |
| Lead time | same day | 10 working days ([[Ivo Sproģis]]) | 8–10 days after template |
| Joins | visible | invisible | almost invisible |

- Oak suits sage, cashmere and warm white fronts; quartz suits greige, anthracite and navy.
- Undermount sinks only with oak or quartz.
- Care guides: [[Care guide — oak worktop]], [[Care guide — quartz worktop]].
"""),
("Knowledge/Materials", "Hinges and drawer systems we use", "materials", """
- Soft-close hinges on every door, full-extension soft-close drawers – **included in every price**.
- Supplier: [[Furnitūra Rīga]]. Spare box of 20 hinges always in the van.
- Lift-up systems for wall cabinets above 60 cm wide (+95 € each).
- Corner solutions: we prefer **4 drawers** or a blind corner with a shelf over carousels – carousels break and waste space.
- Push-to-open only on handle-less designs and never on the dishwasher door.
"""),
("Knowledge/Materials", "Lighting — LED under cabinets and in wardrobes", "materials", """
- Warm white 3000 K by default, 4000 K only on request.
- Kitchen: LED strip under wall cabinets with a touch dimmer, ≈ 240 € for 4 m.
- Wardrobes: motion-sensor strips, ≈ 90 € per section.
- Installed by [[Gaismas Studija]]; the electrician ([[Elektro Meistars]]) prepares one socket above the wall cabinets.
"""),
("Knowledge/Materials", "Glass splashbacks", "materials", """
- Back-painted glass in any RAL colour from [[Stikls un Spoguļi]], ≈ 380–620 € for a 3–4 m kitchen.
- Measured **after** the worktop is fitted; 7 working days.
- Sockets cut-outs must be known at measurement – changing them later means new glass.
"""),
("Knowledge/Materials", "Kitchen ergonomics — the numbers we use", "materials", """
- Worktop height: 90 cm standard; 92–95 cm for tall clients (elbow height minus 10–15 cm).
- Gap between worktop and wall cabinets: 55–60 cm.
- Walkway: at least 100 cm, 120 cm with an island.
- Dishwasher next to the sink, never in the corner.
- Fridge – sink – hob triangle: each side 120–270 cm.
- Drawer under the hob for pans, 60–80 cm wide.
"""),
("Knowledge/Materials", "Bathroom renovation — what is in our price", "materials", """
Our bathroom price (4 000 – 7 000 € for a standard flat bathroom) includes: demolition, waterproofing, tiling, vanity unit and mirror cabinet made by us, shower glass, installation.
Not included: tiles themselves (client buys at [[Flīžu Pasaule]] with 10 % trade discount), sanitary ware, plumbing ([[Santehnika Pluss]]), electrical ([[Elektro Meistars]]).
Typical duration: 3–4 weeks in a block of flats, the client cannot use the bathroom during that time.
"""),
("Knowledge/Materials", "Built-in wardrobes", "materials", """
- Price 450–700 € per metre depending on fronts (laminate / painted / mirror) and inside fittings.
- Sliding doors for corridors under 120 cm wide; hinged doors otherwise (they close better and last longer).
- Inside: 1 hanging section per person + drawers + shoe shelves. Motion LED optional ([[Lighting — LED under cabinets and in wardrobes]]).
- Lead time 4–5 weeks; [[Jānis Krūmiņš]] installs in 1 day for up to 3 m.
"""),
("Knowledge/Clients", "Care guide — painted fronts", "care", """
- Wipe with a soft damp cloth and mild soap; never abrasive sponges or alcohol.
- Small chips: touch-up pen in the exact colour (we leave one with every kitchen, from [[Krāsu Nams]]).
- Keep the kettle away from wall-cabinet doors – steam lifts paint over time.
"""),
("Knowledge/Clients", "Care guide — oak worktop", "care", """
- Oil twice a year with hardwax oil (we leave a 250 ml can).
- Wipe water around the sink at once; never leave wet cloths on the wood.
- Light scratches: sand with 240 grit along the grain, then oil.
"""),
("Knowledge/Clients", "Care guide — quartz worktop", "care", """
- Wipe with water and mild soap. No acids, no oven cleaner, no bleach.
- Use a trivet for pans straight from the oven – thermal shock can crack quartz.
- Do not stand on the worktop.
"""),
("Knowledge/Sales", "Price list logic — why ranges first", "sales", """
- First replies use **ranges** from the [[Price list]] – a real price needs a measurement; a wrong exact price is a promise we can't keep.
- After measurement, the offer uses the **exact** price table.
- The 4–5 m L-shaped kitchen with painted MDF fronts (7 200 € installed) is our most sold product – about 40 % of kitchens.
- Price list reviewed every October ([[2026-10-01 Price list update]]).
"""),
("Knowledge/Sales", "Payment terms and deposits", "sales", """
- **50 %** deposit with the contract; production starts when it arrives.
- **50 %** after handover, within 5 days.
- B2B (offices, cafés): 40 / 40 / 20 (contract / delivery / handover).
- We never change payment details by email; ours are on every invoice and on the website.
- Late final payment: friendly reminder after 7 days, call by [[Mārtiņš Ozols]] after 14.
"""),
("Knowledge/Sales", "Lead qualification — who is a good fit", "sales", """
**Good fit:** flat or house owner in Riga/Pierīga, budget ≥ 4 000 €, timeline 1–4 months, cares about quality and colour.
**Weaker fit:** rentals with the cheapest possible budget, "just the carcasses", install needed within 2 weeks.
**Not for us:** commercial kitchens (restaurants), anything outside Riga region, jobs where the client supplies their own fronts.

Questions that sort leads fast: *Is the room ready (walls, floor)? When do you want to cook in it? What budget did you have in mind?*
"""),
("Knowledge/Sales", "Competitors in Riga — how we compare", "sales", """
| | Big furniture chains | Small workshops | Oakline Studio |
|---|---|---|---|
| Price | lowest | similar | middle |
| Design | catalogue modules | none | designer included |
| Lead time | 2–3 weeks | unclear | 6–8 weeks, kept |
| Install | subcontracted | owner | own crew |

We win on design + reliable dates + one person ([[Mārtiņš Ozols]]) from measurement to handover. We lose on price for rentals.
"""),
("Knowledge/Sales", "Reviews — how we ask", "sales", """
- One week after handover, only if the client is clearly happy.
- Short message, first name, the review link from [[Business]].
- Never offer anything in exchange for a review.
- 2026: 47 Google reviews, average 4.9.
"""),
("Knowledge/Marketing", "Instagram — what works", "marketing", """
- Posts 3× a week ([[Līga Upīte]]): before/after reels perform 4× better than still photos.
- Best times: Tue/Thu 19:00, Sun 11:00.
- Always ask the client before posting their kitchen; never show the address or faces.
- DMs asking for prices: ranges only, offer measurement ([[SOP — Answering new leads]]).
- 2026 followers: ~3 100. Leads from Instagram: about 35 % of all leads.
"""),
("Knowledge/Marketing", "Lead sources 2026", "marketing", """
| Source | Share of leads | Conversion to contract |
|---|---|---|
| Instagram | 35 % | 22 % |
| Website form | 25 % | 30 % |
| Referrals from clients | 20 % | 55 % |
| Architects ([[Arhitektu birojs Smilga]]) | 10 % | 60 % |
| Real-estate agency ([[Nekustamie Rīga]]) | 10 % | 35 % |

Referrals convert best – that's why the review/thank-you step matters ([[Reviews — how we ask]]).
"""),
("Knowledge/Marketing", "Colour trends 2026 — what clients actually choose", "marketing", """
Based on our 2026 contracts:
1. Sage green (painted) – 24 %
2. Greige / cashmere – 21 %
3. Warm white – 18 %
4. Oak-look laminate – 15 %
5. Anthracite / navy – 12 %
6. Other – 10 %

Trend magazines push terracotta and deep red for 2027 – none of our clients has asked yet. Newsletters like [[Riga Design Week]] get archived.
"""),
("Knowledge/Rules", "Fraud — fake invoices and bank-detail changes", "rules", """
In May 2025 we received an email "from" [[Kokmateriāli Baltic]] asking to pay invoice 2025-118 to a new account. The domain was **kokmateriali-baltic.co** instead of .example – one letter different. Ojārs confirmed by phone it was fake.

**Rules since then** ([[2025-05-14 Bank details are only confirmed by phone]]):
- Bank details are never changed because of an email. Call the known contact.
- Check the sender domain letter by letter.
- "URGENT" + new bank account = treat as fraud until proven otherwise.
- Tia flags these messages as **Needs you – possible fraud** and never replies with payment data.
"""),
("Knowledge/Rules", "What Tia may do alone", "rules", """
Mirror of [[Owner preferences]] for quick reference.

**Alone:** reschedule client meetings into free calendar slots; confirm supplier deliveries; answer the accountant about documents; thank happy clients + send the review link; archive newsletters.
**Ask first:** new leads (first reply), anything with money, complaints, partnerships.
**Never:** change bank details, promise install dates without [[Kaspars Liepiņš]], book meetings in design blocks (Mon/Wed 08:00–12:00).
"""),
("Knowledge/Rules", "GDPR — client data", "rules", """
- Client notes contain only what we need for the job: name, address of the object, contact channel, room details.
- No ID codes, no bank data in notes.
- Photos of finished work are posted only with consent, never with faces or addresses.
- A client can ask for deletion after warranty ends – [[Elīna Zariņa]] handles it.
"""),
]

DECISIONS = [
("2025-02-10", "No discounts by message", "A client asked for 10 % off by email after a delay; Elīna agreed by reply. It set a precedent two other clients quoted.",
 "Discounts, refunds and compensation are decided only by [[Mārtiņš Ozols]], by phone, never by message. Tia and the team answer: \"Mārtiņš will call you today.\"",
 ["Fixed compensation table (rejected – every delay is different)", "Allow PM to give up to 5 % (rejected)"]),
("2025-05-14", "Bank details are only confirmed by phone", "Fake email pretending to be [[Kokmateriāli Baltic]] (domain kokmateriali-baltic.co) asked to pay invoice 2025-118 to a new account – see [[Fraud — fake invoices and bank-detail changes]].",
 "We never change supplier bank details because of an email. Any change is confirmed by phone with the known contact (Ojārs for Kokmateriāli).", ["Two-person approval of every payment (too slow for daily orders)"]),
("2025-08-25", "Design blocks Monday and Wednesday mornings", "Mārtiņš was designing at night because the days were full of short meetings.",
 "Mon and Wed 08:00–12:00 are design blocks – no meetings, no calls. Tia never books into them.", ["One full design day per week (clients wanted Friday measurements)"]),
("2025-10-06", "Corner drawers instead of carousels", "Three warranty calls in 2025 were broken corner carousels.",
 "We offer 4 corner drawers or a blind corner with shelves. Carousels only if the client insists, without warranty on the mechanism.", ["Better carousel brand (+180 €, still breaks)"]),
("2025-11-17", "Free measurement in Riga and Pierīga", "Paid measurement (30 €) scared off Instagram leads; 1 in 5 asked if it was free.",
 "Measurement is free in Riga and Pierīga. Outside – 0,50 €/km.", ["Credit the 30 € against the contract (still a barrier)"]),
("2026-01-12", "Quartz templated on site only", "Two quartz tops cut from our drawings did not fit old walls (1,2 cm off).",
 "[[Kokmateriāli Baltic]] templates every quartz top on site after carcasses are fixed. Install date for the top = template + 8–10 working days.", []),
("2026-02-02", "Two colour options, never more", "Clients shown 6+ front colours took on average 9 days longer to decide.",
 "[[Agnese Kalēja]] prepares exactly 2 colour options per kitchen; the samples case has 8 front colours.", []),
("2026-03-09", "Hire part-time social media and sales", "Instagram DMs were answered after 1–2 days, leads went cold.",
 "[[Līga Upīte]] joins part-time (20 h/week) for Instagram and first replies.", ["Agency (2× the cost, no product knowledge)"]),
("2026-04-20", "Oak worktops from our own workshop", "Oak tops bought in had a 3-week lead time and 30 % markup.",
 "[[Ivo Sproģis]] makes oak worktops in the Ķekava workshop: 10 working days, price 650 € for kitchens up to 5 m.", []),
("2026-06-15", "Tuesday team lunch", "The team only met on install sites; problems were found late.",
 "Every Tuesday 12:30 lunch at the office, paid by the company ([[Bolt Food — usual team lunch]]). 30 minutes of it is the weekly status.", []),
("2026-08-03", "Tia as the office assistant (pilot)", "Mārtiņš answered ~60 messages a day across email, WhatsApp, Instagram and Slack.",
 "Pilot of Tia: she reads all channels, handles routine items herself, and sends everything with money, complaints, leads and partnerships to Mārtiņš with a draft ready. Rules in [[Owner preferences]].", ["Hire a full-time office assistant (cost ~1 400 €/month)"]),
("2026-09-07", "No installs on Friday afternoons", "Friday afternoon installs often spilled into Saturday overtime.",
 "Installs start Mon–Thu, or Friday morning only for jobs under 4 hours.", []),
("2026-10-01", "Price list update", "Board and paint prices rose 6–8 % in 2026.",
 "New [[Price list]] from 01.10.2026: 4–5 m painted MDF L-kitchen 7 200 €, quartz 1 450 €, oak 650 €, drawer unit 390 €. Signed offers keep their price.", []),
("2026-10-19", "Waiting list instead of rushing", "November and December are full; three clients asked for install before Christmas.",
 "We say honestly: next free install slot is mid-January. No overtime promises.", []),
("2026-11-02", "Referral partnerships need a written agreement", "Two design studios asked about referral fees in October.",
 "Any partnership or referral deal is decided by [[Mārtiņš Ozols]] and written down. Tia only acknowledges and passes it on.", []),
]

TEMPLATES = {
"Template — Offer": """# Offer for {client} — {object}

Dear {first_name},

thank you for meeting us at {address}. Below is our offer for {short_description}.

| Item | Specification | Price |
|---|---|---|
| Kitchen | {shape}, {fronts}, {colour} | {price} € |
| Worktop | {worktop} | {worktop_price} |
| Appliance housings | {housings} | {housings_price} € |
| Extra drawers | {drawers} | {drawers_price} € |
| **Total** | incl. 21 % VAT, installation and delivery | **{total} €** |

**Included:** installation, soft-close on all doors and drawers, delivery, removal of our packaging.
**Not included:** appliances, plumbing and electrical works.
**Timeline:** production {weeks} weeks after the deposit; install date confirmed by [[Kaspars Liepiņš]].
**Payment:** 50 % with the contract, 50 % after handover.
**Valid:** 30 days.

Kind regards,
Mārtiņš Ozols – Oakline Studio
""",
"Template — Contract": """# FURNITURE MANUFACTURING AND INSTALLATION CONTRACT No. {contract_no}

Riga, {date}

**Contractor:** SIA "Oakline Studio" (fictional), reg. No. 40000000000, represented by board member Mārtiņš Ozols.
**Client:** {client}, object address: {address}.

## 1. Subject
1.1. The Contractor designs, manufactures, delivers and installs the furniture described in Annex 1 (the accepted offer of {offer_date}).
1.2. Appliances, plumbing and electrical works are not part of this contract unless listed in Annex 1.

## 2. Price and payment
2.1. Contract price: **{total} EUR** incl. 21 % VAT.
2.2. 50 % ({deposit} EUR) within 3 days of signing. Production starts when the deposit is received.
2.3. 50 % ({final} EUR) within 5 days after the handover protocol is signed.
2.4. Payments only to the account stated in this contract. The Contractor never changes its bank details by email.

## 3. Timeline
3.1. Production: {weeks} weeks from the deposit.
3.2. The install date is agreed in writing at least 10 working days in advance.
3.3. Delays caused by suppliers are communicated as soon as known, with a new date.

## 4. Changes
4.1. Any change after signing is agreed in a written change order stating the price and the effect on the timeline.

## 5. Handover and warranty
5.1. Handover with a signed protocol; small defects go on a punch list with a fix date.
5.2. Warranty: 24 months on workmanship and carcasses; manufacturer warranty on hinges and runners.
5.3. Not covered: damage from water leaks, heat, improper use.

## 6. Client duties
6.1. Room ready for install: walls and floor finished, electricity and water points as agreed, access and parking.

## 7. Final provisions
7.1. Disputes are first solved by negotiation, then under the laws of the Republic of Latvia.
7.2. Signed in two copies, one for each party.

Contractor: ____________ Mārtiņš Ozols   Client: ____________ {client}

**Annex 1:** accepted offer with price table.
""",
"Template — Invoice": """# INVOICE {invoice_no}
Date: {date} · Due: {due}

**From:** SIA "Oakline Studio" (fictional), Ūdens iela, Rīga · info@oakline-studio.example
**To:** {client}, {address}

| Description | Amount |
|---|---|
| {description} | {amount} € |
| VAT 21 % (included) | {vat} € |
| **To pay** | **{amount} €** |

Pay only to the account printed on this invoice. We never change bank details by email.
""",
"Template — Handover protocol": """# Handover protocol — {client}, {object}
Date: {date} · Installer: [[Kaspars Liepiņš]]

| Check | OK | Note |
|---|---|---|
| All doors close softly, aligned | ☐ | |
| Drawers run fully, soft-close | ☐ | |
| Worktop joints and sealing | ☐ | |
| Sink and tap connected (if ordered) | ☐ | |
| Appliance niches fit | ☐ | |
| Lighting works | ☐ | |
| Surfaces without scratches | ☐ | |
| Care guide and touch-up pen handed over | ☐ | |

**Punch list:** …
Client signature: ________  Contractor: ________
""",
"Template — Measurement checklist": """# Measurement checklist
- [ ] All walls at 3 heights · [ ] ceiling height · [ ] floor level
- [ ] Windows, sills, radiators · [ ] sockets, switches · [ ] water / drain · [ ] gas · [ ] ventilation
- [ ] Appliances: models or sizes · integrated fridge / dishwasher?
- [ ] Client budget (their words) · [ ] timeline · [ ] who decides
- [ ] 2 front colours + 2 worktops shown · [ ] photos of every wall
- [ ] Offer promised by: ____ (max 7 working days)
""",
"Template — Follow-up": """# Follow-up after the offer — {client}

Hi {first_name},

I hope you had time to look at our offer for {object} from {offer_date}.
If anything is unclear or you would like to change something (colour, worktop, drawers), just reply here – I'll adjust it the same day.

The offer is valid until {valid_until}. Our next free install slots are in {next_slot}.

Kind regards,
Tia, assistant to Mārtiņš – Oakline Studio

_Rule: send 5 working days after the offer if there is no answer; second and last follow-up after 10 more days ([[SOP — Answering new leads]])._
""",
"Template — Meeting note": """---
type: meeting
date: {date}
---
# {title}
**Who:** · **Where:**
## Notes
## Decisions
## Action items
- [ ] who – what – by when
""",
"Template — Project note": """---
type: project
status: lead | measured | offer sent | contract | production | install | done | warranty
client:
value:
---
# {title}
## Scope
## Timeline
## Payments
## Log
""",
"Template — Client note": """---
type: client
---
# {name}
- Object:
- Channel / language:
- Source:
- Projects:
- Notes:
""",
}
