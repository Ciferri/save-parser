// Mécanique de la Forge du potentiel : hachage des noms, générateur aléatoire de Unity et simulation des améliorations.
// Utilisé par la page et par le worker de recherche de noms (importScripts).
//
// Une tentative tire une valeur v dans [0, 1] :
//   v <= chance de réussite             -> l'objet gagne un niveau ;
//   sinon, 1 - v <= chance de casse      -> l'objet est détruit ;
//   sinon                                -> l'objet perd un niveau.
// Les chances viennent des données de chaque objet (js/jeu.js).
"use strict";

const REGLES_DEFAUT = { chance: 0.65, casse: 0.1 };
const MAX_TENTATIVES = 500;        // arrête une simulation qui ne casse jamais
const MAX_SERIE = 8;               // le plus de réussites d'affilée qu'un nouveau personnage obtient dès le départ
const QUALITE_MAX = 65535;

// Le flottant de 32 bits dont l'écriture mémoire est 01 00 00 34 : Unity multiplie par lui pour obtenir Random.value.
const ECHELLE = new DataView(new Uint8Array([1, 0, 0, 0x34]).buffer).getFloat32(0, true);

// Équivalent de string.GetStableHashCode() : deux accumulateurs djb2, un pour les caractères pairs, un pour les impairs.
function hachage(texte) {
  let pair = 5381, impair = 5381;
  for (let i = 0; i < texte.length; i++) {
    if (i % 2 === 0) pair = (((pair << 5) + pair) | 0) ^ texte.charCodeAt(i);
    else impair = (((impair << 5) + impair) | 0) ^ texte.charCodeAt(i);
  }
  return (pair + Math.imul(impair, 1566083941)) | 0;
}

// Random.InitState(graine) puis un tirage : renvoie [Random.value, Random.Range(0, 99999999)].
// Le second nombre est la graine que le jeu enregistre pour la tentative suivante sur la même clé.
function tirage(graine) {
  const e0 = graine >>> 0;
  const e1 = (Math.imul(e0, 1812433253) + 1) >>> 0;
  const e2 = (Math.imul(e1, 1812433253) + 1) >>> 0;
  const e3 = (Math.imul(e2, 1812433253) + 1) >>> 0;
  let t = (e0 ^ (e0 << 11)) >>> 0;
  const premier = (t ^ e3 ^ (t >>> 8) ^ (e3 >>> 19)) >>> 0;
  t = (e1 ^ (e1 << 11)) >>> 0;
  const second = (t ^ premier ^ (t >>> 8) ^ (premier >>> 19)) >>> 0;
  return [Math.fround(Math.fround(premier & 0x7fffff) * ECHELLE), second % 99999999];
}

// Seulement Random.value : suffit pour la première tentative sur une clé (recherche rapide).
function premiereValeur(graine) {
  const e0 = graine >>> 0;
  const e1 = (Math.imul(e0, 1812433253) + 1) >>> 0;
  const e2 = (Math.imul(e1, 1812433253) + 1) >>> 0;
  const e3 = (Math.imul(e2, 1812433253) + 1) >>> 0;
  const t = (e0 ^ (e0 << 11)) >>> 0;
  return Math.fround(Math.fround(((t ^ e3 ^ (t >>> 8) ^ (e3 >>> 19)) & 0x7fffff)) * ECHELLE);
}

// Issue d'une tentative à partir de la valeur tirée (comparaisons en flottants 32 bits, comme le jeu).
function issue(valeur, regles = REGLES_DEFAUT) {
  if (valeur <= Math.fround(regles.chance)) return "reussite";
  if (Math.fround(1 - valeur) <= Math.fround(regles.casse)) return "casse";
  return "echec";
}

