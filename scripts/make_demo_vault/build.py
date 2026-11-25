"""Builds demo/vault: the fictional Liepa Interjers second brain (~650 linked notes).

    python scripts/make_demo_vault/build.py            # writes demo/vault (keeps nothing else)

Deterministic (fixed random seed) – running it twice gives the same vault.
Facts used by demo/inbox.json and demo/replay.json are fixed in world.py / here and stay true.
"""
import datetime as dt
import json
import os
import random
import shutil
import sys
from collections import defaultdict

sys.path.insert(0, os.path.dirname(__file__))
from world import (TODAY, OWNER, BUSINESS, TEAM, EXTERNAL_PEOPLE, AREAS, F_FIRST, F_LAST, M_FIRST, M_LAST, SUPPLIERS, PARTNERS,  # noqa: E402
                   FIXED_CLIENTS, FIXED_LEADS)
from knowledge import KNOWLEDGE, DECISIONS, TEMPLATES  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "demo", "vault")
rng = random.Random(2611)

D = dt.date
fmt = lambda d: d.strftime("%d.%m.%Y")  # noqa: E731
iso = lambda d: d.isoformat()  # noqa: E731
WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
eur = lambda n: f"{n:,.0f}".replace(",", " ")  # noqa: E731

files = {}  # relative path -> text


def put(rel, text):
    assert rel not in files, rel
    files[rel] = text.strip() + "\n"


def workday_after(d, n):
    while n > 0:
        d += dt.timedelta(days=1)
        if d.weekday() < 5:
            n -= 1
    return d


def next_weekday(d):
    while d.weekday() >= 5:
        d += dt.timedelta(days=1)
    return d


def avoid_design_block(d, hour):
    # Mon/Wed mornings are Mārtiņš's design blocks
    if d.weekday() in (0, 2) and hour < 12:
        return 13 + rng.randint(0, 3)
    return hour


# ------------------------------------------------------------------ people
used = {c["name"] for c in FIXED_CLIENTS} | {t["name"] for t in TEAM} | {"Dmitrijs Volkovs"}


def new_person():
    while True:
        if rng.random() < 0.58:
            n = f"{rng.choice(F_FIRST)} {rng.choice(F_LAST)}"
        else:
            n = f"{rng.choice(M_FIRST)} {rng.choice(M_LAST)}"
        if n not in used:
            used.add(n)
            return n


def surname(n):
    return n.split()[-1]


clients = []
for fc in FIXED_CLIENTS:
    clients.append(dict(fc, fixed=True))

SOURCES = ["Instagram"] * 7 + ["Website form"] * 5 + ["Referral"] * 4 + ["Arhitektu birojs Smilga"] * 2 + ["Nekustamie Rīga"] * 2 + ["Google search"] * 2
for _ in range(104):
    area = rng.choice([a for a in AREAS if a != "Ganību dambis"])
    lang = rng.choices(["Latvian", "English", "Russian"], [70, 18, 12])[0]
    name = new_person()
    clients.append({
        "name": name, "area": area, "street": f"{rng.choice(AREAS[area])} {rng.randint(2, 140)}", "lang": lang,
        "channel": rng.choice(["email", "WhatsApp", "WhatsApp", "email", "Instagram", "phone"]),
        "email": f"{name.split()[0].lower().translate(str.maketrans('āčēģīķļņšūž', 'acegiklnsuz'))}.{surname(name).lower().translate(str.maketrans('āčēģīķļņšūž', 'acegiklnsuz'))}@mail.example",
        "source": rng.choice(SOURCES), "since": D(2024, 9, 1) + dt.timedelta(days=rng.randint(0, 780)), "fixed": False,
    })
# referrals point at earlier clients
for c in clients:
    if c["source"] == "Referral":
        earlier = [x for x in clients if x["since"] < c["since"] and x is not c]
        c["source"] = f"Referral – [[{rng.choice(earlier)['name']}]]" if earlier else "Instagram"

# ------------------------------------------------------------------ projects
COLOURS = ["sage green", "greige", "cashmere", "warm white", "anthracite", "navy blue", "oak-look laminate", "light grey"]
ISSUES = [
    "Wall 2 cm out of square – filler panel added at the window side.",
    "Client changed handles after the order – change order 45 € signed.",
    "Dishwasher model changed – niche adjusted in the workshop, no cost.",
    "One front arrived with a chip – replaced by [[Fasādes LV]] within 5 days.",
    "Lift in the building out of order on install day – [[Pārvadājumi 24]] carried the worktop.",
    "Socket behind the fridge niche had to be moved – [[Elektro Meistars]] did it the same week.",
    "Client asked for a second colour sample – [[Agnese Kalēja]] brought A4 doors.",
    "Floor 14 mm lower at the balcony door – adjustable legs used.",
    "Oak worktop needed an extra oil coat after delivery – [[Ivo Sproģis]] did it on site.",
    "Quartz template moved by 2 days because carcasses were not fixed yet.",
]
CHANGE = ["+1 drawer unit (390 €)", "LED under wall cabinets (240 €)", "glass splashback (480 €)", "handles changed to black matt", "extra tall cabinet (420 €)"]


def kitchen_scope():
    shape = rng.choices(["straight 3 m", "L-shape 4.2 m", "L-shape 4.6 m", "U-shape 5.5 m"], [25, 35, 25, 15])[0]
    fronts = rng.choices(["laminate", "painted MDF", "oak veneer"], [35, 55, 10])[0]
    colour = "oak-look laminate" if fronts == "laminate" and rng.random() < 0.4 else rng.choice(COLOURS[:6] if fronts != "laminate" else ["light grey", "warm white", "anthracite", "oak-look laminate"])
    base = {"straight 3 m": 4200, "L-shape 4.2 m": 7200, "L-shape 4.6 m": 7200, "U-shape 5.5 m": 9400}[shape]
    if fronts == "laminate":
        base -= 1800 if shape != "straight 3 m" else 0
    if fronts == "oak veneer":
        base = int(base * 1.12 / 10) * 10
    lines = [("Kitchen", f"{shape}, {fronts} fronts, {colour}", base)]
    wt = rng.choices(["laminate", "solid oak", "quartz"], [35, 30, 35])[0]
    lines.append(("Worktop", wt, {"laminate": 0, "solid oak": 650, "quartz": 1450}[wt]))
    h = rng.choices([0, 1, 2], [30, 35, 35])[0]
    if h:
        lines.append(("Appliance housings", f"{h} × integrated ({'fridge' if h == 1 else 'fridge + dishwasher'})", 180 * h))
    dr = rng.choices([0, 1, 2], [55, 35, 10])[0]
    if dr:
        lines.append(("Extra drawer units", f"{dr} × set of 4 drawers", 390 * dr))
    if rng.random() < 0.25:
        lines.append(("Island", "120 × 80 cm, same fronts, worktop overhang 30 cm", rng.choice([1400, 1650, 1900, 2300])))
    if rng.random() < 0.4:
        lines.append(("LED lighting", "under wall cabinets, touch dimmer", 240))
    if rng.random() < 0.2:
        lines.append(("Glass splashback", f"back-painted, {rng.choice(['RAL 9010', 'RAL 7044', 'sage tint'])}", rng.choice([380, 450, 520, 620])))
    if rng.random() < 0.3:
        lines.append(("Old kitchen removal", "demolition and waste ([[Būvgruži Rīga]])", 150))
    return {"shape": shape, "fronts": fronts, "colour": colour, "worktop": wt}, lines


