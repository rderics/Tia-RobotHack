"""The fictional world of Oakline Studio: people, suppliers, clients, projects, leads.

Everything is invented. Email addresses use the reserved .example domain. No phone numbers.
Facts that the demo inbox (demo/inbox.json) and the saved replay depend on are fixed by hand in
FIXED_CLIENTS / FIXED_PROJECTS and must not change.
"""
import datetime as dt
import random

TODAY = dt.date(2026, 11, 19)  # the demo day: Thursday 19 November 2026
rng = random.Random(1911)

OWNER = "Mārtiņš Ozols"
BUSINESS = "Oakline Studio"

TEAM = [
    {"name": "Mārtiņš Ozols", "role": "Owner, lead designer", "since": "2017", "does": "designs every kitchen himself, signs every offer and contract, decides prices and discounts",
     "habits": ["Design blocks Mon and Wed 08:00–12:00 – no meetings.", "Never gives discounts by message.", "Answers clients the same day, usually after 17:00."]},
    {"name": "Elīna Zariņa", "role": "Project manager, office", "since": "2020", "does": "runs the project schedule, orders materials, collects receipts for the accountant, books the team lunch",
     "habits": ["Updates every project note on Friday.", "Keeps the supplier order sheet.", "Sends receipts to Ilze by the 5th of each month."]},
    {"name": "Kaspars Liepiņš", "role": "Lead installer", "since": "2018", "does": "measures on site, decides install dates, leads every install crew",
     "habits": ["Needs 2 working days' notice for any install change.", "Photographs every finished kitchen for Instagram.", "Checks wall straightness before fronts are ordered."]},
    {"name": "Jānis Krūmiņš", "role": "Installer", "since": "2022", "does": "installs wardrobes and kitchens with Kaspars, does small warranty fixes",
     "habits": ["Carries the spare hinge box.", "Works Tue–Sat."]},
    {"name": "Agnese Kalēja", "role": "Junior designer", "since": "2024", "does": "3D visualisations, material boards, wardrobe layouts",
     "habits": ["Makes 2 colour options per kitchen, never more.", "Keeps the sample library in order."]},
    {"name": "Ivo Sproģis", "role": "Workshop carpenter", "since": "2019", "does": "builds custom pieces in the workshop in Ķekava: islands, shelves, oak worktops",
     "habits": ["Oak worktops need 10 working days.", "Oils every oak top three times."]},
    {"name": "Līga Upīte", "role": "Sales and social media (part-time)", "since": "2025", "does": "answers Instagram, qualifies leads, posts 3 times a week",
     "habits": ["Replies to Instagram within 2 hours on workdays.", "Never quotes exact prices – ranges from the price list only."]},
]

EXTERNAL_PEOPLE = [
    {"name": "Ilze Kronberga", "role": "Accountant (external, bookkeeping firm)", "company": None, "email": "ilze@gramatvediba-kronberga.example",
     "notes": ["Signs her emails 'Ilze – grāmatvede'.", "VAT return due on the 20th; needs all purchase receipts by the Friday before.", "Prefers PDF scans, one file per receipt."]},
]

