// Lecture des portails d'un monde Valheim enregistré en morceaux (fichiers .chunk). Rien n'est modifié.
//
// Chaque objet du monde est enregistré avec sa position (3 flottants : x, hauteur, z) juste avant le hachage du nom
// de son prefab. Pour un portail, ses données contiennent ensuite la clé « tag » suivie de son nom.
"use strict";

const CLE_TAG = hachage("tag");
const PORTEE_DONNEES = 400;           // octets examinés après un portail pour trouver son nom

const positionPlausible = (x, y, z) => Math.abs(x) < 12000 && Math.abs(z) < 12000 && y > -500 && y < 3000;

function chaine7(o, p) {
  let n = 0, decal = 0, b;
  do { b = o[p++]; n |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
  return new TextDecoder("utf-8").decode(o.subarray(p, p + n));
}

// fichiers : [{ nom, octets: Uint8Array }]. Renvoie [{ type, x, y, z, nom }].
function lirePortails(fichiers) {
  const types = new Map(Object.keys(JEU.portails).map((p) => [hachage(p), p]));
  const portails = [];
  for (const { octets: o } of fichiers) {
    const v = new DataView(o.buffer, o.byteOffset, o.byteLength);
    for (let i = 12; i + 4 <= o.length; i++) {
      const type = types.get(v.getInt32(i, true));
      if (!type) continue;
      const x = v.getFloat32(i - 12, true), y = v.getFloat32(i - 8, true), z = v.getFloat32(i - 4, true);
      if (!positionPlausible(x, y, z)) continue;
      let nom = "";
      for (let j = i + 4, fin = Math.min(o.length - 5, i + PORTEE_DONNEES); j < fin; j++) {
        if (v.getInt32(j, true) !== CLE_TAG) continue;
        try { nom = chaine7(o, j + 4); } catch { nom = ""; }
        break;
      }
      portails.push({ type, x, y, z, nom });
    }
  }
  return portails;
}

if (typeof module !== "undefined") module.exports = { lirePortails };
