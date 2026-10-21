// Coût réel d'une amélioration pour un personnage, sans astuce de nom : il fabrique l'objet, l'améliore à sa station
// aussi loin que celle-ci le permet, puis tente la Forge du potentiel. Chaque tirage est le vrai tirage du personnage.
//
// Règles de coût :
//   - fabriquer une copie coûte les ingrédients de la recette (les pièces d'équipement utilisées comme ingrédient
//     comptent pour ce qu'elles coûtent à fabriquer) ; un objet moulé coûte son moule et le carburant de la fonderie ;
//   - monter à la qualité q à la station coûte la quantité « par niveau » de chaque ingrédient pour ce niveau ;
//   - chaque tentative à la Forge coûte une idole, réussie ou non ;
//   - quand l'objet casse, une part des ingrédients récupérables est rendue (arrondie au supérieur).
"use strict";

const MAX_COPIES = 10_000;
const MAX_ESSAIS = 1_000_000;

// Quantité d'un ingrédient pour passer à la qualité q, d'après sa quantité par niveau.
function quantiteNiveau(parNiveau, q) {
  if (q <= 1) return 0;
  return q < 4 ? (q - 1) * parNiveau : (4 + Math.floor((q - 4) / 2)) * parNiveau;
}

const ajouter = (m, cle, n) => { if (n) m.set(cle, (m.get(cle) || 0) + n); };

// Ce que coûte une copie neuve : Map prefab -> quantité. Les équipements servant d'ingrédient sont détaillés.
function coutFabrication(prefab, profondeur = 0) {
  const info = JEU.ameliorables[prefab];
  const total = new Map();
  if (!info || profondeur > 5) { ajouter(total, prefab, 1); return total; }
  if (info.moulage) {
    for (const [p, n] of info.moulage.res) ajouter(total, p, n);
    ajouter(total, info.moulage.carburant, info.moulage.parMoule);
    return total;
  }
  for (const [p, n, , idole] of info.res) {
    if (idole || !n) continue;
    if (JEU.ameliorables[p] && p !== prefab) for (const [q, m] of coutFabrication(p, profondeur + 1)) ajouter(total, q, m * n);
    else ajouter(total, p, n);
  }
  return total;
}

// Simule le parcours complet jusqu'à la qualité `cible`. graines : celles du personnage (non modifiées).
function simulerCout(prefab, cible, nomPerso, graines = new Map()) {
  const info = JEU.ameliorables[prefab];
  const regles = { chance: info.chance, casse: info.casse };
  const g = new Map(graines);
  const base = hachage(prefab), hNom = hachage(nomPerso);
  const depense = new Map(), rendu = new Map();
  const fabrication = coutFabrication(prefab);
  const idole = info.res.find((r) => r[3]);
  let copies = 0, essais = 0, cassees = 0, niveau = 0;
  const journal = [];                            // une entrée par copie : niveaux atteints et issue
  while (niveau < cible) {
    if (copies >= MAX_COPIES || essais >= MAX_ESSAIS) return { abandon: true, copies, essais, depense, rendu };
    // nouvelle copie
    copies++;
    for (const [p, n] of fabrication) ajouter(depense, p, n);
    niveau = 1;
    let pic = 1, tentatives = 0, cassee = false;
    while (niveau < cible) {
      if (niveau < info.plafond) {
        // amélioration sûre à la station
        for (const [p, , parNiv, estIdole] of info.res) if (!estIdole && !JEU.ameliorables[p]) ajouter(depense, p, quantiteNiveau(parNiv, niveau + 1));
        niveau++;
        pic = Math.max(pic, niveau);
        continue;
      }
      // tentative à la Forge du potentiel
      essais++; tentatives++;
      if (idole) ajouter(depense, idole[0], idole[1]);
      const cle = (base + niveau + 1) | 0;
      const [valeur, suivante] = tirage(g.has(cle) ? g.get(cle) : (hNom + cle) | 0);
      g.set(cle, suivante);
      const res = issue(valeur, regles);
      if (res === "reussite") { niveau++; pic = Math.max(pic, niveau); }
      else if (res === "echec") niveau--;
      else {
        cassee = true; cassees++;
        for (const [p, n, parNiv, estIdole, recup] of info.res) {
          if (estIdole || !recup) continue;
          ajouter(rendu, p, Math.ceil(info.retour * (n + quantiteNiveau(parNiv, niveau))));
        }
        break;
      }
      if (essais >= MAX_ESSAIS) break;
    }
    journal.push({ pic, tentatives, cassee, niveau: cassee ? null : niveau });
    if (cassee) niveau = 0;
  }
  return { abandon: false, copies, essais, cassees, depense, rendu, journal };
}

if (typeof module !== "undefined") module.exports = { quantiteNiveau, coutFabrication, simulerCout };
