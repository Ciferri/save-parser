// Compteurs de butin rare. Une chance finale de 30 % ou moins n'est pas tirée au hasard : un compteur, enregistré
// dans le personnage, décompte les mises à mort et la dernière fait tomber l'objet. Chaque étoile double la chance
// (sauf pour les butins qui l'ignorent). Le compteur appartient à l'objet et à sa chance finale :
// clé = hachage(prefab de l'objet) + partie entière(chance × 1000).
"use strict";

const SEUIL_COMPTEUR = Math.fround(0.3);
const ETOILES_MAX = 2;      // hypothèse : toute créature hors boss peut avoir jusqu'à 2 étoiles

function chanceFinale(chance, etoiles, suitEtoiles) {
  return Math.fround(Math.fround(chance) * (suitEtoiles ? 2 ** etoiles : 1));
}

// Clé du compteur, ou null quand chaque mise à mort est un tirage indépendant.
function cleCompteur(objet, chance) {
  if (!(chance > 0 && chance <= SEUIL_COMPTEUR)) return null;
  return (hachage(objet) + Math.floor(chance * 1000)) | 0;
}

// Le premier butin tombe au plus tard à la K-ième mise à mort ; ensuite l'écart va de 1 à K+1.
const intervalle = (chance) => Math.floor((1 / chance) * 2);

// Toutes les lignes (créature, étoiles, objet) qui utilisent un compteur.
function lignesButin() {
  const lignes = [];
  for (const [creature, b] of Object.entries(JEU.butins)) {
    const max = b.boss ? 0 : ETOILES_MAX;
    for (let e = 0; e <= max; e++) {
      for (const [objet, chance, suit] of b.drops) {
        if (!suit && e > 0) continue;               // même compteur à toutes les étoiles : une seule ligne
        const finale = chanceFinale(chance, e, suit);
        const cle = cleCompteur(objet, finale);
        if (cle === null) continue;
        lignes.push({ creature, nomCreature: b.nom, etoiles: suit ? e : null, objet, chance: finale, cle, k: intervalle(finale) });
      }
    }
  }
  return lignes;
}

if (typeof module !== "undefined") module.exports = { chanceFinale, cleCompteur, intervalle, lignesButin };
