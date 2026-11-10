// Lecture d'un monde Valheim enregistré en morceaux (fichiers .chunk) : portails et tombes des joueurs. Rien n'est modifié.
//
// Chaque objet du monde est enregistré avec sa position (3 flottants : x, hauteur, z) juste avant le hachage du nom
// de son prefab, puis ses données, rangées sous des clés (hachages de noms) :
//   portail : « tag » (son nom) ;
//   tombe   : « ownerName » (le joueur), « timeOfDeath » (heure du monde, en ticks de 100 ns), « items » (contenu).
"use strict";

const CLE_TAG = hachage("tag");
const CLE_PROPRIO = hachage("ownerName");
const CLE_MORT = hachage("timeOfDeath");
const CLE_ITEMS = hachage("items");
const TOMBE = hachage("Player_tombstone");
const PORTEE_DONNEES = 400;           // octets examinés après un objet pour trouver ses données
const HAUTEUR_DONJONS = 4000;         // les donjons et grottes sont placés très haut au-dessus de leur entrée
const DUREE_JOUR = 1800;              // secondes de temps du monde par jour

const positionPlausible = (x, y, z) => Math.abs(x) < 12000 && Math.abs(z) < 12000 && y > -500 && y < 7000;

function chaine7(o, p) {
  let n = 0, decal = 0, b;
  do { b = o[p++]; n |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
  return [new TextDecoder("utf-8").decode(o.subarray(p, p + n)), p + n];
}

// Contenu d'une tombe : version, nombre d'objets, puis chaque objet (mêmes drapeaux que l'inventaire d'un personnage).
function inventaireMonde(o, v, p) {
  const version = v.getInt32(p, true); p += 4;
  if (version < 90 || version > 200) return [];
  const n = v.getUint16(p, true); p += 2;
  const objets = [];
  for (let i = 0; i < n && i < 500; i++) {
    p += 4 + 3;
    const f = o[p++];
    const obj = { prefab: 0, qualite: 1, pile: 1, equipe: (f & 2) !== 0 };
    if (f & 4) { obj.qualite = v.getUint16(p, true); p += 2; }
    if (f & 8) { obj.pile = v.getUint16(p, true); p += 2; }
    if (f & 16) p += 4;
    if (f & 32) { p += 8; p = chaine7(o, p)[1]; }
    if (f & 64) { obj.prefab = v.getInt32(p, true); p += 4; }
    if (f & 128) {
      let m = o[p++];
      if (m & 0x80) m = ((m & 0x7f) << 8) | o[p++];
      for (let k = 0; k < 2 * m; k++) p = chaine7(o, p)[1];
    }
    p += 1;
    if (p > o.length) break;
    objets.push(obj);
  }
  return objets;
}

// Cherche après l'objet en `i` chaque clé demandée et lit sa valeur.
function donnees(o, v, i, lecteurs) {
  const res = {};
  for (let j = i + 4, fin = Math.min(o.length - 8, i + PORTEE_DONNEES); j < fin; j++) {
    const lire = lecteurs.get(v.getInt32(j, true));
    if (!lire) continue;
    try { Object.assign(res, lire(j + 4)); } catch { /* valeur illisible : ignorée */ }
  }
  return res;
}

// fichiers : [{ nom, octets: Uint8Array }]. Renvoie { portails: [...], tombes: [...] }.
function lireMonde(fichiers) {
  const typesPortail = new Map(Object.keys(JEU.portails).map((p) => [hachage(p), p]));
  const portails = [], tombes = [];
  for (const { octets: o } of fichiers) {
    const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
    const lecteursPortail = new Map([[CLE_TAG, (p) => ({ nom: chaine7(o, p)[0] })]]);
    const lecteursTombe = new Map([
      [CLE_PROPRIO, (p) => ({ joueur: chaine7(o, p)[0] })],
      [CLE_MORT, (p) => ({ secondes: Number(v.getBigInt64(p, true) / 10000000n) })],
      [CLE_ITEMS, (p) => ({ objets: inventaireMonde(o, v, p + 4) })],
    ]);
    for (let i = 12; i + 4 <= o.length; i++) {
      const h = v.getInt32(i, true);
      const portail = typesPortail.get(h);
      if (!portail && h !== TOMBE) continue;
      const x = v.getFloat32(i - 12, true), y = v.getFloat32(i - 8, true), z = v.getFloat32(i - 4, true);
      if (!positionPlausible(x, y, z)) continue;
      if (portail) {
        if (y < HAUTEUR_DONJONS) portails.push({ type: portail, x, y, z, nom: "", ...donnees(o, v, i, lecteursPortail) });
        continue;
      }
      const t = { x, y, z, joueur: "", objets: [], secondes: null, ...donnees(o, v, i, lecteursTombe) };
      t.donjon = y > HAUTEUR_DONJONS;
      t.jour = t.secondes === null ? null : Math.floor(t.secondes / DUREE_JOUR) + 1;
      tombes.push(t);
    }
  }
  return { portails, tombes };
}

if (typeof module !== "undefined") module.exports = { lireMonde };
