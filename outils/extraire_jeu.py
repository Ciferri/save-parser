#!/usr/bin/env python3
"""Lit les fichiers de Valheim installé et en extrait les données brutes utiles au site (en lecture seule).

    pip install UnityPy TypeTreeGeneratorAPI
    python outils/extraire_jeu.py "D:/SteamLibrary/steamapps/common/Valheim" extraction/

Écrit dans le dossier de sortie :
    loc.json      jeton de traduction -> [anglais, français]
    db_raw.json   composants utiles (objets, recettes, pièces, butins, succès...), table des références externes
                  et noms des GameObject, pour relier les objets entre bundles

Les scripts du jeu ne sont pas inclus dans les fichiers de données sous une forme lisible : la structure de chaque
composant est reconstruite à partir des DLL du jeu (TypeTreeGenerator).
"""
import collections, csv, io, json, os, sys, time

import UnityPy
from UnityPy.helpers.TypeTreeGenerator import TypeTreeGenerator

CLASSES = {"ItemDrop", "Recipe", "Piece", "PieceTable", "CraftingStation", "StationExtension", "CharacterDrop",
           "Humanoid", "Character", "Achievement", "Achievements", "ObjectDB", "CookingStation", "Smelter", "Fermenter"}
LANGUES_IGNOREES = {"localization_xbox", "localization_ps", "localization_switch", "localization_platformspecific",
                    "localization_captions"}


def fichiers(donnees):
    bundles = os.path.join(donnees, "StreamingAssets", "SoftRef", "Bundles")
    out = [os.path.join(bundles, f) for f in sorted(os.listdir(bundles)) if not f.endswith(".manifest")]
    return out + [os.path.join(donnees, f) for f in ("globalgamemanagers.assets", "resources.assets", "sharedassets0.assets", "level0")]


def traductions(donnees):
    env = UnityPy.load(os.path.join(donnees, "resources.assets"))
    loc = {}
    for o in env.objects:
        if o.type.name != "TextAsset": continue
        d = o.read()
        if not d.m_Name.startswith("localization") or d.m_Name in LANGUES_IGNOREES: continue
        texte = d.m_Script if isinstance(d.m_Script, str) else d.m_Script.encode("utf-8", "surrogateescape").decode("utf-8", "replace")
        lignes = list(csv.reader(io.StringIO(texte)))
        entete = lignes[0]
        if "French" not in entete: continue
        i_fr, i_en = entete.index("French"), entete.index("English")
        for l in lignes[1:]:
            if len(l) > i_fr and l[0]: loc[l[0]] = [l[i_en], l[i_fr]]
    return loc


def index_scripts(liste):
    """(fichier, path_id) de chaque MonoScript -> [assembly, espace de noms, classe]"""
    scripts = {}
    for p in liste:
        try: env = UnityPy.load(p)
        except Exception: continue
        for o in env.objects:
            if o.type.name == "MonoScript":
                d = o.read()
                scripts[f"{o.assets_file.name.lower()}|{o.path_id}"] = [d.m_AssemblyName, d.m_Namespace, d.m_ClassName]
    return scripts


def nettoyer(x):
    if isinstance(x, dict): return {k: nettoyer(v) for k, v in x.items()}
    if isinstance(x, list): return [nettoyer(v) for v in x]
    if isinstance(x, (bytes, bytearray)): return None
    return x


def composants(liste, scripts, generateur):
    noeuds = {}
    def structure(asm, ns, cls):
        k = (asm, ns, cls)
        if k not in noeuds:
            noeuds[k] = generateur.get_nodes_up(asm if asm.endswith(".dll") else asm + ".dll", f"{ns}.{cls}" if ns else cls)
        return noeuds[k]
    objs, ext, gos, erreurs = [], {}, {}, collections.Counter()
    for p in liste:
        try: env = UnityPy.load(p)
        except Exception: continue
        for o in env.objects:
            sf = o.assets_file; cab = sf.name.lower()
            if cab not in ext: ext[cab] = [e.path.split("/")[-1].lower() for e in sf.externals]
            if o.type.name == "GameObject":
                try: gos[f"{cab}|{o.path_id}"] = o.read().m_Name
                except Exception: pass
                continue
            if o.type.name != "MonoBehaviour": continue
            try:
                mb = o.read(); sp = mb.m_Script
                fichier = cab if sp.m_FileID == 0 else ext[cab][sp.m_FileID - 1]
                sc = scripts.get(f"{fichier}|{sp.m_PathID}")
                if not sc or sc[2] not in CLASSES: continue
                try: d = o.read_typetree(structure(*sc))
                except Exception: d = o.read_typetree(structure(*sc), check_read=False)
                objs.append({"cls": sc[2], "cab": cab, "pid": o.path_id, "go": mb.m_GameObject.m_PathID, "d": nettoyer(d)})
            except Exception as e:
                erreurs[type(e).__name__] += 1
    return {"objs": objs, "ext": ext, "gos": gos}, erreurs


def main():
    if len(sys.argv) != 3: sys.exit(__doc__)
    jeu, sortie = sys.argv[1], sys.argv[2]
    donnees = os.path.join(jeu, "valheim_Data")
    os.makedirs(sortie, exist_ok=True)
    t = time.time()
    loc = traductions(donnees)
    json.dump(loc, open(os.path.join(sortie, "loc.json"), "w", encoding="utf8"), ensure_ascii=False)
    print(f"{len(loc)} traductions")
    liste = fichiers(donnees)
    scripts = index_scripts(liste)
    print(f"{len(scripts)} scripts indexés")
    unity = UnityPy.load(liste[-1]).objects[0].assets_file.unity_version
    gen = TypeTreeGenerator(unity); gen.load_local_game(jeu)
    db, erreurs = composants(liste, scripts, gen)
    json.dump(db, open(os.path.join(sortie, "db_raw.json"), "w", encoding="utf8"), ensure_ascii=False, default=str)
    print(f"{len(db['objs'])} composants lus en {round(time.time() - t)} s", dict(erreurs) or "")


if __name__ == "__main__":
    main()
