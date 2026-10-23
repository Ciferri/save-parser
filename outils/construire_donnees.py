#!/usr/bin/env python3
"""Construit js/jeu.js à partir de l'extraction brute faite par outils/extraire_jeu.py.

    python outils/construire_donnees.py extraction/ js/jeu.js

Les listes des succès sont reconstruites avec les mêmes règles que le jeu : recettes actives, types d'objets,
table du marteau, et listes d'exclusion du composant Achievements.
"""
import json, collections, math, sys, os

if len(sys.argv) != 3: sys.exit(__doc__)
ENTREE, SORTIE = sys.argv[1], sys.argv[2]
db = json.load(open(os.path.join(ENTREE, "db_raw.json"), encoding="utf8")); EXT = db["ext"]; GOS = db["gos"]
loc = json.load(open(os.path.join(ENTREE, "loc.json"), encoding="utf8"))
comp = {}; on_go = collections.defaultdict(list); by = collections.defaultdict(list)
for o in db["objs"]:
    comp[f'{o["cab"]}|{o["pid"]}'] = o; on_go[f'{o["cab"]}|{o["go"]}'].append(o); by[o["cls"]].append(o)

def cle(cab, p):
    if not p or not p.get("m_PathID"): return None
    f = p["m_FileID"]
    if f == 0: return f'{cab}|{p["m_PathID"]}'
    return f'{EXT[cab][f-1]}|{p["m_PathID"]}' if f - 1 < len(EXT[cab]) else None
def sur_go(k, cls): return next((c for c in on_go.get(k, []) if c["cls"] == cls), None)
def designe(cab, p, cls):
    k = cle(cab, p)
    if not k: return None
    c = comp.get(k)
    return c if c and c["cls"] == cls else sur_go(k, cls)
def nom_go(o): return GOS.get(f'{o["cab"]}|{o["go"]}')
def sh(it): return it["d"]["m_itemData"]["m_shared"]
def traduit(tok):
    if tok and " " in tok.strip():
        # nom composé de plusieurs jetons (ex. les idoles) : chacun est traduit, puis on les assemble
        morceaux = [traduit(t) if t.startswith("$") else t for t in tok.split()]
        return " ".join(m for m in morceaux if m) if all(m is not None for m in morceaux) else None
    v = loc.get((tok or "").lstrip("$"))
    return (v[1] or v[0]) if v else None

# ---------- base d'objets du jeu ----------
odb = by["ObjectDB"][0]
objets = {}                                  # prefab -> composant ItemDrop
for p in odb["d"]["m_items"]:
    k = cle(odb["cab"], p); it = sur_go(k, "ItemDrop")
    if it and GOS.get(k): objets.setdefault(GOS[k], it)
def objet(cab, p):
    it = designe(cab, p, "ItemDrop")
    return (nom_go(it), it) if it else (None, None)

recettes = []
for p in odb["d"]["m_recipes"]:
    r = comp.get(cle(odb["cab"], p))
    if not r: continue
    pref, it = objet(r["cab"], r["d"]["m_item"])
    st = designe(r["cab"], r["d"]["m_craftingStation"], "CraftingStation")
    res = []
    for x in r["d"]["m_resources"]:
        rp, rit = objet(r["cab"], x["m_resItem"])
        if rp: res.append(dict(p=rp, n=x["m_amount"], niv=x["m_amountPerLevel"], idole=bool(x["m_upgraderResource"]), rend=bool(x["m_recover"])))
    recettes.append(dict(prefab=pref, it=it, station=st, actif=bool(r["d"]["m_enabled"]), min=r["d"]["m_minStationLevel"], res=res, nom=r["d"]["m_Name"]))

ach = by["Achievements"][0]
def prefabs(champ): return {GOS.get(cle(ach["cab"], p)) for p in ach["d"][champ]}
EXCLUS = {sh(objets[p])["m_name"] for p in prefabs("m_itemsExcluded") if p in objets}
EXCLUS_CONSO = {sh(objets[p])["m_name"] for p in prefabs("m_consumablesExcluded") if p in objets}