AREAS = {
    "Teika": ["Brīvības gatve", "Ropažu iela", "Zemitāna iela", "Ezermalas iela"],
    "Āgenskalns": ["Kalnciema iela", "Mārupes iela", "Nometņu iela", "Melnsila iela"],
    "Mežaparks": ["Hamburgas iela", "Visbijas prospekts", "Ostas prospekts"],
    "Purvciems": ["Dzelzavas iela", "Ilūkstes iela", "Vaidavas iela", "Lielvārdes iela"],
    "Imanta": ["Anniņmuižas bulvāris", "Kurzemes prospekts", "Zolitūdes iela"],
    "Centrs": ["Brīvības iela", "Tērbatas iela", "Ģertrūdes iela", "Blaumaņa iela", "Elizabetes iela"],
    "Grīziņkalns": ["Pērnavas iela", "Lienes iela", "Ēveles iela"],
    "Ziepniekkalns": ["Ozolciema iela", "Valdeķu iela", "Ziepniekkalna iela"],
    "Torņakalns": ["Altonavas iela", "Vienības gatve", "Jelgavas iela"],
    "Jugla": ["Juglas iela", "Brīvības gatve", "Silciema iela"],
    "Sarkandaugava": ["Tilta iela", "Sarkandaugavas iela", "Duntes iela"],
    "Ganību dambis": ["Ganību dambis"],
    "Mārupe": ["Daugavas iela", "Lielā iela", "Mazcenu aleja"],
    "Ādaži": ["Gaujas iela", "Rīgas gatve", "Attekas iela"],
    "Jūrmala": ["Jomas iela", "Dzintaru prospekts", "Bulduru prospekts"],
    "Ķekava": ["Rīgas iela", "Gaismas iela", "Ziedu iela"],
    "Babīte": ["Liepu aleja", "Priežu iela"],
    "Salaspils": ["Rīgas iela", "Skolas iela", "Lazdu iela"],
}

F_FIRST = ["Līga", "Kristīne", "Inese", "Dace", "Zane", "Santa", "Evija", "Madara", "Elīza", "Sanita", "Anete", "Linda", "Rūta", "Dita",
           "Baiba", "Sigita", "Vineta", "Alise", "Katrīna", "Gunta", "Ance", "Lelde", "Aiga", "Ilona", "Dagnija", "Signe", "Monta", "Jana"]
F_LAST = ["Ozoliņa", "Liepa", "Krūmiņa", "Jansone", "Kļaviņa", "Eglīte", "Pētersone", "Lāce", "Balode", "Strautiņa", "Siliņa", "Rozīte",
          "Priede", "Grīnberga", "Ābele", "Vilka", "Dūmiņa", "Lapiņa", "Avotiņa", "Celmiņa", "Kārkliņa", "Mežule", "Saulīte", "Rudzīte",
          "Smirnova", "Kuzņecova", "Popova", "Ivanova"]
M_FIRST = ["Andris", "Kārlis", "Edgars", "Raimonds", "Toms", "Artūrs", "Gints", "Normunds", "Aivars", "Uldis", "Dāvis", "Kristaps",
           "Ivars", "Rihards", "Mārcis", "Oskars", "Valdis", "Aleksandrs", "Sergejs", "Arnis", "Egils", "Reinis", "Viesturs", "Pāvels"]
M_LAST = ["Kalniņš", "Bērziņš", "Ozoliņš", "Jansons", "Vītols", "Kļaviņš", "Pētersons", "Lācis", "Balodis", "Strautiņš", "Siliņš",
          "Rozītis", "Grīnbergs", "Ābeltiņš", "Vilks", "Dūmiņš", "Lapiņš", "Avotiņš", "Celmiņš", "Kārkliņš", "Mežulis", "Saulītis",
          "Ivanovs", "Petrovs", "Smirnovs", "Kozlovs"]