def wardrobe_scope():
    m = rng.choice([2, 2.4, 2.8, 3, 3.6])
    per = rng.choice([450, 520, 600, 700])
    doors = rng.choice(["hinged, painted", "sliding, mirror", "hinged, laminate", "sliding, oak-look"])
    lines = [("Built-in wardrobe", f"{m} m, {doors} doors, 2 hanging sections, drawers", int(m * per))]
    if rng.random() < 0.5:
        lines.append(("Motion LED", "in each section", 90 * rng.choice([2, 3])))
    return {"metres": m, "doors": doors}, lines


def bathroom_scope():
    p = rng.choice([4200, 4800, 5400, 6100, 6800])
    lines = [("Bathroom renovation", "demolition, waterproofing, tiling, vanity and mirror cabinet by us, shower glass", p)]
    return {"tiles": rng.choice(["60×120 grey stone-look", "30×60 white matt", "terrazzo-look 60×60"])}, lines


def office_scope():
    p = rng.choice([3600, 4400, 5200, 6100])
    return {"kind": rng.choice(["reception desk", "kitchenette", "café counter"])}, [(rng.choice(["Reception desk", "Office kitchenette", "Café counter"]), "laminate + quartz top, LED", p)]


TYPES = [("Kitchen", kitchen_scope, 52), ("Wardrobe", wardrobe_scope, 17), ("Bathroom", bathroom_scope, 12), ("Kitchen + wardrobe", None, 9), ("Office", office_scope, 4)]

projects = []
counter = defaultdict(int)


def add_project(client, kind, scope, lines, lead_date, *, fixed=None):
    counter[lead_date.year] += 1
    code = f"LI-{str(lead_date.year)[2:]}-{counter[lead_date.year]:03d}"
    p = {"code": code, "client": client, "kind": kind, "scope": scope, "lines": lines, "total": sum(x[2] for x in lines), "lead": lead_date,
         "title": f"{kind} — {surname(client['name'])}, {client['area']}"}
    if fixed:
        p.update(fixed)
        p["title"] = fixed.get("title", p["title"])
    else:
        measure = workday_after(lead_date, rng.randint(2, 8))
        offer = workday_after(measure, rng.randint(3, 7))
        lost = rng.random() < 0.12
        contract = workday_after(offer, rng.randint(2, 12))
        weeks = 4 if kind in ("Wardrobe", "Office") else (5 if kind == "Bathroom" else 6)
        install = next_weekday(workday_after(contract, weeks * 5 + rng.randint(0, 6)))
        handover = workday_after(install, 1 if kind == "Wardrobe" else rng.randint(1, 3))
        p.update(measure=measure, offer=offer, contract=None if lost else contract, install=None if lost else install,
                 handover=None if lost else handover, lost=lost, weeks=weeks,
                 lost_reason=rng.choice(["chose a cheaper chain store", "postponed the renovation to next year", "price above budget", "no answer after the offer"]) if lost else None)
    if any(x["title"] == p["title"] for x in projects):
        p["title"] = f"{kind} — {client['name']}, {client['area']}"
    if any(x["title"] == p["title"] for x in projects):
        p["title"] = f"{p['title']} ({lead_date.year})"
    projects.append(p)
    client.setdefault("projects", []).append(p)
    return p


# fixed projects (demo inbox facts)
by_name = {c["name"]: c for c in clients}
vitola_lines = [("Kitchen", "L-shape 4.2 m, painted MDF fronts, greige (NCS S 3005-Y20R)", 5640), ("Worktop", "quartz, Calacatta-look", 1450),
                ("Built-in wardrobe", "1.2 m, hinged painted doors (bedroom)", 710)]
add_project(by_name["Laura Vītola"], "Kitchen + wardrobe", {"shape": "L-shape 4.2 m", "fronts": "painted MDF", "colour": "greige", "worktop": "quartz"}, vitola_lines,
            D(2026, 8, 24), fixed={"measure": D(2026, 8, 27), "offer": D(2026, 9, 3), "contract": D(2026, 9, 10), "install": D(2026, 11, 12), "handover": None,
                                    "planned_install": D(2026, 11, 5), "weeks": 7, "lost": False, "late": True, "paid": 3900,
                                    "title": "Kitchen + wardrobe — Vītola, Brīvības iela 120"})
eglitis_lines = [("Kitchen", "L-shape 4.6 m, painted MDF fronts, sage green", 7200), ("Worktop", "solid oak (own workshop)", 650),
                 ("Appliance housings", "2 × integrated (fridge + dishwasher)", 360), ("LED lighting", "under wall cabinets, touch dimmer", 240)]
add_project(by_name["Roberts Eglītis"], "Kitchen", {"shape": "L-shape 4.6 m", "fronts": "painted MDF", "colour": "sage green", "worktop": "solid oak"}, eglitis_lines,
            D(2026, 7, 2), fixed={"measure": D(2026, 7, 7), "offer": D(2026, 7, 14), "contract": D(2026, 7, 21), "install": D(2026, 10, 27), "handover": D(2026, 10, 30),
                                   "weeks": 6, "lost": False, "paid": 8450, "title": "Kitchen — Eglītis, Kalnciema iela"})
ieva_lines = [("Kitchen", "L-shape 4.2 m, painted MDF fronts, sage green", 7200), ("Worktop", "NOT CHOSEN YET – oak 650 € or quartz 1 450 €", 0),
              ("Appliance housings", "2 × integrated (fridge + dishwasher, she buys them)", 360), ("Extra drawer units", "1 × set of 4 drawers (corner)", 390)]
add_project(by_name["Ieva Bērziņa"], "Kitchen", {"shape": "L-shape 4.2 m", "fronts": "painted MDF", "colour": "sage green", "worktop": "open (oak or quartz)"}, ieva_lines,
            D(2026, 11, 3), fixed={"measure": D(2026, 11, 16), "offer": None, "offer_due": D(2026, 11, 20), "contract": None, "install": None, "handover": None,
                                   "weeks": 6, "lost": False, "budget": "around 9–10 thousand", "title": "Kitchen — Bērziņa, Ganību dambis"})
add_project(by_name["Anna Kalniņa"], "Kitchen", {"shape": "about 4 m (to measure)", "fronts": "?", "colour": "?", "worktop": "?"}, [("Kitchen", "about 4 m – measurement pending", 0)],
            D(2026, 11, 10), fixed={"measure": D(2026, 11, 20), "measure_time": "10:00", "offer": None, "contract": None, "install": None, "handover": None, "weeks": 6,
                                    "lost": False, "title": "Kitchen — Kalniņa, Teika"})

