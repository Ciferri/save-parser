// Lecture d'un fichier de personnage Valheim (.fch). Le fichier n'est jamais modifié.
//
// Format (petit-boutiste) : int32 taille | contenu | int32 64 | SHA-512 du contenu.
// Les chaînes sont précédées de leur longueur encodée sur 7 bits par octet, en UTF-8.
// Contenu : version du profil, nombre de statistiques, nombre de jeux de statistiques (un par difficulté),
// puis les jeux de statistiques, les données par monde, le nom du personnage et enfin les données du joueur
// (inventaire, recettes, compétences… et les graines de la Forge du potentiel).
"use strict";

const VERSION_PROFIL_MIN = 46;
const VERSION_PROFIL_TESTEE = 47;
const VERSION_JOUEUR = 34;
const NB_STATS = 205;
const NB_JEUX = 10;
// Jeux de statistiques utilisés par les succès (0 = brut, jamais utilisé par les succès)
const JEU = { tous: 1, normal: 6, difficile: 7 };

class ErreurSauvegarde extends Error {}

class Lecteur {
  constructor(octets) {
    this.o = octets;
    this.v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
    this.pos = 0;
    this.utf8 = new TextDecoder("utf-8");
  }
  verifier(n) {
    if (n < 0 || this.pos + n > this.o.length) throw new ErreurSauvegarde("fin de fichier inattendue");
  }
  sauter(n) { this.verifier(n); this.pos += n; }
  u8() { this.verifier(1); return this.o[this.pos++]; }
  bool() { return this.u8() !== 0; }
  u16() { this.verifier(2); const x = this.v.getUint16(this.pos, true); this.pos += 2; return x; }
  i32() { this.verifier(4); const x = this.v.getInt32(this.pos, true); this.pos += 4; return x; }
  f32() { this.verifier(4); const x = this.v.getFloat32(this.pos, true); this.pos += 4; return x; }
  compte() {
    const n = this.i32();
    if (n < 0 || n > 10_000_000) throw new ErreurSauvegarde("compteur invalide");
    return n;
  }
  chaine() {
    let n = 0, decal = 0, b;
    do { b = this.u8(); n |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
    this.verifier(n);
    const s = this.utf8.decode(this.o.subarray(this.pos, this.pos + n));
    this.pos += n;
    return s;
  }
  // int32 nombre, puis (chaîne, float32) répétés
  dico() {
    const m = new Map();
    for (let n = this.compte(); n > 0; n--) { const k = this.chaine(); m.set(k, this.f32()); }
    return m;
  }
}

function lireJeuStats(l) {
  const stats = new Float32Array(NB_STATS);
  for (let i = 0; i < NB_STATS; i++) stats[i] = l.f32();
  const jeu = { stats, mondes: l.dico() };
  l.dico();                                   // clés de monde connues
  l.dico();                                   // commandes connues
  const tuesParType = [];
  for (let n = l.compte(); n > 0; n--) tuesParType.push(l.dico());
  jeu.tues = tuesParType[0] || new Map();     // total ; puis mains nues, magie, distance, mêlée
  jeu.ramasses = l.dico();
  jeu.fabriques = l.dico();
  jeu.cueillis = l.dico();                    // les poissons pêchés sont comptés ici
  jeu.manges = l.dico();
  jeu.construits = l.dico();
  return jeu;
}

function lireObjet(l) {
  l.sauter(4 + 3);                            // durabilité, position x/y, niveau du monde
  const drapeaux = l.u8();
  const objet = { equipe: (drapeaux & 2) !== 0, qualite: 1, pile: 1, prefab: 0 };
  if (drapeaux & 4) objet.qualite = l.u16();
  if (drapeaux & 8) objet.pile = l.u16();
  if (drapeaux & 16) l.sauter(4);             // variante
  if (drapeaux & 32) { l.sauter(8); l.chaine(); }   // identifiant et nom de l'artisan
  if (drapeaux & 64) objet.prefab = l.i32();  // hachage du nom du prefab
  if (drapeaux & 128) {
    let n = l.u8();
    if (n & 0x80) n = ((n & 0x7f) << 8) | l.u8();
    for (; n > 0; n--) { l.chaine(); l.chaine(); }
  }
  l.sauter(1);                                // objet obtenu par triche
  return objet;
}

// Données du joueur : seules l'inventaire et les graines d'amélioration sont gardées.
function lireJoueur(l, fin) {
  const version = l.i32();
  if (version < VERSION_JOUEUR) {
    throw new ErreurSauvegarde("ce personnage a été enregistré par une ancienne version de Valheim. Chargez-le dans " +
      "le jeu à jour (1.0.20 ou plus récent) et sauvegardez-le avant de prédire ses améliorations.");
  }
  if (version !== VERSION_JOUEUR) throw new ErreurSauvegarde("le format des données du joueur a changé, le site doit être mis à jour.");
  l.sauter(16);                               // santé max, santé, endurance max, temps depuis la mort
  l.chaine(); l.sauter(4);                    // pouvoir du gardien et son délai
  l.sauter(4);                                // version de l'inventaire
  const inventaire = [];
  for (let n = l.u16(); n > 0; n--) inventaire.push(lireObjet(l));
  for (let n = l.compte(); n > 0; n--) l.chaine();                 // recettes connues
  for (let n = l.compte(); n > 0; n--) { l.chaine(); l.sauter(4); } // stations connues
  for (let k = 0; k < 4; k++) for (let n = l.compte(); n > 0; n--) l.chaine();  // matériaux, tutoriels, uniques, trophées
  for (let n = l.compte(); n > 0; n--) l.chaine();                 // biomes connus
  for (let n = l.compte(); n > 0; n--) { l.chaine(); l.chaine(); } // textes connus
  l.chaine(); l.chaine();                     // barbe, cheveux
  l.sauter(12 + 12 + 4);                      // couleurs de peau et de cheveux, modèle
  for (let n = l.compte(); n > 0; n--) { l.chaine(); l.sauter(4); } // nourriture en cours
  l.sauter(4);                                // version des compétences
  l.sauter(l.compte() * 12);                  // compétences
  for (let n = l.compte(); n > 0; n--) { l.chaine(); l.chaine(); } // données personnalisées
  l.sauter(12);                               // endurance, eitr max, eitr
  l.sauter(l.compte());                       // état du menu de construction
  l.sauter(l.compte() * 8);                   // compteurs de butin
  const graines = new Map();
  for (let n = l.compte(); n > 0; n--) { const cle = l.i32(); graines.set(cle, l.i32()); }
  if (l.pos !== fin) throw new ErreurSauvegarde("les données du joueur ont une forme inattendue, le site doit être mis à jour.");
  return { inventaire, graines };
}

// Lit tout le fichier. Les statistiques sont toujours renvoyées ; si les données du joueur ne peuvent pas être lues,
// `joueur` est null et `erreurJoueur` explique pourquoi.
function lireSauvegarde(octets) {
  try {
    if (octets.length < 8) throw new ErreurSauvegarde("fichier trop court");
    const taille = new DataView(octets.buffer, octets.byteOffset).getInt32(0, true);
    if (taille <= 0 || taille + 4 > octets.length) throw new ErreurSauvegarde("ce n'est pas un fichier de personnage .fch");
    const l = new Lecteur(octets.subarray(4, 4 + taille));
    const version = l.i32();
    if (version < 1 || version > 1000) throw new ErreurSauvegarde("ce n'est pas un fichier de personnage .fch");
    if (version < VERSION_PROFIL_MIN) {
      throw new ErreurSauvegarde(`ce fichier est au format ${version}, plus ancien que le format ${VERSION_PROFIL_MIN} ` +
        "pris en charge. Chargez le personnage dans une version récente du jeu.");
    }
    const nbStats = l.i32(), nbJeux = l.i32();
    if (nbStats !== NB_STATS || nbJeux !== NB_JEUX) {
      throw new ErreurSauvegarde(`ce fichier contient ${nbStats} statistiques en ${nbJeux} jeux au lieu de ` +
        `${NB_STATS} en ${NB_JEUX} : le format du jeu a changé et le site doit être mis à jour.`);
    }
    const jeux = [];
    for (let i = 0; i < NB_JEUX; i++) jeux.push(lireJeuStats(l));
    const res = { version, jeux, nom: null, joueur: null, erreurJoueur: null,
      avertissement: version > VERSION_PROFIL_TESTEE
        ? `Ce fichier est au format ${version}, plus récent que le dernier testé (${VERSION_PROFIL_TESTEE}). Vérifiez que les résultats semblent justes.`
        : "" };
    try {
      l.sauter(1);                            // première apparition
      for (let n = l.compte(); n > 0; n--) {  // données par monde
        l.sauter(8 + 1 + 12 + 1 + 12 + 1 + 12 + 12);
        if (l.bool()) l.sauter(l.compte());   // carte explorée
      }
      res.nom = l.chaine();
      l.sauter(8); l.chaine(); l.sauter(1 + 8);   // identifiant, graine de départ, triche, date de création
      if (!l.bool()) throw new ErreurSauvegarde("ce personnage n'a pas encore de données de joueur.");
      const longueur = l.compte();
      res.joueur = lireJoueur(l, l.pos + longueur);
    } catch (e) {
      res.erreurJoueur = e instanceof ErreurSauvegarde ? e.message
        : "les données du joueur n'ont pas pu être lues (format inattendu).";
    }
    return res;
  } catch (e) {
    if (e instanceof ErreurSauvegarde) throw e;
    throw new ErreurSauvegarde("ce fichier n'est pas un personnage Valheim lisible, ou son format a changé.");
  }
}

if (typeof module !== "undefined") module.exports = { lireSauvegarde, ErreurSauvegarde, JEU };
