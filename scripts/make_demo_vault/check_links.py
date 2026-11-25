"""Checks demo/Business vault TIA for broken [[wikilinks]] and prints size stats. Exit code 1 if any link is broken."""
import collections
import os
import re
import sys

VAULT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "demo", "Business vault TIA"))
notes = {}
for root, dirs, files in os.walk(VAULT):
    dirs[:] = [d for d in dirs if not d.startswith(".")]
    for f in files:
        if f.endswith(".md"):
            rel = os.path.relpath(os.path.join(root, f), VAULT).replace(os.sep, "/")[:-3]
            notes[rel] = open(os.path.join(root, f), encoding="utf-8").read()
names = set(notes) | {n.split("/")[-1] for n in notes}
bad = collections.Counter()
links = 0
for rel, text in notes.items():
    for target in re.findall(r"\[\[([^\]|#]+)", text):
        links += 1
        if target.strip() not in names:
            bad[(target.strip(), rel.split("/")[0])] += 1
words = sum(len(t.split()) for t in notes.values())
print(f"{len(notes)} notes · {words} words · {links} links · {sum(bad.values())} broken")
for (t, where), n in bad.most_common(40):
    print(f"  broken: [[{t}]] ×{n} (in {where}/)")
sys.exit(1 if bad else 0)