gen_clients = [c for c in clients if not c["fixed"]]
for c in gen_clients:
    kind = rng.choices([t[0] for t in TYPES], [t[2] for t in TYPES])[0]
    if kind == "Kitchen + wardrobe":
        s1, l1 = kitchen_scope()
        s2, l2 = wardrobe_scope()
        scope, lines = {**s1, **s2}, l1 + l2
    else:
        fn = dict((t[0], t[1]) for t in TYPES)[kind]
        scope, lines = fn()
    lead = c["since"]
    if lead > TODAY - dt.timedelta(days=3):
        lead = TODAY - dt.timedelta(days=rng.randint(4, 30))
        c["since"] = lead
    p = add_project(c, kind, scope, lines, lead)
    # a few repeat clients get a second, later project
    if rng.random() < 0.08 and lead < D(2025, 9, 1):
        s, l = wardrobe_scope()
        add_project(c, "Wardrobe", s, l, lead + dt.timedelta(days=rng.randint(200, 380)))


def status(p):
    if p.get("lost"):
        return "lost"
    if p.get("handover") and p["handover"] <= TODAY:
        return "warranty" if p["handover"] > TODAY - dt.timedelta(days=730) else "done"
    if p.get("install") and p["install"] <= TODAY:
        return "install"
    if p.get("contract") and p["contract"] <= TODAY:
        return "production"
    if p.get("offer") and p["offer"] <= TODAY:
        return "offer sent"
    if p.get("measure") and p["measure"] <= TODAY:
        return "measured"
    return "lead"


for p in projects:
    # future dates beyond today are "planned"
    p["status"] = status(p)
    if p["status"] == "warranty" and p["handover"] < TODAY - dt.timedelta(days=60):
        p["status"] = "done"
    if not p.get("lost") and p.get("contract") and "paid" not in p:
        dep = round(p["total"] * 0.5)
        p["paid"] = p["total"] if p["status"] in ("done", "warranty") else (dep if p["contract"] <= TODAY else 0)
    p.setdefault("issues", rng.sample(ISSUES, rng.choice([0, 1, 1, 2])))
    p.setdefault("changes", rng.sample(CHANGE, rng.choice([0, 0, 1])))
    p["review"] = (rng.random() < 0.6) if p["status"] in ("done", "warranty") else False

by_client_proj = {p["client"]["name"]: p for p in projects}
by_client_proj["Laura Vītola"]["issues"] = [
    "Painted fronts from [[Fasādes LV]] delivered 6 working days late (paint-line breakdown) – install moved from 05.11 to 12.11. **Our side**, not the client's.",
    "19.11 on site: Laura says the greige cabinet colour now looks 'too grey' on the wall – reported by [[Kaspars Liepiņš]] on Slack. Colour was approved on an A4 sample on 15.09 (see meeting note).",
    "Laura asked by email for 15 % off because of the delay – goes to Mārtiņš (no discounts by message).",
]
by_client_proj["Laura Vītola"]["changes"] = []
by_client_proj["Roberts Eglītis"]["review"] = False
by_client_proj["Roberts Eglītis"]["issues"] = []

# ------------------------------------------------------------------ meetings
meetings = []  # dicts: date, time, title, who(list), project, kind, body


def meeting(date, time, title, who, kind, body, project=None):
    m = {"date": date, "time": time, "title": title, "who": who, "kind": kind, "body": body.strip(), "project": project}
    meetings.append(m)
    return m


MEAS_NOTES = ["Walls out of square by 1–2 cm on the window side.", "Radiator under the window – worktop stops 5 cm before it.", "Gas pipe runs along the left wall at 1.2 m height.",
              "Ceiling 2.75 m – tall wall cabinets possible.", "Floor drops 9 mm towards the balcony door.", "Water and drain on the right wall, 40 cm from the corner.",
              "Wall tiles stay – the splashback goes over them.", "Ventilation duct box in the corner, 25 × 25 cm.", "Window sill 82 cm high – worktop must pass under it."]
WISHES = ["lots of drawers instead of doors", "a place for a big pot drawer", "hidden bin under the sink", "open shelf for cookbooks", "a breakfast bar for two",
          "tall pantry cabinet", "no handles if the budget allows", "matt fronts, nothing glossy", "LED under the wall cabinets", "space for a coffee machine"]

for p in projects:
    if p["lead"] < D(2025, 10, 1):
        continue  # older projects: no meeting notes (like a real vault – notes start when the system started)
    c = p["client"]
    if p.get("measure") and p["measure"] <= TODAY + dt.timedelta(days=1) and not (c["name"] == "Anna Kalniņa"):
        who = [OWNER if rng.random() < 0.6 else "Kaspars Liepiņš", c["name"]]
        h = avoid_design_block(p["measure"], rng.choice([9, 10, 14, 16, 17]))
        notes = rng.sample(MEAS_NOTES, 3)
        wishes = rng.sample(WISHES, 2)
        if c["name"] == "Ieva Bērziņa":
            notes = ["L-shaped kitchen, 4.2 m along two walls.", "Window wall straight; fridge wall 1 cm out of square.", "Water and drain under the window."]
            wishes = ["integrated fridge and dishwasher (she buys the appliances herself)", "4 extra drawers under the corner instead of a cupboard",
                      "worktop: undecided between oak and quartz", "painted MDF, sage green"]
        meeting(p["measure"], f"{h:02d}:00", f"Measurement — {surname(c['name'])}", who, "measurement", f"""
**Object:** {c['street']}, {c['area']} · project [[{p['title']}]]

## Measured
{chr(10).join('- ' + n for n in notes)}

## Client wishes
{chr(10).join('- ' + w for w in wishes)}

## Budget
- Client said: {p.get('budget') or ('around ' + eur(round(p['total'] * rng.uniform(0.85, 1.15), -2)) + ' €') if p['total'] else 'not discussed yet'}

## Next
- [ ] [[Mārtiņš Ozols]] – layout + offer by {fmt(p.get('offer_due') or p.get('offer') or workday_after(p['measure'], 5))}
- [ ] [[Elīna Zariņa]] – check lead times with [[Fasādes LV]] and [[Kokmateriāli Baltic]]

Process: [[SOP — Measurement visit]]
""", p)
    if p.get("contract") and p["contract"] <= TODAY and p["kind"] != "Office":
        review = workday_after(p["offer"], 1)
        if review < p["contract"]:
            opts = rng.sample(COLOURS[:6], 2)
            chosen = p["scope"].get("colour", opts[0])
            if c["name"] == "Laura Vītola":
                review, opts, chosen = D(2026, 9, 15), ["greige", "warm white"], "greige (NCS S 3005-Y20R)"
            meeting(review, f"{avoid_design_block(review, 15):02d}:00", f"Design review — {surname(c['name'])}", [OWNER, "Agnese Kalēja", c["name"]], "design", f"""
Project [[{p['title']}]] · 3D views by [[Agnese Kalēja]]

## Shown
- Two colour options: {opts[0]} vs {opts[1]} ([[2026-02-02 Two colour options, never more]])
- Worktop: {p['scope'].get('worktop', '–')}

## Decided
- Colour: **{chosen}**{' – approved on an A4 sample door' if c['name'] == 'Laura Vītola' else ''}
- {rng.choice(['Handles: black matt bar 160 mm', 'Handles: brushed brass knobs', 'Handle-less with push-to-open (not on dishwasher)', 'Handles: integrated profile'])}

## Next
- [ ] [[Mārtiný Ozols]] – final offer
""".replace("Mārtiný", "Mārtiņš"), p)
        meeting(p["contract"], f"{avoid_design_block(p['contract'], rng.choice([11, 15, 17])):02d}:30", f"Contract signing — {surname(c['name'])}", [OWNER, c["name"]], "contract", f"""
Project [[{p['title']}]] · contract total **{eur(p['total'])} €** · deposit 50 % = {eur(round(p['total'] / 2))} €

- Signed from [[Template — Contract]] with the offer as Annex 1.
- Production {p['weeks']} weeks after the deposit; install window agreed with [[Kaspars Liepiņš]].
- Deposit invoice sent the same day.

Process: [[SOP — Contract and deposit]]
""", p)
    if p.get("handover") and p["handover"] <= TODAY:
        punch = rng.sample(["one door needs a hinge adjustment", "silicone line behind the sink to redo", "missing cover cap on a shelf pin", "drawer front 1 mm high"], rng.choice([0, 1, 1, 2]))
        happy = c["name"] == "Roberts Eglītis" or rng.random() < 0.85
        meeting(p["handover"], f"{rng.choice([10, 13, 15])}:00", f"Handover — {surname(c['name'])}", ["Kaspars Liepiņš", c["name"]], "handover", f"""
Project [[{p['title']}]] · [[Template — Handover protocol]] signed

## Punch list
{chr(10).join('- ' + x for x in punch) if punch else '- nothing – all OK'}

## Client
- {'Very happy' + (' – "my wife loves it"' if c['name'] == 'Roberts Eglītis' else '') if happy else 'Satisfied, a bit tired after the long wait'}
- Care guide handed over ({'oak' if 'oak' in str(p['scope'].get('worktop')) else 'painted fronts'})
- Final invoice {eur(p['total'] - round(p['total'] / 2))} € sent

Process: [[SOP — Handover and final payment]]
""", p)