# ---------- listes des succès (mêmes règles que le jeu) ----------
tok = lambda r: sh(r["it"])["m_name"]
actives = [r for r in recettes if r["actif"] and r["it"]]
fabriques = {tok(r) for r in actives if r["station"]} - EXCLUS
armes = {tok(r) for r in actives if sh(r["it"])["m_itemType"] in (3, 4, 14, 15, 22)} - EXCLUS
cuisson_in, cuisson_out = set(), set()
for cs in by["CookingStation"]:
    if cs["d"]["m_name"] not in ("$piece_cookingstation", "$piece_cookingstation_iron", "$piece_oven"): continue
    for cv in cs["d"]["m_conversion"]:
        a = objet(cs["cab"], cv["m_from"])[1]; b = objet(cs["cab"], cv["m_to"])[1]
        if a: cuisson_in.add(sh(a)["m_name"])
        if b: cuisson_out.add(sh(b)["m_name"])
cuisines = ({tok(r) for r in actives if r["station"] and r["station"]["d"]["m_name"] in ("$piece_cauldron", "$piece_preptable", "$piece_meadcauldron")
             and (sh(r["it"])["m_itemType"] == 2 or tok(r) in cuisson_in)} | cuisson_out) - EXCLUS
manges = {sh(it)["m_name"] for p, it in objets.items() if sh(it)["m_itemType"] == 2
          and (sh(it)["m_food"] > 0 or sh(it)["m_foodStamina"] > 0 or sh(it)["m_foodEitr"] > 0)} - EXCLUS_CONSO
trophees = {sh(it)["m_name"] for p, it in objets.items() if sh(it)["m_itemType"] == 13} - EXCLUS
pt = next(o for o in by["PieceTable"] if nom_go(o) == "_HammerPieceTable")
construits = set()
for p in pt["d"]["m_pieces"]:
    c = sur_go(cle(pt["cab"], p), "Piece")
    if c and not c["d"].get("m_repairPiece"): construits.add(c["d"]["m_name"])
def perso(k): return sur_go(k, "Humanoid") or sur_go(k, "Character")
achs = {o["d"]["m_id"]: o["d"] for o in by["Achievement"]}
boss = [t["m_stat"] for t in achs["AllBosses"]["m_enemyStatsTriggers"]]
miniboss = [t["m_stat"] for t in achs["AllMiniBosses"]["m_enemyStatsTriggers"]]
creatures = set()
for p in ach["d"]["m_charactersIncluded"]:
    c = perso(cle(ach["cab"], p))
    if c and c["d"].get("m_killedForAchievements") != 2: creatures.add(c["d"]["m_name"])
creatures -= set(boss)

# station de fabrication de chaque objet (pour l'affichage)
station_de = {}
for r in actives:
    if r["station"]: station_de.setdefault(tok(r), r["station"]["d"]["m_name"])
for cs in by["CookingStation"]:
    for cv in cs["d"]["m_conversion"]:
        b = objet(cs["cab"], cv["m_to"])[1]
        if b: station_de.setdefault(sh(b)["m_name"], cs["d"]["m_name"])
piece_station = {}
for p in pt["d"]["m_pieces"]:
    c = sur_go(cle(pt["cab"], p), "Piece")
    if c:
        st = designe(c["cab"], c["d"].get("m_craftingStation"), "CraftingStation")
        if st: piece_station[c["d"]["m_name"]] = st["d"]["m_name"]

# ---------- coût d'amélioration ----------
# niveau maximal d'une station : 1 + une extension de chaque sorte
ext_sortes = collections.defaultdict(set)
for e in by["StationExtension"]:
    st = designe(e["cab"], e["d"]["m_craftingStation"], "CraftingStation")
    pc = sur_go(f'{e["cab"]}|{e["go"]}', "Piece")
    if st and pc and pc["d"]["m_name"] in construits: ext_sortes[st["d"]["m_name"]].add(pc["d"]["m_name"])
niveau_max = {s: 1 + len(k) for s, k in ext_sortes.items()}

# moulages de la Fonderie de givre : moule -> objet, avec son carburant
fonderie = {}
for cs in by["CookingStation"]:
    if cs["d"]["m_name"] != "$piece_frostfoundry": continue
    carb = objet(cs["cab"], cs["d"].get("m_fuelItem"))[0]
    for cv in cs["d"]["m_conversion"]:
        a = objet(cs["cab"], cv["m_from"])[0]; b = objet(cs["cab"], cv["m_to"])[0]
        if a and b: fonderie[b] = dict(moule=a, carburant=carb, parMoule=math.ceil(cv["m_cookTime"] / cs["d"]["m_secPerFuel"]))
fuel_par = {}
for cs in by["CookingStation"]:
    if cs["d"]["m_name"] == "$piece_frostfoundry":
        fuel_par = {k: v for k, v in cs["d"].items() if "fuel" in k.lower() and not isinstance(v, dict)}
recette_de = {}
for r in actives: recette_de.setdefault(r["prefab"], r)

