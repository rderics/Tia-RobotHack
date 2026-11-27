# -*- coding: utf-8 -*-
"""Tia's Outlook connector (Windows, classic Outlook through COM).

The owner keeps using NEW Outlook as their app; new Outlook has no automation interface, so this starts
classic Outlook hidden in the background (same approach as Akito's outlook_backend.py in the owner's vault):
the registry switch UseNewOutlook is set to 0 only for the moment of starting, then put back.
Both read the same server mailbox, so a draft saved here appears in new Outlook seconds later.

Commands (output is one JSON object on stdout):
  list  [--hours 48] [--limit 12] [--stores "a,b"]   newest inbox mail
  draft --entry ID --store STORE_ID --text "..." [--show] [--type-ms 18]   reply DRAFT (never sends)
  compose --to A --subject S --text T [--attach F]... [--show] [--type-ms 18] [--no-save] [--on-behalf X]
        a new message: shown as a real Outlook window with the text typed in word by word (the audience sees
        Tia write), saved to Drafts unless --no-save. --on-behalf shows the business address in From (stand).
Nothing here sends, deletes or moves mail, and nothing in a message is ever executed or followed.
"""
import argparse
import json
import re
import sys
import time
import winreg
from datetime import datetime, timedelta

KEY = r"Software\Microsoft\Office\16.0\Outlook\Preferences"
NAME = "UseNewOutlook"
BOUNCE = re.compile(r"(mailer-daemon|postmaster|mail delivery subsystem|undeliverable|delivery status notification|delivery has failed)", re.I)
AUTO = re.compile(r"^(automatic reply|automātiskā atbilde|auto[- ]?reply|out of office)", re.I)
QUOTE_CUT = re.compile(r"(\nFrom: |\nSent: |\nNo: |\nOn .{5,80} wrote:|-----Original Message|________________________________)")
BANNER = re.compile(r"INFORMĀCIJAI: E-pasta vēstules sūtītājs ir ārējs adresāts.*?content of the e-mail\.\s*", re.S)


def get_switch():
    try:
        return winreg.QueryValueEx(winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY), NAME)[0]
    except FileNotFoundError:
        return None


def set_switch(v):
    winreg.SetValueEx(winreg.OpenKey(winreg.HKEY_CURRENT_USER, KEY, 0, winreg.KEY_SET_VALUE), NAME, 0, winreg.REG_DWORD, int(v))


def outlook(wait=90):
    import win32com.client as w
    try:
        return w.GetActiveObject("Outlook.Application")
    except Exception:
        pass
    before = get_switch()
    try:
        if before not in (None, 0):
            set_switch(0)
        app = w.Dispatch("Outlook.Application")  # starts classic Outlook hidden
        t = time.time()
        while time.time() - t < wait:
            try:
                if app.GetNamespace("MAPI").Stores.Count:
                    break
            except Exception:
                pass
            time.sleep(2)
        return app
    finally:
        if before not in (None, 0):
            set_switch(before)  # the owner's own Outlook choice is never changed


def clean_body(text, limit=1500):
    t = BANNER.sub("", text or "")
    cut = QUOTE_CUT.search(t)
    if cut:
        t = t[: cut.start()]
    return re.sub(r"[ \t]+", " ", re.sub(r"\n{3,}", "\n\n", t)).strip()[:limit]


def sender_address(m):
    try:
        if m.SenderEmailType == "EX":
            ex = m.Sender.GetExchangeUser()
            if ex:
                return ex.PrimarySmtpAddress
    except Exception:
        pass
    return getattr(m, "SenderEmailAddress", "") or ""


def cmd_list(a):
    ns = outlook().GetNamespace("MAPI")
    wanted = [s.strip().lower() for s in (a.stores or "").split(",") if s.strip()]
    since = datetime.now() - timedelta(hours=a.hours)
    out = []
    for store in ns.Stores:
        name = store.DisplayName
        if wanted and name.lower() not in wanted:
            continue
        try:
            items = store.GetDefaultFolder(6).Items  # 6 = Inbox
            items.Sort("[ReceivedTime]", True)
        except Exception:
            continue
        for m in items:
            try:
                if m.Class != 43:  # mail items only
                    continue
                received = m.ReceivedTime
                if received.replace(tzinfo=None) < since or len(out) >= a.limit * 4:
                    break
                subject = (m.Subject or "").strip()
                sender = m.SenderName or ""
                if BOUNCE.search(sender) or BOUNCE.search(subject) or AUTO.search(subject):
                    continue
                out.append({
                    "entryId": m.EntryID,
                    "storeId": store.StoreID,
                    "mailbox": name,
                    "channel": "email",
                    "received": received.strftime("%Y-%m-%d %H:%M"),
                    "time": received.strftime("%H:%M") if received.date() == datetime.now().date() else received.strftime("%d.%m %H:%M"),
                    "from": sender,
                    "address": sender_address(m),
                    "subject": subject,
                    "unread": bool(m.UnRead),
                    "text": clean_body(m.Body),
                })
            except Exception:
                continue
    out.sort(key=lambda x: x["received"], reverse=True)
    print(json.dumps({"messages": out[: a.limit], "mailboxes": [s.DisplayName for s in ns.Stores]}, ensure_ascii=False))