# Vītola extra: delay call with supplier + colour issue
meeting(D(2026, 10, 27), "15:00", "Call — Fasādes LV delay (Vītola fronts)", ["Elīna Zariņa", "Renāte Gulbe"], "supplier", """
[[Fasādes LV]] paint line broke down; the greige fronts for [[Kitchen + wardrobe — Vītola, Brīvības iela 120]] ship 6 working days late.

## Decided
- New front delivery 10.11, install moved from 05.11 to **12.11** ([[Kaspars Liepiņš]] confirmed).
- [[Elīna Zariņa]] tells Laura today; [[Mārtiņš Ozols]] calls her about the delay himself.
- Countertop (quartz) template after carcasses → delivery Thu 26.11 08:00–10:00 by [[Kokmateriāli Baltic]].
""", by_client_proj["Laura Vītola"])

# weekly team meetings (Tuesday lunch status since 2026-06-15)
d = D(2026, 6, 16)
while d < TODAY:
    active = [p for p in projects if p.get("contract") and p["contract"] <= d and (not p.get("handover") or p["handover"] >= d)]
    installs = sorted([p for p in projects if p.get("install") and d <= p["install"] <= d + dt.timedelta(days=7)], key=lambda x: x["install"])
    newleads = [p for p in projects if d - dt.timedelta(days=7) <= p["lead"] < d]
    def stage(p):
        if p.get("install") and p["install"] >= d:
            return "install " + fmt(p["install"])
        return "installing – finishing touches" if p.get("install") else "production"
    lines = [f"- [[{p['title']}]] – {stage(p)}" for p in sorted(active, key=lambda x: x.get("install") or TODAY)[:9]]
    topics = rng.sample([
        "Van service booked – [[Jānis Krūmiņš]] takes the small van for a day.",
        "[[Līga Upīte]]: reel of the last sage-green kitchen got 14k views.",
        "Hinge stock low – [[Elīna Zariņa]] orders from [[Furnitūra Rīga]].",
        "[[Ivo Sproģis]]: two oak tops in the workshop this week.",
        "Remind clients to choose appliances before production.",
        "Waiting list: next free install slot mid-January ([[2026-10-19 Waiting list instead of rushing]]).",
        "Quartz templating dates to sync with [[Kokmateriāli Baltic]].",
        "New sample doors from [[Fasādes LV]] in the office.",
        "Tia pilot: routine messages now handled automatically ([[2026-08-03 Tia as the office assistant (pilot)]]).",
    ], 2)
    meeting(d, "12:30", f"Team status — week {d.isocalendar()[1]}", [OWNER, "Elīna Zariņa", "Kaspars Liepiņš", "Jānis Krūmiņš", "Agnese Kalēja"], "team", f"""
Tuesday lunch status ([[SOP — Team lunch and office]], [[Bolt Food — usual team lunch]])

## Projects in production / install
{chr(10).join(lines) if lines else '- none'}

## Installs next 7 days
{chr(10).join(f"- {WD[p['install'].weekday()]} {fmt(p['install'])} – [[{p['title']}]]" for p in installs) or '- none'}

## New leads last week: {len(newleads)}
{chr(10).join(f"- [[{p['client']['name']}]] – {p['kind'].lower()}, {p['client']['area']} ({p['client']['source'].replace('[[', '').replace(']]', '')})" for p in newleads[:6])}

## Other
{chr(10).join('- ' + t for t in topics)}
""")
    d += dt.timedelta(days=7)

# supplier / partner meetings
for (date, title, who, body) in [
    (D(2026, 9, 22), "Kokmateriāli Baltic — 2027 prices and templating", ["Elīna Zariņa", "Ojārs Vanags"], "Quartz +6 % from January; templating stays free. Delivery days stay Tue/Thu 08:00–10:00. Reminder: bank details only confirmed by phone ([[2025-05-14 Bank details are only confirmed by phone]])."),
    (D(2026, 10, 6), "Furnitūra Rīga — new drawer system demo", [OWNER, "Edgars Pole"], "New full-extension drawer with integrated LED shown. Not switching yet – current system has zero warranty calls in 2026."),
    (D(2026, 8, 18), "Arhitektu birojs Smilga — referrals 2026", [OWNER], "Two house projects expected in autumn. They want DWG drawings and one contact person – [[Mārtiņš Ozols]]."),
    (D(2026, 10, 13), "Gaismas Studija — wardrobe lighting", ["Agnese Kalēja", "Artis Kalve"], "Motion-sensor strips 90 € per section; 3000 K default stays."),
    (D(2026, 11, 10), "Ilze Kronberga — year-end documents", ["Elīna Zariņa", "Ilze Kronberga"], "October receipts needed by Fri 20.11 for the VAT return; year-end inventory list by 31.12."),
]:
    meeting(date, "14:00", title, who, "supplier", body)

# ------------------------------------------------------------------ leads (not converted + open pipeline)
leads = []
for p in projects:
    if p.get("lost"):
        leads.append({"name": p["client"]["name"], "date": p["lead"], "source": p["client"]["source"], "request": f"{p['kind'].lower()} in {p['client']['area']}",
                      "status": f"lost – {p['lost_reason']}", "project": p})