ameliorables = {}
avec_idole = {}
for r in sorted((r for r in recettes if r["it"] and any(x["idole"] for x in r["res"])), key=lambda r: not r["actif"]):
    avec_idole.setdefault(r["prefab"], r)
for p, r in avec_idole.items():
    s = sh(r["it"])
    st = r["station"]["d"]["m_name"] if r["station"] else None
    nm = niveau_max.get(st, 1)
    ameliorables[p] = dict(nom=traduit(s["m_name"]) or p, jeton=s["m_name"], qmax=s["m_maxQuality"],
        chance=s["m_upgradeChance"], casse=s["m_breakChance"], retour=s["m_breakReturnIngreientsAmount"],
        station=traduit(st) if st else None, stMin=r["min"], stMax=nm, plafond=max(1, min(s["m_maxQuality"], nm - r["min"] + 1)),
        res=[[x["p"], x["n"], x["niv"], x["idole"], x["rend"]] for x in r["res"]], actif=r["actif"])
    if p in fonderie:
        f = fonderie[p]; rm = recette_de.get(f["moule"])
        ameliorables[p]["moulage"] = dict(moule=f["moule"], carburant=f["carburant"], parMoule=f["parMoule"], res=[[x["p"], x["n"]] for x in rm["res"]] if rm else [])

# ---------- butins ----------
CREATURES_EXCLUES = prefabs("m_charactersExcluded")
butins = {}
for cd in by["CharacterDrop"]:
    k = f'{cd["cab"]}|{cd["go"]}'; c = perso(k); g = GOS.get(k)
    if not c or not g or g in CREATURES_EXCLUES: continue
    lst = []
    for d in cd["d"]["m_drops"]:
        ip, it = objet(cd["cab"], d["m_prefab"])
        if ip: lst.append([ip, d["m_chance"], not d["m_dontScale"] and d["m_levelMultiplier"] != 0])
    if lst and g not in butins:
        butins[g] = dict(nom=traduit(c["d"]["m_name"]) or g, jeton=c["d"]["m_name"], boss=bool(c["d"]["m_boss"]), drops=lst)

# ---------- noms ----------
jetons = set().union(fabriques, armes, cuisines, manges, trophees, construits, creatures, boss, miniboss, station_de.values(), piece_station.values())
NOMS = {t: traduit(t) for t in sorted(jetons) if traduit(t)}
NOMS_PREFAB = {}
for it in by["ItemDrop"]:
    p = nom_go(it); n = traduit(sh(it)["m_name"])
    if p and n: NOMS_PREFAB.setdefault(p, n)
for b in butins.values():
    NOMS[b["jeton"]] = b["nom"]
for i in range(1, 13):
    if traduit(f"$animal_fish{i}"): NOMS[f"$animal_fish{i}"] = traduit(f"$animal_fish{i}")

# succès à paliers : une ou plusieurs statistiques à atteindre (sauf les listes de morts, affichées à part)
succes_stats = []
for d in sorted(achs.values(), key=lambda d: d["m_id"]):
    if not d["m_statTrigger"] or d["m_id"] in ("DeathByAllTypes", "DeathByTreeAll"): continue
    succes_stats.append(dict(id=d["m_id"], nom=traduit(d["m_name"]) or d["m_id"], difficulte=d["m_difficultyRequirement"],
                             seuils=[[t["m_stat"], t["m_amountAboveEquals"]] for t in d["m_statTrigger"]]))

donnees = dict(
    listes=dict(fabriques=sorted(fabriques), armes=sorted(armes), cuisines=sorted(cuisines), manges=sorted(manges),
                construits=sorted(construits), creatures=sorted(creatures), trophees=sorted(trophees), boss=boss, miniboss=miniboss),
    stations=dict(objets=station_de, pieces=piece_station), noms=NOMS, nomsPrefab=NOMS_PREFAB,
    ameliorables=ameliorables, butins=butins, succesStats=succes_stats)
print({k: len(v) for k, v in donnees["listes"].items()}, "améliorables", len(ameliorables), "butins", len(butins),
      "stations max", niveau_max, "fuel", fuel_par, file=sys.stderr)
with open(SORTIE, "w", encoding="utf8") as f:
    f.write("// Généré par outils/construire_donnees.py à partir des fichiers du jeu installé. Ne pas modifier à la main.\n")
    f.write('"use strict";\nconst JEU = ')
    json.dump(donnees, f, ensure_ascii=False, separators=(",", ":"), sort_keys=True)
    f.write(";\n")