def bring_to_front(caption, topmost_seconds=0):
    """Windows won't let a background program take focus, so: find the window by its title, make it 'always on
    top' for a moment (works without focus) and nudge focus with an Alt key tap (the usual workaround)."""
    try:
        import win32api
        import win32con
        import win32gui
        found = []
        win32gui.EnumWindows(lambda h, _: found.append(h) if win32gui.IsWindowVisible(h) and caption and caption.split(" - ")[0] in win32gui.GetWindowText(h) else None, None)
        for hwnd in found[:1]:
            win32gui.ShowWindow(hwnd, win32con.SW_RESTORE)
            flags = win32con.SWP_NOMOVE | win32con.SWP_NOSIZE
            win32gui.SetWindowPos(hwnd, win32con.HWND_TOPMOST, 0, 0, 0, 0, flags)
            win32api.keybd_event(win32con.VK_MENU, 0, 0, 0)
            win32api.keybd_event(win32con.VK_MENU, 0, win32con.KEYEVENTF_KEYUP, 0)
            try:
                win32gui.SetForegroundWindow(hwnd)
            except Exception:
                pass
            if not topmost_seconds:
                win32gui.SetWindowPos(hwnd, win32con.HWND_NOTOPMOST, 0, 0, 0, 0, flags)
            return hwnd
    except Exception:
        return None


def type_into(item, text, ms):
    """Shows the message window and types the text into it, word by word (real Outlook, visible)."""
    item.Display(False)
    insp = item.GetInspector
    try:
        insp.Activate()
    except Exception:
        pass
    bring_to_front(insp.Caption)
    sel = insp.WordEditor.Application.Selection
    sel.HomeKey(6)  # start of the message, above any signature or quoted mail
    for i, para in enumerate(text.split("\n")):
        if i:
            sel.TypeParagraph()
        for word in re.findall(r"\S+\s*", para):
            sel.TypeText(word)
            if ms:
                time.sleep(ms / 1000 * max(1, len(word) / 4))
    sel.TypeParagraph()


def cmd_compose(a):
    app = outlook()
    mail = None
    if a.account:  # write from this mailbox (not Outlook's default account): its own Drafts + its account
        ns = app.GetNamespace("MAPI")
        want = a.account.lower()
        store = next((st for st in ns.Stores if want in (st.DisplayName or "").lower()), None)
        if store is not None:
            try:
                mail = store.GetDefaultFolder(16).Items.Add(0)  # 16 = Drafts of that mailbox
            except Exception:
                mail = None
        acc = next((ac for ac in app.Session.Accounts if want in ((ac.SmtpAddress or "") + " " + (ac.DisplayName or "")).lower()), None)
        if mail is None:
            mail = app.CreateItem(0)
        if acc is not None:
            mail._oleobj_.Invoke(*(64209, 0, 8, 0, acc))  # SendUsingAccount (pywin32 needs the raw call)
    if mail is None:
        mail = app.CreateItem(0)
    mail.To = a.to
    mail.Subject = a.subject
    if a.on_behalf:
        mail.SentOnBehalfOfName = a.on_behalf
    for f in a.attach or []:
        mail.Attachments.Add(f)
    text = a.text.replace("\r\n", "\n").strip()
    if a.show:
        type_into(mail, text, a.type_ms)
    else:
        mail.Body = text
    if not a.no_save:
        mail.Save()  # Drafts – a human presses Send
    print(json.dumps({"ok": True, "subject": mail.Subject, "shown": bool(a.show), "saved": not a.no_save}, ensure_ascii=False))


def cmd_draft(a):
    ns = outlook().GetNamespace("MAPI")
    m = ns.GetItemFromID(a.entry, a.store)
    reply = m.Reply()
    text = a.text.replace("\r\n", "\n").strip()
    if a.show:  # visible: the reply window opens and the text is typed in above the quoted mail
        type_into(reply, text, a.type_ms)
    elif reply.BodyFormat == 2:  # HTML: put the text above the quoted mail, keep Outlook's formatting
        html = "<div style='font-family:Calibri,Arial,sans-serif;font-size:11pt'>" + "".join(
            f"<p>{line or '&nbsp;'}</p>" for line in (l.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;") for l in text.split("\n"))
        ) + "</div>"
        reply.HTMLBody = re.sub(r"(<body[^>]*>)", r"\1" + html.replace("\\", "\\\\"), reply.HTMLBody, count=1, flags=re.I)
    else:
        reply.Body = text + "\n\n" + (reply.Body or "")
    reply.Save()  # lands in Drafts – the owner reviews and presses Send
    print(json.dumps({"ok": True, "subject": reply.Subject}, ensure_ascii=False))


def main():
    sys.stdout.reconfigure(encoding="utf-8")
    p = argparse.ArgumentParser()
    sub = p.add_subparsers(dest="cmd", required=True)
    l = sub.add_parser("list")
    l.add_argument("--hours", type=float, default=48)
    l.add_argument("--limit", type=int, default=12)
    l.add_argument("--stores", default="")
    d = sub.add_parser("draft")
    d.add_argument("--entry", required=True)
    d.add_argument("--store", required=True)
    d.add_argument("--text", required=True)
    d.add_argument("--show", action="store_true")
    d.add_argument("--type-ms", type=int, default=18)
    c = sub.add_parser("compose")
    c.add_argument("--to", required=True)
    c.add_argument("--subject", default="")
    c.add_argument("--text", required=True)
    c.add_argument("--attach", action="append")
    c.add_argument("--show", action="store_true")
    c.add_argument("--type-ms", type=int, default=18)
    c.add_argument("--no-save", action="store_true")
    c.add_argument("--on-behalf", default="")
    c.add_argument("--account", default="")
    a = p.parse_args()
    try:
        {"list": cmd_list, "draft": cmd_draft, "compose": cmd_compose}[a.cmd](a)
    except Exception as e:
        print(json.dumps({"error": str(e)}, ensure_ascii=False))
        sys.exit(1)


if __name__ == "__main__":
    main()