for _ in range(32):
    name = new_person()
    area = rng.choice(list(AREAS))
    date = D(2026, 1, 5) + dt.timedelta(days=rng.randint(0, (TODAY - D(2026, 1, 5)).days - 1))
    req = rng.choice(["kitchen 3 m with an island", "built-in wardrobe in the hallway", "kitchen for a new-build flat", "bathroom renovation", "kitchen + living room storage wall",
                      "only kitchen fronts replaced", "small office kitchenette", "wardrobe with sliding doors, 2.4 m"])
    st = rng.choices(["cold – no answer after 2 follow-ups", "lost – chose a chain store", "not a fit – outside Riga region", "not a fit – wants only carcasses",
                      "waiting – renovation starts in spring", "waiting – flat keys in January"], [30, 20, 10, 10, 15, 15])[0]
    leads.append({"name": name, "date": date, "source": rng.choice(["Instagram", "Website form", "Google search", "Nekustamie Rīga"]), "request": f"{req} ({area})",
                  "status": st, "lang": rng.choice(["Latvian", "English", "Russian"])})
for fl in FIXED_LEADS:
    leads.append({"name": fl["name"], "date": fl["date"], "source": fl["channel"], "request": fl["request"], "status": fl["status"], "lang": fl["lang"], "fixed": True})

# ------------------------------------------------------------------ write: people
for t in TEAM:
    projs = [p for p in projects if p.get("install") and p["install"] >= D(2026, 6, 1)] if "install" in t["role"].lower() else []
    put(f"Team/{t['name']}.md", f"""---
type: team
role: {t['role']}
since: {t['since']}
---
# {t['name']}
- **Role:** {t['role']} (with us since {t['since']}).
- **Does:** {t['does']}.

## Working habits
{chr(10).join('- ' + h for h in t['habits'])}
{chr(10) + '## Installs since June 2026' + chr(10) + chr(10).join(f"- {fmt(p['install'])} – [[{p['title']}]]" for p in sorted(projs, key=lambda x: x['install'])[-12:]) if projs else ''}

Team overview: [[MOC — Team]]
""")
for e in EXTERNAL_PEOPLE:
    put(f"People/{e['name']}.md", f"""---
type: person
---
# {e['name']}
- **Role:** {e['role']}. Email: {e['email']}
{chr(10).join('- ' + n for n in e['notes'])}
- Process: [[SOP — Monthly documents for the accountant]]
""")
for s in SUPPLIERS:
    if s.get("contact"):
        put(f"People/{s['contact']}.md", f"""---
type: person
---
# {s['contact']}
- {s['contact_role'].capitalize()} at [[{s['name']}]].
- Email: {s['contact'].split()[0].lower().translate(str.maketrans('āčēģīķļņšūž', 'acegiklnsuz'))}@{s['domain']}
""")

# ------------------------------------------------------------------ write: suppliers & partners
for s in SUPPLIERS:
    if s["name"] == "Bolt Food":
        continue
    used_in = [p for p in projects if f"[[{s['name']}]]" in json.dumps(p.get("issues", []) + p.get("changes", []), ensure_ascii=False)][:8]
    put(f"Suppliers/{s['name']}.md", f"""---
type: supplier
---
# {s['name']}
- **What:** {s['kind']}.
- **Contact:** {'[[' + s['contact'] + ']] (' + s['contact_role'] + ')' if s.get('contact') else '–'}{', orders@' + s['domain'] if s.get('domain') else ''}
- **Lead time:** {s['lead_time']} · **Terms:** {s['terms']}

## Notes
{chr(10).join('- ' + n for n in s['notes'])}
{chr(10) + '## Mentioned in projects' + chr(10) + chr(10).join(f"- [[{p['title']}]]" for p in used_in) if used_in else ''}

All suppliers: [[MOC — Suppliers and partners]] · Orders: [[SOP — Supplier orders]]
""")
# keep the original Bolt Food order note name (inbox replay relies on it)
put("Suppliers/Bolt Food — usual team lunch.md", """---
type: order
---
# Bolt Food – usual team lunch (Tuesdays)
- Restaurant: Lido Krasta (demo). 4 × lunch of the day (8,90 €), 4 × lemonade (2,90 €), delivery 2,50 €.
- Usual total ≈ 49,70 €. Deliver to the office, 12:15.
- For the Tuesday status lunch ([[2026-06-15 Tuesday team lunch]]).
- **It is a purchase:** Tia prepares the basket and sends it to [[Mārtiņš Ozols]] for approval (Needs you). Only after his OK does [[Elīna Zariņa]] place and pay the order.
""")
for pt in PARTNERS:
    put(f"Partners/{pt['name']}.md", f"""---
type: partner
---
# {pt['name']}
- **What:** {pt['kind']}.{' Web: ' + pt['domain'] if pt.get('domain') else ''}
{chr(10).join('- ' + n for n in pt['notes'])}

Partnerships: [[2026-11-02 Referral partnerships need a written agreement]] · [[MOC — Suppliers and partners]]
""")

# ------------------------------------------------------------------ write: clients
for c in clients:
    ps = c.get("projects", [])
    extra = ""
    if c["name"] == "Ieva Bērziņa":
        extra = """
## From the measurement (Mon 16.11)
- Measured by [[Mārtiņš Ozols]]: **L-shaped kitchen, 4.2 m**, painted MDF fronts (sage green), soft-close drawers.
- Wants housing for an **integrated fridge and dishwasher** (she buys the appliances herself).
- Asked for **4 extra drawers** under the corner instead of a cupboard.
- **Worktop: not chosen yet** – was deciding between oak and quartz at the measurement. Ask her before quoting.
- Budget mentioned: "around 9–10 thousand".
- Wants the written offer **by Friday 20.11**."""
    if c["name"] == "Anna Kalniņa":
        extra = """
## Now
- New kitchen, about 4 m, Teika flat. Writes in Latvian, prefers WhatsApp.
- **Measurement booked Fri 20.11 10:00** (see [[Calendar — this week]])."""
    if c["name"] == "Laura Vītola":
        extra = """
## Now
- Kitchen + wardrobe, Brīvības iela 120. **Contract 7 800 €, 50 % paid** (3 900 €).
- Project ~1 week late because the fronts supplier ([[Fasādes LV]]) was late – **our side, not hers**.
- Countertops (quartz) arrive **Thu 26.11 08:00–10:00**, installed the same day by [[Kaspars Liepiņš]].
- Referred to us by [[Roberts Eglītis]]."""
    if c["name"] == "Roberts Eglītis":
        extra = """
## Now
- Kitchen finished **30.10.2026**, paid in full. Very happy – good candidate for a review ([[Reviews — how we ask]]).
- Referred [[Laura Vītola]] to us."""
    rv = [p for p in ps if p.get("review")]
    put(f"Clients/{c['name']}.md", f"""---
type: client
area: {c['area']}
language: {c['lang']}
---
# {c['name']}
- **Object:** {c['street']}, {c['area']}
- **Contact:** {c['channel']}{(' · ' + c['email']) if c.get('email') else ''} · writes in {c['lang']}
- **Came from:** {c['source']} · first contact {fmt(c['since'])}
- **Projects:** {', '.join(f"[[{p['title']}]] ({p['status']})" for p in ps) if ps else '–'}
{'- Left a Google review (5★).' if rv else ''}
{extra}

[[MOC — Clients]]
""")