SUPPLIERS = [
    {"name": "Kokmateriāli Baltic", "kind": "Countertops and boards (quartz, oak, laminate, MDF board)", "domain": "kokmateriali-baltic.example",
     "contact": "Ojārs Vanags", "contact_role": "sales manager", "lead_time": "quartz 8–10 working days after template, laminate 5", "terms": "invoice, 14 days",
     "notes": ["Delivers Tue and Thu mornings 08:00–10:00.", "Templates quartz on site after the base cabinets are fixed.", "Bank details never change by email – confirm by phone with Ojārs."]},
    {"name": "Fasādes LV", "kind": "Painted MDF and veneer fronts", "domain": "fasades-lv.example", "contact": "Renāte Gulbe", "contact_role": "production planner",
     "lead_time": "painted fronts 15–18 working days", "terms": "50 % prepayment",
     "notes": ["Was 6 working days late with the Vītola fronts in November 2026 (paint line breakdown).", "Colour samples A5 free, A4 doors 25 €.", "Matt lacquer only on request – default is 10 % gloss."]},
    {"name": "Furnitūra Rīga", "kind": "Hinges, drawer systems, handles, lift systems", "domain": "furnitura-riga.example", "contact": "Edgars Pole", "contact_role": "account manager",
     "lead_time": "stock items next day, special orders 3 weeks", "terms": "monthly invoice",
     "notes": ["We use soft-close hinges and full-extension drawers on every job.", "Keep a spare box of 20 hinges in the van."]},
    {"name": "Laminātu centrs", "kind": "Laminate boards and edging", "domain": "laminatu-centrs.example", "contact": "Toms Bite", "contact_role": "sales",
     "lead_time": "3–5 working days", "terms": "invoice, 30 days", "notes": ["Cuts and edges to our cutting list.", "Wood-grain laminates sell best in Pierīga houses."]},
    {"name": "Stikls un Spoguļi", "kind": "Glass splashbacks, mirrors, glass shelves", "domain": "stikls-spoguli.example", "contact": "Valda Ruņģe", "contact_role": "owner",
     "lead_time": "7 working days after measurement", "terms": "prepayment", "notes": ["Measures glass splashbacks only after the worktop is in.", "Back-painted glass in any RAL colour."]},
    {"name": "Gaismas Studija", "kind": "LED strips, under-cabinet and wardrobe lighting", "domain": "gaismas-studija.example", "contact": "Artis Kalve", "contact_role": "technician",
     "lead_time": "2–4 days", "terms": "invoice", "notes": ["Warm white 3000 K is our default.", "Motion sensors in wardrobes, touch dimmers in kitchens."]},
    {"name": "Elektro Meistars", "kind": "Electrician (partner, invoices the client directly)", "domain": "elektro-meistars.example", "contact": "Gatis Lauva", "contact_role": "electrician",
     "lead_time": "book 1 week ahead", "terms": "client pays directly", "notes": ["We never include electrical work in our price – Gatis quotes separately.", "Needs the final appliance list before rough-in."]},
    {"name": "Santehnika Pluss", "kind": "Plumber (partner, invoices the client directly)", "domain": "santehnika-pluss.example", "contact": "Juris Ezers", "contact_role": "plumber",
     "lead_time": "book 1 week ahead", "terms": "client pays directly", "notes": ["Connects sink, dishwasher and tap on install day if booked.", "Bathroom renovations: Juris does all pipework."]},
    {"name": "Flīžu Pasaule", "kind": "Tiles and bathroom materials", "domain": "flizu-pasaule.example", "contact": "Sintija Lūse", "contact_role": "designer-consultant",
     "lead_time": "stock 2 days, order 3–4 weeks", "terms": "client buys, 10 % trade discount through us", "notes": ["Clients choose tiles in the showroom with Agnese.", "Large-format tiles need 2 people and +20 % labour."]},
    {"name": "Sadzīves Tehnika B2B", "kind": "Built-in appliances (trade account)", "domain": "sadzives-tehnika-b2b.example", "contact": "Roberts Kurzemnieks", "contact_role": "trade desk",
     "lead_time": "3–10 days", "terms": "client pays the shop", "notes": ["Most clients buy appliances themselves – we only need the model numbers.", "Integrated fridge niches need exact model specs before production."]},
    {"name": "Krāsu Nams", "kind": "Paints, oils, touch-up kits", "domain": "krasu-nams.example", "contact": "Linda Puķe", "contact_role": "shop manager",
     "lead_time": "same day", "terms": "card", "notes": ["Hardwax oil for oak tops.", "Touch-up pens matched to every front colour we use."]},
    {"name": "Pārvadājumi 24", "kind": "Transport and lifting (large worktops, stairs without lift)", "domain": "parvadajumi24.example", "contact": "Aleksejs Morozovs", "contact_role": "dispatcher",
     "lead_time": "book 2 days ahead", "terms": "invoice", "notes": ["Quartz tops over 3 m need 4 people.", "Old-town deliveries only before 10:00."]},
    {"name": "Būvgruži Rīga", "kind": "Waste removal (old kitchens, packaging)", "domain": "buvgruzi-riga.example", "contact": "Ingus Šmits", "contact_role": "dispatcher",
     "lead_time": "next day", "terms": "per container", "notes": ["Old kitchen removal priced in every offer as a separate line if needed."]},
    {"name": "Bolt Food", "kind": "Food delivery (team lunch)", "domain": None, "contact": None, "contact_role": None, "lead_time": "45 min", "terms": "company card",
     "notes": ["Usual Tuesday team lunch – see [[Bolt Food — usual team lunch]]."]},
]

