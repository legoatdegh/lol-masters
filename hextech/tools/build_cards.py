#!/usr/bin/env python3
"""Génère cards.json pour Hextech Masters.
Scène pro : API MediaWiki de Liquipedia. Jeu : Riot Data Dragon.

Installation :  pip install requests mwparserfromhell
Au premier lancement, le script demande ton contact (Liquipedia l'exige) et le retient.
Usage :         python tools/build_cards.py   (depuis la racine du projet)
Tout est mis en cache dans ./cache : relancer ne refait pas les requêtes.
Premier lancement : compte 10 à 30 minutes (limite Liquipedia : 1 requête / 2 s).
"""
import json, math, time, zlib
from pathlib import Path
from urllib.parse import quote
import requests, mwparserfromhell as mw

ROOT = Path(__file__).resolve().parent.parent  # racine du projet
CONTACT = "TON_EMAIL_OU_DISCORD"  # tu peux le laisser : le script te le demandera une fois
if "TON_EMAIL" in CONTACT:
    _cf = ROOT / "contact.txt"
    CONTACT = _cf.read_text("utf-8").strip() if _cf.exists() else input("Ton e-mail ou pseudo Discord (demandé par Liquipedia) : ").strip()
    _cf.write_text(CONTACT, "utf-8")
LIQ = "https://liquipedia.net/leagueoflegends/api.php"
DD = "https://ddragon.leagueoflegends.com"
LANG = "fr_FR"
# (type de carte, modèle d'infobox). À ajuster si Liquipedia change ses noms.
SOURCES = [("Joueur", "Infobox player"), ("Équipe", "Infobox team"), ("Tournoi", "Infobox league")]
RG = {"C": (1000, 3500), "PC": (2500, 5000), "R": (4000, 7000), "UR": (6000, 9000), "L": (8000, 9999)}

CACHE = ROOT / "cache"; CACHE.mkdir(exist_ok=True)
S = requests.Session(); S.headers["User-Agent"] = f"HextechMastersPerso/0.1 ({CONTACT})"
_last = 0.0

def liq(**p):
    """Appel MediaWiki : pause de 3 s entre requêtes (règle Liquipedia) et nouvel essai si la connexion est coupée."""
    global _last
    for attempt in range(6):
        time.sleep(max(0, 3 - (time.time() - _last)))
        try:
            r = S.get(LIQ, params={**p, "format": "json", "formatversion": 2}, timeout=60)
            _last = time.time()
            if r.status_code in (429, 500, 502, 503, 504):
                ra = r.headers.get("Retry-After", "30")
                time.sleep(int(ra) if ra.isdigit() else 30); continue
            r.raise_for_status()
            return r.json()
        except (requests.ConnectionError, requests.Timeout):
            _last = time.time(); wait = 30 * (attempt + 1)
            print(f"  connexion coupée, nouvel essai dans {wait} s...", flush=True); time.sleep(wait)
    raise SystemExit("Liquipedia ne répond pas. Relance le script plus tard : il reprendra où il en était.")

def cached(name, fn):
    f = CACHE / name
    if f.exists(): return json.loads(f.read_text("utf-8"))
    data = fn(); f.write_text(json.dumps(data, ensure_ascii=False), "utf-8")
    return data

def pages_using(template):
    out, cont = [], {}
    while True:
        d = liq(action="query", list="embeddedin", eititle="Template:" + template,
                einamespace=0, eilimit=500, **cont)
        out += [p["title"] for p in d["query"]["embeddedin"]]
        print(f"  {len(out)} pages", flush=True)
        if "continue" not in d: return out
        cont = d["continue"]

def wikitext(titles):
    res = {}
    for i in range(0, len(titles), 50):  # 50 pages par requête
        d = liq(action="query", prop="revisions", rvprop="content", rvslots="main",
                titles="|".join(titles[i:i + 50]))
        for p in d["query"]["pages"]:
            if p.get("revisions"): res[p["title"]] = p["revisions"][0]["slots"]["main"]["content"]
        print(f"  {min(i + 50, len(titles))}/{len(titles)}", flush=True)
    return res

def infobox(text, name):
    for t in mw.parse(text).filter_templates():
        if t.name.strip().lower() == name.lower():
            return {str(p.name).strip(): p.value.strip_code().strip() for p in t.params}
    return {}

def thumbs(files):
    f = CACHE / "thumbs_partial.json"  # sauvegardé après chaque lot : une coupure ne fait rien perdre
    st = json.loads(f.read_text("utf-8")) if f.exists() else {"i": 0, "urls": {}}
    for i in range(st["i"], len(files), 50):
        d = liq(action="query", prop="imageinfo", iiprop="url", iiurlwidth=300,
                titles="|".join("File:" + x for x in files[i:i + 50]))
        for p in d["query"]["pages"]:
            ii = p.get("imageinfo")
            if ii: st["urls"][p["title"][5:].replace("_", " ")] = ii[0].get("thumburl") or ii[0]["url"]
        st["i"] = i + 50; f.write_text(json.dumps(st, ensure_ascii=False), "utf-8")
        print(f"  images {min(i + 50, len(files))}/{len(files)}", flush=True)
    return st["urls"]