# ------------------------------------------------------------------ write: projects
STAGE_NAMES = [("lead", "First contact"), ("measure", "Measurement"), ("offer", "Offer sent"), ("contract", "Contract + deposit"), ("install", "Install"), ("handover", "Handover")]
for p in projects:
    c = p["client"]
    tl = []
    for key, label in STAGE_NAMES:
        dval = p.get(key)
        if dval:
            tl.append(f"| {label} | {WD[dval.weekday()]} {fmt(dval)} | {'done' if dval <= TODAY else 'planned'} |")
    if p.get("offer_due") and not p.get("offer"):
        tl.append(f"| Offer due | {WD[p['offer_due'].weekday()]} {fmt(p['offer_due'])} | **open** |")
    if p.get("planned_install"):
        tl.append(f"| (originally planned install) | {fmt(p['planned_install'])} | moved – supplier delay |")
    total = p["total"]
    pay = ""
    if p.get("contract") and not p.get("lost"):
        dep = round(total / 2)
        pay = f"""
## Payments ([[Payment terms and deposits]])
| | Amount | Status |
|---|---|---|
| Deposit 50 % | {eur(dep)} € | {'paid' if p['contract'] <= TODAY else 'invoice on signing'} |
| Final 50 % | {eur(total - dep)} € | {'paid' if p['status'] in ('done', 'warranty') else 'after handover'} |
"""
    log = []
    if p.get("measure") and p["measure"] <= TODAY:
        log.append(f"- {fmt(p['measure'])} – measured ({'[[Mārtiņš Ozols]]' if rng.random() < 0.6 else '[[Kaspars Liepiņš]]'}).")
    if p.get("contract") and p["contract"] <= TODAY:
        log.append(f"- {fmt(p['contract'])} – contract signed, fronts ordered from {'[[Fasādes LV]]' if 'painted' in str(p['scope'].get('fronts')) else '[[Laminātu centrs]]'} by [[Elīna Zariņa]].")
    for i in p.get("issues", []):
        log.append(f"- {i}")
    for ch in p.get("changes", []):
        log.append(f"- Change order: {ch} ([[SOP — Change orders]]).")
    if p.get("lost"):
        log.append(f"- Lost: {p['lost_reason']}.")
    if p.get("review"):
        log.append("- Client left a 5★ Google review.")
    put(f"Projects/{p['title']}.md", f"""---
type: project
code: {p['code']}
status: {p['status']}
client: "{c['name']}"
value: {total}
---
# {p['title']}
**Client:** [[{c['name']}]] · **Object:** {c['street']}, {c['area']} · **Status:** {p['status']} · **Code:** {p['code']}

## Scope
| Item | Specification | Price |
|---|---|---|
{chr(10).join(f"| {a} | {b} | {eur(x) + ' €' if x else '–'} |" for a, b, x in p['lines'])}
| **Total** | incl. VAT, installation | **{eur(total) + ' €' if total else 'to be quoted'}** |

## Timeline
| Stage | Date | |
|---|---|---|
{chr(10).join(tl)}
{pay}
## Log
{chr(10).join(log) if log else '- –'}

Related: [[MOC — Projects]]{' · [[Painted MDF vs laminate fronts]]' if 'painted' in str(p['scope'].get('fronts')) else ''}{' · [[Worktops — laminate, oak, quartz]]' if p['scope'].get('worktop') else ''}
""")

# ------------------------------------------------------------------ write: meetings
for m in meetings:
    who = ", ".join(f"[[{w}]]" for w in m["who"])
    put(f"Meetings/{iso(m['date'])} {m['title']}.md", f"""---
type: meeting
date: {iso(m['date'])}
kind: {m['kind']}
---
# {m['title']}
**When:** {WD[m['date'].weekday()]} {fmt(m['date'])} {m['time']} · **Who:** {who}

{m['body']}
""")

# ------------------------------------------------------------------ write: leads
for l in leads:
    put(f"Leads/{iso(l['date'])} {l['name']}.md", f"""---
type: lead
date: {iso(l['date'])}
status: {l['status'].split(' –')[0]}
---
# Lead — {l['name']}
- **When:** {fmt(l['date'])} · **Source:** {l['source']}{' · writes in ' + l['lang'] if l.get('lang') else ''}
- **Request:** {l['request']}
- **Status:** {l['status']}
{('- Project: [[' + l['project']['title'] + ']]') if l.get('project') else ''}
{'- First reply goes to [[Mārtiņš Ozols]] for approval ([[SOP — Answering new leads]]). Use [[Price list]] ranges, offer a free measurement.' if l.get('fixed') else ''}
""")

# ------------------------------------------------------------------ write: daily notes (Jul 1 – Nov 18 2026)
events = defaultdict(list)
for p in projects:
    t = f"[[{p['title']}]]"
    if D(2026, 3, 2) <= p["lead"] <= TODAY:
        events[p["lead"]].append(f"New lead: [[{p['client']['name']}]] – {p['kind'].lower()} ({p['client']['source'].replace('[[', '').replace(']]', '')}).")
    for key, txt in [("measure", "Measurement"), ("offer", "Offer sent"), ("contract", "Contract signed, deposit invoice sent"), ("install", "Install day"), ("handover", "Handover, final invoice")]:
        if p.get(key) and D(2026, 3, 2) <= p[key] < TODAY:
            events[p[key]].append(f"{txt} – {t}.")
for m in meetings:
    if D(2026, 3, 2) <= m["date"] < TODAY:
        events[m["date"]].append(f"[[{iso(m['date'])} {m['title']}]]")
for l in leads:
    if D(2026, 3, 2) <= l["date"] < TODAY and not l.get("project"):
        events[l["date"]].append(f"Lead [[{iso(l['date'])} {l['name']}]] – {l['request']}.")
OFFICE = ["Hinges and runners restocked from [[Furnitūra Rīga]].", "[[Līga Upīte]] posted a before/after reel.", "[[Agnese Kalēja]] reorganised the sample library.",
          "Receipts scanned for [[Ilze Kronberga]].", "[[Ivo Sproģis]] finished an oak worktop in the workshop.", "Van to the service – [[Jānis Krūmiņš]] on warranty visits instead.",
          "Two Instagram DMs answered with price ranges.", "Google review received – thanked the client.", "Paid [[Kokmateriāli Baltic]] invoice (details checked).",
          "[[Elīna Zariņa]] updated the supplier order sheet.", "Newsletter from [[Riga Design Week]] archived.", "Touch-up pens restocked at [[Krāsu Nams]]."]
d = D(2026, 3, 2)
while d < TODAY:
    if d.weekday() < 5:
        ev = events.get(d, []) + rng.sample(OFFICE, rng.choice([1, 2]))
        if d.weekday() in (0, 2):
            ev.insert(0, "08:00–12:00 design block ([[2025-08-25 Design blocks Monday and Wednesday mornings]]).")
        put(f"Daily/{iso(d)}.md", f"""---
type: daily
date: {iso(d)}
---
# {WD[d.weekday()]} {fmt(d)}
{chr(10).join('- ' + e for e in ev)}
""")
    d += dt.timedelta(days=1)