PARTNERS = [
    {"name": "Studio Nord Interiors", "kind": "Interior design studio (asked about referrals)", "domain": "studio-nord.example",
     "notes": ["Wrote on Instagram (@studio.nord.interiors) on 18.11.2026 proposing a referral partnership.", "Mārtiņš decides all partnerships himself."]},
    {"name": "Riga Design Week", "kind": "Event / newsletter", "domain": "rigadesignweek.example", "notes": ["Sends a monthly newsletter – archive it.", "We exhibited in 2024; did not go in 2025."]},
    {"name": "Arhitektu birojs Smilga", "kind": "Architects (send us private-house kitchens)", "domain": "smilga-arhitekti.example",
     "notes": ["Referred 4 projects in 2025–2026.", "Expects drawings in DWG.", "Pays nothing – mutual referrals only."]},
    {"name": "Nekustamie Rīga", "kind": "Real-estate agency (new-build flat buyers)", "domain": "nekustamie-riga.example",
     "notes": ["Gives our card to buyers of new-build flats.", "Most of these clients want a kitchen within 2 months of getting the keys."]},
]

# ---- Clients and projects fixed by the demo inbox / replay (do not change these facts) ----
FIXED_CLIENTS = [
    {"name": "Anna Kalniņa", "area": "Teika", "street": "Zemitāna iela 9", "lang": "Latvian", "channel": "WhatsApp", "email": None,
     "source": "Instagram", "since": dt.date(2026, 11, 10)},
    {"name": "Ieva Bērziņa", "area": "Ganību dambis", "street": "Ganību dambis 12", "lang": "English", "channel": "email", "email": "ieva.berzina@example.com",
     "source": "Website form", "since": dt.date(2026, 11, 3)},
    {"name": "Laura Vītola", "area": "Centrs", "street": "Brīvības iela 120", "lang": "Latvian", "channel": "email", "email": "laura.vitola@mail.example",
     "source": "Referral – Roberts Eglītis", "since": dt.date(2026, 8, 24)},
    {"name": "Roberts Eglītis", "area": "Āgenskalns", "street": "Kalnciema iela 64", "lang": "Latvian", "channel": "email", "email": "roberts.eglitis@mail.example",
     "source": "Arhitektu birojs Smilga", "since": dt.date(2026, 7, 2)},
]
FIXED_LEADS = [
    {"name": "Dmitrijs Volkovs", "area": "Imanta", "lang": "English", "channel": "email (website form)", "date": dt.date(2026, 11, 18),
     "request": "2-room flat in Imanta – bathroom and kitchen renovation; asks when we could come and look.", "status": "new – reply waiting for Mārtiņš's OK"},
    {"name": "Marta K. (@marta.k.home)", "area": "unknown (just bought a flat)", "lang": "English", "channel": "Instagram", "date": dt.date(2026, 11, 18),
     "request": "Rough price for a 3 m kitchen with an island.", "status": "new – reply with price-list ranges, offer free measurement"},
]
