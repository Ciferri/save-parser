// Mécanique de la Forge du potentiel : hachage des noms, générateur aléatoire de Unity et simulation des améliorations.
// Utilisé par la page et par le worker de recherche de noms (importScripts).
"use strict";

const CHANCE_REUSSITE = Math.fround(0.65);
const CHANCE_CASSE = 1.0;          // une tentative ratée détruit toujours l'objet
const MAX_TENTATIVES = 200;
const MAX_SERIE = 8;               // le plus d'améliorations qu'un nouveau personnage obtient d'affilée
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

// Seulement Random.value : suffit pour la première tentative d'un nouveau personnage (recherche rapide).
function premiereValeur(graine) {
  const e0 = graine >>> 0;
  const e1 = (Math.imul(e0, 1812433253) + 1) >>> 0;
  const e2 = (Math.imul(e1, 1812433253) + 1) >>> 0;
  const e3 = (Math.imul(e2, 1812433253) + 1) >>> 0;
  const t = (e0 ^ (e0 << 11)) >>> 0;
  return Math.fround(Math.fround(((t ^ e3 ^ (t >>> 8) ^ (e3 >>> 19)) & 0x7fffff)) * ECHELLE);
}

// Issue d'une tentative à partir de la valeur tirée.
function issue(valeur) {
  if (valeur <= CHANCE_REUSSITE) return "reussite";
  if (Math.fround(1 - valeur) <= CHANCE_CASSE) return "casse";
  return "echec";
}

// Rejoue les tentatives d'amélioration d'un objet jusqu'à ce qu'il casse.
// graines : Map clé -> graine enregistrée dans le personnage ; elle est modifiée seulement si `modifier` est vrai.
function simuler(prefab, qualite, nomPerso, graines = new Map(), modifier = false) {
  const g = modifier ? graines : new Map(graines);
  const base = hachage(prefab);
  const hNom = hachage(nomPerso);
  const etapes = [];
  let niveau = qualite;
  for (let n = 0; n < MAX_TENTATIVES; n++) {
    const vise = niveau + 1;
    const cle = (base + vise) | 0;
    const enregistree = g.has(cle);
    const [valeur, suivante] = tirage(enregistree ? g.get(cle) : (hNom + cle) | 0);
    g.set(cle, suivante);
    const res = issue(valeur);
    etapes.push({ vers: vise, valeur, issue: res, enregistree });
    if (res === "reussite") niveau = vise;
    else if (res === "echec") niveau = vise - 2;
    else break;
  }
  const derniere = etapes[etapes.length - 1];
  return {
    prefab, depart: qualite, etapes,
    ameliorations: etapes.filter((e) => e.issue === "reussite").length,
    casse: derniere.issue === "casse",
    niveauFinal: derniere.issue === "casse" ? derniere.vers - 1 : niveau,
  };
}

// ---------- recherche de noms ----------

const ALPHABETS = {
  lettres: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  minuscules: "abcdefghijklmnopqrstuvwxyz",
  alphanum: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",
};

// Vérifie un hachage de nom h pour un objet dont la première clé visée est cle0.
// mode "exact" : chaque copie sauf la dernière obtient exactement `cible` réussites puis casse ;
//                la dernière (si copies > 1) réussit aussi la tentative où les autres ont cassé.
// mode "auMoins" : la dernière copie obtient au moins `cible` réussites d'affilée (sert au relais).
function convient(h, cle0, cible, copies, mode) {
  if (copies === 1) {
    // cas courant : uniquement des premières tentatives, pas besoin de mémoriser les graines
    for (let i = 0; i < cible; i++) if (premiereValeur((h + cle0 + i) | 0) > CHANCE_REUSSITE) return false;
    if (mode === "auMoins") return true;
    return premiereValeur((h + cle0 + cible) | 0) > CHANCE_REUSSITE;
  }
  const graines = new Map();
  const tenter = (i) => {
    const [v, suivante] = tirage(graines.has(i) ? graines.get(i) : (h + cle0 + i) | 0);
    graines.set(i, suivante);
    return v <= CHANCE_REUSSITE;
  };
  for (let c = 0; c < copies; c++) {
    const derniere = c === copies - 1;
    if (mode === "auMoins") {
      let i = 0;
      while (i < MAX_TENTATIVES && tenter(i)) {
        i++;
        if (derniere && i >= cible) return true;
      }
      if (derniere) return false;
    } else {
      for (let i = 0; i < cible; i++) if (!tenter(i)) return false;
      const ok = tenter(cible);
      if (derniere ? !ok : ok) return false;
    }
  }
  return mode === "exact";
}

// Parcourt les noms d'une longueur donnée dans l'ordre, à partir de l'indice `debut`, et appelle rappel(indices, h)
// où indices donne la position de chaque caractère dans l'alphabet. Le rappel renvoie true pour arrêter. Renvoie le nombre de noms examinés.
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
  module.exports = { hachage, tirage, premiereValeur, simuler, convient, parcourirNoms, ALPHABETS, MAX_SERIE, CHANCE_REUSSITE };
}