# ------------------------------------------------------------------ write: finance
monthly = defaultdict(lambda: {"in": 0, "items": []})
for p in projects:
    if p.get("lost") or not p.get("contract"):
        continue
    dep = round(p["total"] / 2)
    if p["contract"] <= TODAY:
        monthly[(p["contract"].year, p["contract"].month)]["in"] += dep
        monthly[(p["contract"].year, p["contract"].month)]["items"].append((p, "deposit", dep))
    if p.get("handover") and p["handover"] <= TODAY:
        k = (p["handover"].year, p["handover"].month)
        monthly[k]["in"] += p["total"] - dep
        monthly[k]["items"].append((p, "final", p["total"] - dep))
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
rows = []
for m in range(1, 11):
    v = monthly[(2026, m)]
    materials = round(v["in"] * 0.42)
    fixed = 11400 + 1850 + 900 + rng.choice([400, 550, 700])
    profit = v["in"] - materials - fixed
    rows.append((m, v["in"], materials, fixed, profit))
    put(f"Finance/2026-{m:02d} {MONTHS[m - 1]} report.md", f"""---
type: finance
month: 2026-{m:02d}
---
# {MONTHS[m - 1]} 2026 — money in and out
| | € |
|---|---|
| Payments received | {eur(v['in'])} |
| Materials and suppliers (~42 %) | {eur(materials)} |
| Wages, rent, vans, marketing | {eur(fixed)} |
| **Result** | **{eur(profit)}** |

## Payments received
{chr(10).join(f"- [[{p['title']}]] – {kind} {eur(a)} €" for p, kind, a in v['items']) or '- none'}

Prepared by [[Elīna Zariņa]] for [[Ilze Kronberga]] · [[MOC — Finance]]
""")
put("Finance/2026 overview.md", f"""---
type: finance
---
# 2026 overview (January–October)
| Month | In | Materials | Fixed | Result |
|---|---|---|---|---|
{chr(10).join(f"| [[2026-{m:02d} {MONTHS[m - 1]} report|{MONTHS[m - 1]}]] | {eur(a)} | {eur(b)} | {eur(c)} | {eur(e)} |" for m, a, b, c, e in rows)}
| **Total** | **{eur(sum(r[1] for r in rows))}** | {eur(sum(r[2] for r in rows))} | {eur(sum(r[3] for r in rows))} | **{eur(sum(r[4] for r in rows))}** |

- Average kitchen contract 2026: {eur(round(sum(p['total'] for p in projects if p['kind'] == 'Kitchen' and p.get('contract') and p['contract'].year == 2026) / max(1, len([p for p in projects if p['kind'] == 'Kitchen' and p.get('contract') and p['contract'].year == 2026]))))} €
- Payment terms: [[Payment terms and deposits]] · Pricing: [[Price list]]
""")

# ------------------------------------------------------------------ write: knowledge, decisions, templates
for folder, title, tag, body in KNOWLEDGE:
    put(f"{folder}/{title}.md", f"---\ntype: knowledge\ntopic: {tag}\n---\n# {title}\n{body.strip()}\n")
put("Knowledge/How we work/Decisions log — complaints.md", """---
type: knowledge
topic: sop
---
# Decisions log — complaints
| Date | Client | What | Outcome |
|---|---|---|---|
| 2025-03 | (warranty) | Corner carousel broke | Replaced with drawers – led to [[2025-10-06 Corner drawers instead of carousels]] |
| 2025-09 | (delay) | Install 1 week late | Mārtiņš called, free LED lighting as goodwill |
| 2026-06 | (quality) | Chip on a painted front | Front replaced by [[Fasādes LV]] in 5 days |
| 2026-11 | [[Laura Vītola]] | Delay (our supplier) + wants 15 % off; now dislikes the greige colour | **open – Mārtiņš decides** |

Process: [[SOP — Complaints and quality issues]]
""")
for date, title, context, decision, alts in DECISIONS:
    put(f"Decisions/{date} {title}.md", f"""---
type: decision
date: {date}
status: decided
---
# {title}
**Decided by:** [[Mārtiņš Ozols]] · {fmt(D.fromisoformat(date))}

## Context
{context}

## Decision
{decision}
{chr(10) + '## Considered instead' + chr(10) + chr(10).join('- ' + a for a in alts) if alts else ''}

[[MOC — Decisions]]
""")
for title, body in TEMPLATES.items():
    put(f"Templates/{title}.md", body)

# ------------------------------------------------------------------ core notes (owner-facing; facts from the original demo vault)
put("Business.md", f"""---
type: business
---
# Liepa Interjers (fictional demo business)

- **What we do:** custom kitchens, built-in furniture and interior renovation in Riga and Pierīga.
- **Owner:** [[Mārtiņš Ozols]] (the person Tia works for).
- **Team:** [[Elīna Zariņa]] (project manager, office), [[Kaspars Liepiņš]] (lead installer), [[Jānis Krūmiņš]] (installer), [[Agnese Kalēja]] (junior designer), [[Ivo Sproģis]] (workshop), [[Līga Upīte]] (sales & social, part-time).
- **Typical job:** kitchen 3–5 m, 6–8 weeks from measurement to install.
- **Channels:** email info@liepa-interjers.example, WhatsApp business number, Instagram @liepa.interjers, team Slack.
- **Google review link:** https://g.page/r/liepa-interjers-demo/review
- **Our real supplier domains:** kokmateriali-baltic.example (countertops, boards), liepa-interjers.example (our own).
- **Office:** Ūdens iela, Pārdaugava · **Workshop:** Ķekava.
- **Since:** 2017 · **2026:** {len([p for p in projects if p.get('contract') and p['contract'].year == 2026])} contracts so far, 47 Google reviews (4.9).

Start here: [[Home]] · How we work: [[MOC — How we work]] · Prices: [[Price list]] · Rules for Tia: [[Owner preferences]]
""")
put("Owner preferences.md", """---
type: preferences
owner: Mārtiņš Ozols
---
# How Mārtiņš wants things done

## Tone
- Warm, short, professional. First name with clients. Sign as "Tia, assistant to Mārtiņš – Liepa Interjers".
- Reply in the language the person wrote in (Latvian or English, sometimes Russian).

## Tia may do on her own
- Reschedule client meetings if the new slot is free in [[Calendar — this week]].
- Confirm supplier deliveries and put them in the calendar.
- Answer accountant requests about documents; Elīna collects receipts.
- Thank happy clients and send the Google review link.
- Archive newsletters and marketing emails.

## Always ask me first
- **New leads:** until I say otherwise, show me the reply before it goes out (use [[Price list]] ranges, offer a free measurement).
- **Any money:** discounts, refunds, extra costs, purchases, orders – including the team lunch from Bolt Food and any other food or taxi order. I never give discounts by message.
- **Complaints** and anything about quality or redoing work.
- **Partnerships**, collaborations, press.

## Never
- Never change bank or payment details because of an email. Call the supplier first.
- Never promise an install date without checking with Kaspars.
- Mon and Wed 8:00–12:00 are my design blocks – no meetings there.

Background: [[2025-02-10 No discounts by message]] · [[2025-05-14 Bank details are only confirmed by phone]] · [[2025-08-25 Design blocks Monday and Wednesday mornings]] · [[What Tia may do alone]]
""")
for keep in ["Price list.md", "Calendar — this week.md"]:
    put(keep, open(os.path.join(ROOT, "scripts", "make_demo_vault", "core", keep), encoding="utf-8").read())

