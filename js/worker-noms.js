// Recherche de noms de personnage en arrière-plan, pour ne pas bloquer la page.
// Message reçu : { type: "noms", prefab, qualite, cible, copies, alphabet, longueurMin, longueurMax, limite, apres }
//            ou  { type: "relais", prefab, depart, arrivee, alphabet, budget }
// Messages envoyés : { type: "progression", essais } puis { type: "fin", ... } ou { type: "erreur", message }.
"use strict";
importScripts("forge.js");

const PAS_PROGRESSION = 250_000;

// Cherche des noms ; `apres` permet de reprendre juste après le dernier nom trouvé.
function chercher({ prefab, qualite, cible, copies, mode, alphabet, longueurMin, longueurMax, limite, apres, budget, exclus }) {
  const al = ALPHABETS[alphabet] || ALPHABETS.lettres;
  const cle0 = (hachage(prefab) + qualite + 1) | 0;
  const trouves = [];
  let essais = 0, prochainPas = PAS_PROGRESSION, epuise = false;
  let debutLongueur = longueurMin, debutIndice = 0;
  if (apres) {
    debutLongueur = Math.max(longueurMin, apres.length);
    if (apres.length === debutLongueur) {
      for (const c of apres) {
        const i = al.indexOf(c);
        if (i < 0) throw new Error("impossible de reprendre après ce nom");
        debutIndice = debutIndice * al.length + i;
      }
      debutIndice += 1;
    }
  }
  for (let L = debutLongueur; L <= longueurMax; L++) {
    let stop = false;
    parcourirNoms(al, L, L === debutLongueur ? debutIndice : 0, (idx, h) => {
      essais++;
      if (essais >= prochainPas) { postMessage({ type: "progression", essais }); prochainPas += PAS_PROGRESSION; }
      if (essais > budget) { stop = epuise = true; return true; }
      if (convient(h, cle0, cible, copies, mode)) {
        let nom = "";
        for (const i of idx) nom += al[i];
        if (!exclus || !exclus.has(nom)) {
          trouves.push(nom);
          if (trouves.length >= limite) { stop = true; return true; }
        }
      }
      return false;
    });
    if (stop) break;
  }
  return { noms: trouves, essais: Math.min(essais, budget), epuise };
}

// Chaîne de nouveaux personnages qui amènent l'objet de `depart` à `arrivee` sans le casser :
// chacun ne fait que les améliorations que ses propres tirages réussissent, puis passe l'objet au suivant.
function relais({ prefab, depart, arrivee, alphabet, budget }) {
  const plan = [], utilises = new Set();
  let niveau = depart;
  while (niveau < arrivee) {
    let pas = Math.min(MAX_SERIE, arrivee - niveau), res = null;
    // si aucun nom ne donne autant d'améliorations d'affilée dans le budget, on vise une étape plus courte
    for (; pas >= 1; pas--) {
      res = chercher({ prefab, qualite: niveau, cible: pas, copies: 1, mode: "auMoins", alphabet,
        longueurMin: 3, longueurMax: 15, limite: 1, budget, exclus: utilises });
      if (res.noms.length) break;
    }
    if (!res.noms.length) throw new Error(`aucun nom trouvé pour passer la qualité ${niveau}`);
    const nom = res.noms[0];
    utilises.add(nom);
    const sim = simuler(prefab, niveau, nom);
    plan.push({ nom, de: niveau, a: niveau + pas, valeurs: sim.etapes.slice(0, pas).map((e) => e.valeur) });
    niveau += pas;
    postMessage({ type: "progression", etape: plan.length, niveau });
  }
  return { plan };
}

onmessage = (e) => {
  try {
    const d = e.data;
    const res = d.type === "relais" ? relais(d) : chercher({ ...d, mode: "exact" });
    postMessage({ type: "fin", ...res });
  } catch (err) {
    postMessage({ type: "erreur", message: err.message });
  }
};