def liquipedia():
    cards = []
    for typ, tpl in SOURCES:
        print(f"[Liquipedia] {typ}")
        titles = cached(f"titles_{typ}.json", lambda: pages_using(tpl))
        texts = cached(f"text_{typ}.json", lambda: wikitext(titles))
        for title, text in texts.items():
            ib = infobox(text, tpl)
            if not ib: continue
            t, score = typ, len(text) / 1000 + 3 * text.count("World Championship")
            if typ == "Joueur":
                name = ib.get("id") or title
                role = ib.get("role") or ""
                if "coach" in (role + ib.get("role2", "")).lower(): t = "Coach"
                sub = " · ".join(x for x in [role, ib.get("status"), ib.get("country")] if x) or t
            elif typ == "Équipe":
                name = ib.get("name") or title
                sub = ib.get("location") or ib.get("region") or "Équipe"
            else:
                name = ib.get("name") or title
                tier = "".join(c for c in ib.get("liquipediatier", "") if c.isdigit()) or "9"
                score += 100 / max(int(tier), 1)
                sub = " · ".join(x for x in [ib.get("sdate", "")[:4], ib.get("country")] if x) or "Tournoi"
            cards.append({"id": f"lp:{title}", "t": t, "n": name, "s": sub, "score": score,
                          "file": ib.get("image", "").replace("_", " "),
                          "src": "https://liquipedia.net/leagueoflegends/" +
                                 quote(title.replace(" ", "_"), safe="_()'!,-")})
    files = sorted({c["file"] for c in cards if c["file"]})
    tf, pf = CACHE / "thumbs.json", CACHE / "thumbs_partial.json"
    if tf.exists(): urls = json.loads(tf.read_text("utf-8"))
    else:
        try:
            urls = thumbs(files); tf.write_text(json.dumps(urls, ensure_ascii=False), "utf-8")
        except SystemExit:  # Liquipedia ne répond plus : on continue avec les images déjà récupérées
            print("Images incomplètes : relance le script plus tard pour compléter.")
            urls = json.loads(pf.read_text("utf-8"))["urls"] if pf.exists() else {}
    for c in cards: c["img"] = urls.get(c.pop("file"), "")
    return cards

def get(url, name):
    return cached(name, lambda: S.get(url, timeout=60).json())

def ddragon():
    print("[Data Dragon] champions, sorts, passifs, skins")
    ver = S.get(f"{DD}/api/versions.json", timeout=60).json()[0]
    base = f"{DD}/cdn/{ver}"
    champs = get(f"{base}/data/{LANG}/champion.json", f"dd_{ver}_list.json")["data"]
    cards = []
    for cid, c in champs.items():
        full = get(f"{base}/data/{LANG}/champion/{cid}.json", f"dd_{ver}_{cid}.json")["data"][cid]
        src = f"https://wiki.leagueoflegends.com/en-us/Special:Search?search={cid}"
        i = c["info"]
        cards.append({"id": f"dd:{cid}", "t": "Champion", "n": c["name"], "s": c["title"], "r": "UR",
                      "atk": 6000 + (i["attack"] + i["magic"]) * 150, "def": 6000 + i["defense"] * 300,
                      "img": f"{base}/img/champion/{c['image']['full']}", "src": src})
        p = full["passive"]
        cards.append({"id": f"dd:{cid}:P", "t": "Passif", "n": f"{c['name']} — {p['name']}",
                      "s": "Passif", "r": "C", "img": f"{base}/img/passive/{p['image']['full']}", "src": src})
        for k, sp in zip("QWER", full["spells"]):
            cards.append({"id": f"dd:{cid}:{k}", "t": "Sort", "n": f"{c['name']} — {sp['name']}",
                          "s": f"Sort {k}", "r": "R" if k == "R" else "PC",
                          "img": f"{base}/img/spell/{sp['image']['full']}", "src": src})
        for sk in full["skins"]:
            if sk["num"] == 0: continue  # skin de base = le champion lui-même
            cards.append({"id": f"dd:{cid}:S{sk['num']}", "t": "Skin", "n": sk["name"], "s": f"Skin · {c['name']}",
                          "r": "R" if sk.get("chromas") else "PC",  # Data Dragon ne donne pas la rareté : approximation
                          "img": f"{DD}/cdn/img/champion/loading/{cid}_{sk['num']}.jpg", "src": src})
    return cards

def assign(cards):
    """Rareté par percentile du score (par type) pour la scène pro ; stats ATK/DEF stables."""
    for t in {c["t"] for c in cards if "score" in c}:
        grp = sorted((c for c in cards if c["t"] == t and "score" in c), key=lambda c: -c["score"])
        for i, c in enumerate(grp):
            q = i / len(grp)
            c["r"] = "L" if q < .01 else "UR" if q < .05 else "R" if q < .2 else "PC" if q < .5 else "C"
    for c in cards:
        c.pop("score", None)
        lo, hi = RG[c["r"]]; h = zlib.crc32(c["id"].encode())
        c.setdefault("atk", lo + h % (hi - lo)); c.setdefault("def", lo + (h >> 8) % (hi - lo))

if __name__ == "__main__":
    cards = liquipedia() + ddragon()
    assign(cards)
    out = ROOT / "data" / "cards.json"; out.parent.mkdir(exist_ok=True)
    out.write_text(json.dumps(cards, ensure_ascii=False), "utf-8")
    print(f"data/cards.json : {len(cards)} cartes")