# ------------------------------------------------------------------ MOCs + home
def moc(title, intro, groups):
    body = [f"---\ntype: moc\n---\n# {title}\n{intro}\n"]
    for h, items in groups:
        if items:
            body.append(f"## {h} ({len(items)})\n" + "\n".join(f"- [[{i}]]" for i in items) + "\n")
    put(f"MOCs/{title}.md", "\n".join(body))


st_order = ["install", "production", "offer sent", "measured", "lead", "warranty", "done", "lost"]
moc("MOC — Projects", "Every job, by status. Codes LI-YY-NNN.", [(s.capitalize(), sorted(p["title"] for p in projects if p["status"] == s)) for s in st_order])
moc("MOC — Clients", "All clients (A–Z). Leads that never became clients live in `Leads/`.", [("Clients", sorted(c["name"] for c in clients))])
moc("MOC — Leads", "Inbound requests that are not (yet) projects.", [("Leads", sorted(f"{iso(l['date'])} {l['name']}" for l in leads))])
moc("MOC — Suppliers and partners", "Who we buy from and work with.", [("Suppliers", [s["name"] for s in SUPPLIERS if s["name"] != "Bolt Food"] + ["Bolt Food — usual team lunch"]),
                                                                        ("Partners", [p["name"] for p in PARTNERS]), ("People at suppliers", [s["contact"] for s in SUPPLIERS if s.get("contact")])])
moc("MOC — Team", "The people of Liepa Interjers.", [("Team", [t["name"] for t in TEAM]), ("External", [e["name"] for e in EXTERNAL_PEOPLE])])
moc("MOC — How we work", "Processes (SOPs), rules and templates.", [("SOPs", [k[1] for k in KNOWLEDGE if k[2] == "sop"] + ["Decisions log — complaints"]),
                                                                     ("Rules", [k[1] for k in KNOWLEDGE if k[2] == "rules"] + ["Owner preferences"]), ("Templates", list(TEMPLATES))])
moc("MOC — Kitchens and materials", "What we build and with what.", [("Materials", [k[1] for k in KNOWLEDGE if k[2] == "materials"]), ("Care guides", [k[1] for k in KNOWLEDGE if k[2] == "care"]),
                                                                       ("Kitchen projects in 2026", sorted(p["title"] for p in projects if "Kitchen" in p["kind"] and p["lead"].year == 2026))])
moc("MOC — Sales and marketing", "How leads become contracts.", [("Sales", [k[1] for k in KNOWLEDGE if k[2] == "sales"]), ("Marketing", [k[1] for k in KNOWLEDGE if k[2] == "marketing"]),
                                                                   ("Pricing", ["Price list"])])
moc("MOC — Finance", "Money in and out.", [("2026", ["2026 overview"] + [f"2026-{m:02d} {MONTHS[m - 1]} report" for m in range(1, 11)]), ("Terms", ["Payment terms and deposits"])])
moc("MOC — Decisions", "Why we do things the way we do.", [("Decisions", [f"{d[0]} {d[1]}" for d in DECISIONS])])
moc("MOC — Meetings", "Meeting notes since October 2025.", [(k.capitalize(), [f"{iso(m['date'])} {m['title']}" for m in sorted(meetings, key=lambda x: x['date'], reverse=True) if m["kind"] == k])
                                                         for k in ["team", "measurement", "design", "contract", "handover", "supplier"]])
put("Home.md", f"""---
type: home
---
# Liepa Interjers — second brain
The shared memory of a (fictional) Riga kitchen and furniture studio. Tia (the AI secretary) and Hermes read from here.

- **Business:** [[Business]] · [[Owner preferences]] · [[Price list]] · [[Calendar — this week]]
- **Maps:** [[MOC — Projects]] · [[MOC — Clients]] · [[MOC — Leads]] · [[MOC — Meetings]] · [[MOC — Team]] · [[MOC — Suppliers and partners]]
- **How we work:** [[MOC — How we work]] · [[MOC — Kitchens and materials]] · [[MOC — Sales and marketing]] · [[MOC — Finance]] · [[MOC — Decisions]]
- **Tia:** [[Tia/Learned rules|Learned rules]] · [[Tia/Activity log|Activity log]]

Numbers: {len(clients)} clients · {len(projects)} projects · {len(meetings)} meetings · {len(leads)} leads · daily notes since 02.03.2026.
""")

# ------------------------------------------------------------------ write to disk (fresh), keep Tia's own notes from templates
# Templates/ is hand-edited by the team (contract, offer, follow-up): existing files always win over the generated ones.
kept = {}
tdir = os.path.join(OUT, "Templates")
if os.path.isdir(tdir):
    for fn in os.listdir(tdir):
        if fn.endswith(".md"):
            kept[f"Templates/{fn}"] = open(os.path.join(tdir, fn), encoding="utf-8").read()
files.update(kept)
# empty the folder (not delete it – Windows refuses while a terminal or Obsidian has it open)
os.makedirs(OUT, exist_ok=True)
for entry in os.listdir(OUT):
    full = os.path.join(OUT, entry)
    shutil.rmtree(full) if os.path.isdir(full) else os.remove(full)
for rel, text in files.items():
    path = os.path.join(OUT, rel)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)
os.makedirs(os.path.join(OUT, "Tia"), exist_ok=True)
shutil.copyfile(os.path.join(ROOT, "demo", "learned-rules.template.md"), os.path.join(OUT, "Tia", "Learned rules.md"))
shutil.copyfile(os.path.join(ROOT, "demo", "activity-log.template.md"), os.path.join(OUT, "Tia", "Activity log.md"))
# Obsidian graph colours by folder (makes the graph view readable)
os.makedirs(os.path.join(OUT, ".obsidian"), exist_ok=True)
groups = [("path:Clients", 0xB9A3F2), ("path:Projects", 0x4CC38A), ("path:Meetings", 0x7EA8F8), ("path:Daily", 0x5C5A66), ("path:Leads", 0xE3A653),
          ("path:Knowledge", 0xE879A6), ("path:Suppliers OR path:Partners OR path:People", 0xC9A2F5), ("path:Team", 0xFFFFFF), ("path:Decisions", 0xF2C94C), ("path:MOCs", 0xFF7A59)]
with open(os.path.join(OUT, ".obsidian", "graph.json"), "w", encoding="utf-8") as f:
    json.dump({"colorGroups": [{"query": q, "color": {"a": 1, "rgb": c}} for q, c in groups], "showOrphans": False, "linkDistance": 180, "repelStrength": 12}, f, indent=2)

words = sum(len(t.split()) for t in files.values())
links = sum(t.count("[[") for t in files.values())
print(f"wrote {len(files) + 2} notes, {words} words, {links} links → {OUT}")
print(f"clients {len(clients)} · projects {len(projects)} · meetings {len(meetings)} · leads {len(leads)}")
