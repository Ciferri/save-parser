// Lecture d'un monde Valheim enregistré en morceaux (fichiers .chunk). Rien n'est modifié.
//
// Chaque objet du monde est enregistré avec sa position (3 flottants : x, hauteur, z) juste avant le hachage du nom
// de son prefab. Ses données suivent : pour un conteneur, la clé « items » puis son inventaire (même format que
// l'inventaire d'un personnage) ; pour un portail, la clé « tag » puis son nom.
"use strict";

const CLE_ITEMS = hachage("items");
const CLE_TAG = hachage("tag");
const PORTEE_DONNEES = 400;           // octets examinés après un objet pour trouver ses données

const positionPlausible = (x, y, z) => Math.abs(x) < 12000 && Math.abs(z) < 12000 && y > -500 && y < 3000;

function chaine7(o, p) {
  let n = 0, decal = 0, b;
  do { b = o[p++]; n |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
  return [new TextDecoder("utf-8").decode(o.subarray(p, p + n)), p + n];
}

// Inventaire d'un conteneur : version, nombre d'objets, puis chaque objet (mêmes drapeaux que dans le .fch).
function inventaireMonde(o, v, p) {
  const version = v.getInt32(p, true); p += 4;
  if (version < 90 || version > 200) return null;
  const n = v.getUint16(p, true); p += 2;
  if (n > 200) return null;
  const objets = [];
  for (let i = 0; i < n; i++) {
    p += 4 + 3;
    const f = o[p++];
    const obj = { prefab: 0, qualite: 1, pile: 1 };
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
    if (p > o.length) return null;
    objets.push(obj);
  }
  return objets;
}

// fichiers : [{ nom, octets: Uint8Array }]. Renvoie { conteneurs: [...], portails: [...] }.
function lireMonde(fichiers) {
  const typesConteneur = new Map(Object.keys(JEU.conteneurs).map((p) => [hachage(p), p]));
  const typesPortail = new Map(Object.keys(JEU.portails).map((p) => [hachage(p), p]));
  const conteneurs = [], portails = [];
  for (const { nom, octets: o } of fichiers) {
    const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
    for (let i = 12; i + 4 <= o.length; i++) {
      const h = v.getInt32(i, true);
      const conteneur = typesConteneur.get(h), portail = conteneur ? null : typesPortail.get(h);
      if (!conteneur && !portail) continue;
      const x = v.getFloat32(i - 12, true), y = v.getFloat32(i - 8, true), z = v.getFloat32(i - 4, true);
      if (!positionPlausible(x, y, z)) continue;
      const cle = conteneur ? CLE_ITEMS : CLE_TAG;
      let donnee = null;
      for (let j = i + 4, fin = Math.min(o.length - 8, i + PORTEE_DONNEES); j < fin; j++) {
        if (v.getInt32(j, true) !== cle) continue;
        try { donnee = conteneur ? inventaireMonde(o, v, j + 8) : chaine7(o, j + 4)[0]; } catch { donnee = null; }
        break;
      }
      if (conteneur) conteneurs.push({ type: conteneur, x, y, z, objets: donnee || [], fichier: nom });
      else portails.push({ type: portail, x, y, z, nom: donnee ?? "", fichier: nom });
    }
  }
  return { conteneurs, portails };
}

if (typeof module !== "undefined") module.exports = { lireMonde };