// Rejoue les tentatives d'amélioration d'un objet jusqu'à ce qu'il casse (ou jusqu'à `maxTentatives`).
// graines : Map clé -> graine enregistrée dans le personnage ; elle n'est modifiée que si `modifier` est vrai.
function simuler(prefab, qualite, nomPerso, graines = new Map(), { modifier = false, regles = REGLES_DEFAUT, maxTentatives = MAX_TENTATIVES } = {}) {
  const g = modifier ? graines : new Map(graines);
  const base = hachage(prefab);
  const hNom = hachage(nomPerso);
  const etapes = [];
  let niveau = qualite, pic = qualite, picApres = 0;
  for (let n = 0; n < maxTentatives; n++) {
    const vise = niveau + 1;
    const cle = (base + vise) | 0;
    const enregistree = g.has(cle);
    const [valeur, suivante] = tirage(enregistree ? g.get(cle) : (hNom + cle) | 0);
    g.set(cle, suivante);
    const res = issue(valeur, regles);
    etapes.push({ vers: vise, valeur, issue: res, enregistree });
    if (res === "reussite") {
      niveau = vise;
      if (niveau > pic) { pic = niveau; picApres = etapes.length; }
    } else if (res === "echec") niveau = vise - 2;
    else break;
  }
  const derniere = etapes[etapes.length - 1];
  let serie = 0;
  while (serie < etapes.length && etapes[serie].issue === "reussite") serie++;
  return {
    prefab, depart: qualite, etapes, serie, pic, picApres,
    ameliorations: etapes.filter((e) => e.issue === "reussite").length,
    casse: derniere.issue === "casse",
    niveauFinal: niveau,
  };
}

// ---------- recherche de noms ----------

const ALPHABETS = {
  lettres: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  minuscules: "abcdefghijklmnopqrstuvwxyz",
  alphanum: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
};

// Un nouveau personnage n'a aucune graine enregistrée : tant qu'il réussit, chaque tentative vise un nouveau niveau,
// donc une clé jamais utilisée, et son tirage ne dépend que du nom. h est le hachage du nom, cle0 la clé du premier
// niveau visé. mode "exact" : exactement `cible` réussites puis un raté ; "auMoins" : au moins `cible` réussites.
function convient(h, cle0, cible, mode, chance = REGLES_DEFAUT.chance) {
  const c = Math.fround(chance);
  for (let i = 0; i < cible; i++) if (premiereValeur((h + cle0 + i) | 0) > c) return false;
  return mode === "auMoins" || premiereValeur((h + cle0 + cible) | 0) > c;
}

// Parcourt les noms d'une longueur donnée dans l'ordre, à partir de l'indice `debut`, et appelle rappel(indices, h)
// où indices donne la position de chaque caractère dans l'alphabet. Le rappel renvoie true pour arrêter.
function parcourirNoms(alphabet, longueur, debut, rappel) {
  const k = alphabet.length;
  const codes = Array.from(alphabet, (c) => c.charCodeAt(0));
  const idx = new Array(longueur).fill(0);
  let reste = debut;
  for (let p = longueur - 1; p >= 0; p--) { idx[p] = reste % k; reste = Math.floor(reste / k); }
  if (reste > 0) return 0;
  let vus = 0;
  const dernierPair = (longueur - 1) % 2 === 0;
  for (;;) {
    // hachage du préfixe (tous les caractères sauf le dernier)
    let a = 5381, b = 5381;
    for (let p = 0; p < longueur - 1; p++) {
      if (p % 2 === 0) a = (((a << 5) + a) | 0) ^ codes[idx[p]];
      else b = (((b << 5) + b) | 0) ^ codes[idx[p]];
    }
    const a5 = ((a << 5) + a) | 0, b5 = ((b << 5) + b) | 0;
    for (let d = idx[longueur - 1]; d < k; d++) {
      const h = dernierPair ? ((a5 ^ codes[d]) + Math.imul(b, 1566083941)) | 0
                            : (a + Math.imul(b5 ^ codes[d], 1566083941)) | 0;
      vus++;
      idx[longueur - 1] = d;
      if (rappel(idx, h)) return vus;
    }
    // préfixe suivant
    idx[longueur - 1] = 0;
    let p = longueur - 2;
    while (p >= 0 && ++idx[p] === k) { idx[p] = 0; p--; }
    if (p < 0) return vus;
  }
}

if (typeof module !== "undefined") {
  module.exports = { hachage, tirage, premiereValeur, issue, simuler, convient, parcourirNoms, ALPHABETS, MAX_SERIE, REGLES_DEFAUT };
}
