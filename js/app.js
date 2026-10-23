// Interface de la page : onglets, dépôt de fichiers et affichage des résultats de chaque outil.
"use strict";

const $ = (sel, racine = document) => racine.querySelector(sel);
const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nombre = (n) => Math.round(n).toLocaleString("fr-FR");
const pourcent = (v) => (v * 100).toFixed(1).replace(".", ",").replace(",0", "") + " %";
const comparer = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });
const erreur = (msg) => `<p class="erreur">${echapper(msg)}</p>`;

// ---------- noms ----------

// biome estimé de chaque jeton (tables de donnees.js)
const BIOME_DE = new Map([...CREATURES, ...BOSS, ...MINI_BOSS, ...POISSONS, ...TROPHEES].map(([t, , b]) => [t, b]));
const NOM_SECOURS = new Map([...CREATURES, ...BOSS, ...MINI_BOSS, ...POISSONS, ...TROPHEES].map(([t, n]) => [t, n]));
const nomJeton = (t) => JEU.noms[t] || NOM_SECOURS.get(t) || t.replace(/^\$(item|piece|enemy|animal)_/, "");
const nomPrefab = (p) => (JEU.ameliorables[p] && JEU.ameliorables[p].nom) || JEU.nomsPrefab[p] || p;

// ---------- objets améliorables ----------

const AMELIORABLES = Object.entries(JEU.ameliorables).map(([p, i]) => [p, i.nom]).sort((a, b) => comparer(a[1], b[1]));
const PAR_HACHAGE = new Map(AMELIORABLES.map(([p]) => [hachage(p), p]));
const reglesDe = (p) => ({ chance: JEU.ameliorables[p].chance, casse: JEU.ameliorables[p].casse });

$("#liste-objets").innerHTML = AMELIORABLES.map(([, nom]) => `<option value="${echapper(nom)}">`).join("");

// Retrouve un prefab à partir d'un nom français ou d'un nom de prefab (casse ignorée).
function trouverObjet(texte) {
  const t = texte.trim().toLowerCase();
  if (!t) throw new Error("indiquez un objet");
  const exact = AMELIORABLES.filter(([p, n]) => p.toLowerCase() === t || n.toLowerCase() === t);
  if (exact.length) return exact[0][0];
  const partiels = AMELIORABLES.filter(([p, n]) => p.toLowerCase().includes(t) || n.toLowerCase().includes(t));
  if (partiels.length === 1) return partiels[0][0];
  if (!partiels.length) throw new Error(`« ${texte} » n'est pas un objet améliorable`);
  throw new Error(`« ${texte} » correspond à plusieurs objets : ` + partiels.slice(0, 8).map((x) => x[1]).join(", ") + "…");
}

function qualiteValide(v, nom) {
  const q = Number(v);
  if (!Number.isInteger(q) || q < 1 || q > 65535) throw new Error(`${nom} doit être un entier entre 1 et 65 535`);
  return q;
}

// ---------- onglets ----------

const onglets = [...document.querySelectorAll('[role="tab"]')];
const panneau = (o) => document.getElementById(o.getAttribute("aria-controls"));

function choisirOnglet(onglet, majAdresse = true) {
  for (const o of onglets) {
    const actif = o === onglet;
    o.setAttribute("aria-selected", String(actif));
    o.tabIndex = actif ? 0 : -1;
    panneau(o).hidden = !actif;
  }
  onglet.scrollIntoView({ block: "nearest", inline: "nearest" });
  if (majAdresse) history.replaceState(null, "", "#" + panneau(onglet).id);
}

for (const o of onglets) o.addEventListener("click", () => choisirOnglet(o));
$(".onglets").addEventListener("keydown", (e) => {
  const i = onglets.indexOf(document.activeElement);
  const dest = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: onglets.length - 1 }[e.key];
  if (i < 0 || dest === undefined) return;
  e.preventDefault();
  const o = onglets[(dest + onglets.length) % onglets.length];
  choisirOnglet(o);
  o.focus();
});
function ouvrirAncre() {
  const o = onglets.find((x) => "#" + x.getAttribute("aria-controls") === location.hash);
  if (o) choisirOnglet(o, false);
}
window.addEventListener("hashchange", ouvrirAncre);
ouvrirAncre();

// l'aide « où est mon fichier » sous la zone de dépôt et dans son onglet
const tplAide = $("#tpl-aide");
$("#depot-global").after(tplAide.content.cloneNode(true));
const aidePage = tplAide.content.cloneNode(true);
aidePage.querySelector("details").open = true;
$("#aide-contenu").append(aidePage);

// ---------- fichier de personnage (commun à tous les onglets) ----------

// chaque outil s'inscrit ici et reçoit la sauvegarde lue une seule fois
const actionsDepot = {};
const zoneDepot = $("#depot-global");

async function chargerFichier(fichier) {
  if (!fichier) return;
  $("#perso-erreur").innerHTML = "";
  let s;
  try {
    s = lireSauvegarde(new Uint8Array(await fichier.arrayBuffer()));
  } catch (e) {
    $("#perso-erreur").innerHTML = erreur(`Lecture de ${fichier.name} impossible : ${e.message}`);
    return;
  }
  zoneDepot.hidden = true;
  const bandeau = $("#perso-charge");
  bandeau.hidden = false;
  bandeau.innerHTML = `<span>Personnage : <strong>${echapper(s.nom || fichier.name)}</strong>
    <small>(${echapper(fichier.name)})</small></span><button type="button" id="changer-perso">Changer de fichier</button>
    ${s.avertissement ? `<p class="attention">${echapper(s.avertissement)}</p>` : ""}
    ${s.erreurJoueur ? `<p class="attention">Inventaire et graines illisibles : ${echapper(s.erreurJoueur)} Seul l'onglet Succès est disponible.</p>` : ""}`;
  $("#changer-perso").addEventListener("click", () => $("input", zoneDepot).click());
  for (const action of Object.values(actionsDepot)) action(s);
}

const entreeFichier = $("input", zoneDepot);
entreeFichier.addEventListener("change", () => { chargerFichier(entreeFichier.files[0]); entreeFichier.value = ""; });
// on peut déposer le fichier n'importe où sur la page
document.addEventListener("dragover", (e) => { e.preventDefault(); zoneDepot.classList.add("survol"); });
document.addEventListener("dragleave", (e) => { if (!e.relatedTarget) zoneDepot.classList.remove("survol"); });
document.addEventListener("drop", (e) => {
  e.preventDefault();
  zoneDepot.classList.remove("survol");
  chargerFichier(e.dataTransfer.files[0]);
});

// message affiché dans un onglet tant qu'aucun fichier n'est chargé
const SANS_FICHIER = `<p class="aide-petite">Chargez votre fichier de personnage en haut de la page.</p>`;
for (const id of ["#succes-resultat", "#predicteur-resultat"]) $(id).innerHTML = SANS_FICHIER;

// ---------- succès ----------

let sauvegardeSucces = null;
const selBiome = $("#succes-biome");
selBiome.innerHTML = BIOMES.map((b, i) => `<option value="${i}">${b}</option>`).join("");
selBiome.value = String(BIOMES.length - 1);
selBiome.addEventListener("change", afficherSucces);
$("#succes-tout").addEventListener("change", afficherSucces);

actionsDepot.succes = (s) => {
  sauvegardeSucces = s;
  $("#succes-options").hidden = false;
  afficherSucces();
};

// Chaque liste : éléments { cle, nom, biome?, detail? } et `fait` qui donne le compteur de chaque clé.
function listesSucces(s) {
  const tous = s.jeux[JEU_STATS.tous], normal = s.jeux[JEU_STATS.normal], difficile = s.jeux[JEU_STATS.difficile];
  const L = JEU.listes;
  const jetons = (liste, detail) => liste.map((t) => ({ cle: t, nom: nomJeton(t), biome: BIOME_DE.get(t), detail: detail && detail(t) }));
  const station = (t) => JEU.stations.objets[t] && nomJeton(JEU.stations.objets[t]);
  const stationPiece = (t) => JEU.stations.pieces[t] && nomJeton(JEU.stations.pieces[t]);
  const stats = (table) => table.map(([i, nom, b]) => ({ cle: i, nom, biome: b }));
  const parStat = { get: (i) => tous.stats[i] };
  return [
    { titre: "Boss vaincus (toutes difficultés)", liste: jetons(L.boss), fait: tous.tues },
    { titre: "Boss vaincus (Normal ou plus)", liste: jetons(L.boss), fait: normal.tues },
    { titre: "Boss vaincus (Difficile)", liste: jetons(L.boss), fait: difficile.tues },
    { titre: "Mini-boss vaincus", liste: jetons(L.miniboss), fait: tous.tues },
    { titre: "Créatures tuées (toutes difficultés)", liste: jetons(L.creatures), fait: tous.tues, note: "Les boss sont comptés à part." },
    { titre: "Créatures tuées (Difficile)", liste: jetons(L.creatures), fait: difficile.tues },
    { titre: "Trophées ramassés", liste: jetons(L.trophees), fait: tous.ramasses,
      note: "Un trophée compte quand il est ramassé. Ceux obtenus avant le suivi des succès doivent parfois être ramassés à nouveau." },
    { titre: "Poissons pêchés", liste: jetons(POISSONS.map((p) => p[0])), fait: tous.cueillis,
      note: "Il faut remonter le poisson à la canne : le ramasser au sol ne compte pas." },
    { titre: "Façons de mourir", liste: stats(MORTS), fait: parStat },
    { titre: "Tué par chaque variété d'arbre", liste: stats(MORTS_ARBRE), fait: parStat },
    { titre: "Objets fabriqués", liste: jetons(L.fabriques, station), fait: tous.fabriques,
      note: "Recettes qui demandent une station de fabrication." },
    { titre: "Armes fabriquées", liste: jetons(L.armes, station), fait: tous.fabriques, note: "Les armes faites à la main comptent." },
    { titre: "Plats cuisinés", liste: jetons(L.cuisines, station), fait: tous.fabriques,
      note: "Chaudron, table de préparation, feu de cuisson et four." },
    { titre: "Aliments goûtés (Le Gourmet)", liste: jetons(L.manges), fait: tous.manges,
      note: "Chaque aliment une fois. Les versions crue et cuite sont des aliments différents." },
    { titre: "Pièces construites", liste: jetons(L.construits, stationPiece), fait: tous.construits, note: "Pièces du menu du marteau." },
  ];
}

// Succès à paliers (Survie, Bûcheronnage…) : une statistique du fichier à amener jusqu'à un seuil.
const STAT_SURVIE = 129;     // jours consécutifs sans mourir (succès « Survie », 30 jours)
function paliersHtml(s) {
  const ligne = (a) => {
    const stats = s.jeux[a.difficulte] ? s.jeux[a.difficulte].stats : s.jeux[JEU_STATS.tous].stats;
    const parts = a.seuils.map(([i, seuil]) => ({ v: Math.max(0, stats[i]), seuil }));
    const fait = parts.every((x) => x.v >= x.seuil);
    const ratio = Math.min(1, ...parts.map((x) => x.v / x.seuil));
    // plusieurs seuils : chaque compteur, sauf s'il ne s'agit que de cases à cocher (seuils de 1)
    const detail = parts.length > 1 && parts.every((x) => x.seuil === 1)
      ? `${parts.filter((x) => x.v >= x.seuil).length} / ${parts.length} conditions`
      : parts.map((x) => `${nombre(Math.min(x.v, x.seuil))} / ${nombre(x.seuil)}`).join(" · ");
    return { a, fait, ratio, detail, parts };
  };
  const lignes = JEU.succesStats.map(ligne);
  const survie = lignes.find((l) => l.a.seuils.length === 1 && l.a.seuils[0][0] === STAT_SURVIE);
  let html = "";
  if (survie) {
    const v = Math.floor(survie.parts[0].v), seuil = survie.parts[0].seuil;
    html += `<div class="resume survie"><p><strong>${echapper(survie.a.nom)}</strong> : ${survie.fait ? "succès obtenu ✔"
      : `<strong>${v}</strong> jour(s) d'affilée sans mourir, encore <strong>${seuil - v}</strong> jour(s) pour atteindre ${seuil}`}</p>
      <progress max="1" value="${survie.ratio}"></progress>
      <p class="aide-petite">Le compteur repart de zéro à chaque mort. Valeur lue à la dernière sauvegarde du personnage.</p></div>`;
  }
  const autres = lignes.filter((l) => l !== survie).sort((x, y) => x.fait - y.fait || y.ratio - x.ratio);
  const faits = autres.filter((l) => l.fait).length;
  html += `<details class="section-succes" open><summary><span>Succès à paliers</span>
    <span class="compteur ${faits === autres.length ? "complet" : ""}">${faits} / ${autres.length}</span></summary>
    <ul class="liste paliers">${autres.filter((l) => !l.fait || $("#succes-tout").checked).map((l) => `<li class="${l.fait ? "fait" : ""}">
      <span>${l.fait ? "✔" : "○"} ${echapper(l.a.nom)}</span><span class="biome">${l.detail}</span>
      <progress max="1" value="${l.ratio}"></progress></li>`).join("")}</ul></details>`;
  return html;
}

function afficherSucces() {
  const s = sauvegardeSucces;
  if (!s) return;
  const biomeMax = Number(selBiome.value);
  const toutAfficher = $("#succes-tout").checked;
  const mondes = [...s.jeux[0].mondes.keys()];
  let html = `<div class="resume"><p><strong>${echapper(s.nom || "Personnage")}</strong> · format ${s.version}` +
    (mondes.length ? ` · mondes : ${mondes.map(echapper).join(", ")}` : "") + "</p>" +
    (s.avertissement ? `<p class="attention">${echapper(s.avertissement)}</p>` : "") + "</div>";

  html += paliersHtml(s);

  for (const sec of listesSucces(s)) {
    const entrees = sec.liste.map((e) => ({ ...e, n: sec.fait.get(e.cle) || 0 }));
    const faits = entrees.filter((e) => e.n > 0).length;
    const loin = (e) => e.biome !== undefined && e.biome > biomeMax;
    const visibles = entrees.filter((e) => !loin(e) && (toutAfficher || e.n === 0))
      .sort((a, b) => (a.biome ?? 99) - (b.biome ?? 99) || comparer(a.nom, b.nom));
    const masques = entrees.filter((e) => e.n === 0 && loin(e)).length;
    html += `<details class="section-succes" ${faits < entrees.length && entrees.length <= 20 ? "open" : ""}>
      <summary><span>${sec.titre}</span><span class="compteur ${faits === entrees.length ? "complet" : ""}">${faits} / ${entrees.length}</span></summary>
      ${sec.note ? `<p class="aide-petite">${sec.note}</p>` : ""}
      ${visibles.length ? `<ul class="liste">${visibles.map((e) => `<li class="${e.n ? "fait" : ""}">
        <span>${e.n ? "✔" : "○"} ${echapper(e.nom)}${e.n ? ` <small>×${nombre(e.n)}</small>` : ""}</span>
        <span class="biome">${e.biome !== undefined ? BIOMES[e.biome] : e.detail ? echapper(e.detail) : ""}</span></li>`).join("")}</ul>`
        : `<p class="aide-petite">${faits === entrees.length ? "Tout est fait !" : "Rien de plus à faire jusqu'à ce biome."}</p>`}
      ${masques ? `<p class="aide-petite">${masques} élément(s) plus loin que ${BIOMES[biomeMax]} sont masqués.</p>` : ""}
    </details>`;
  }
  $("#succes-resultat").innerHTML = html;
}

// ---------- prédicteur ----------

function etapesHtml(etapes) {
  return `<ol class="etapes">${etapes.map((e) => `<li class="${e.issue}" title="tirage ${pourcent(e.valeur)}${e.enregistree ? " (graine enregistrée)" : ""}">
    ${e.issue === "reussite" ? "▲" : e.issue === "casse" ? "✖" : "▼"} ${e.issue === "echec" ? e.vers - 2 : e.vers}</li>`).join("")}</ol>`;
}

// La Forge du potentiel n'accepte un objet qu'au maximum de sa station : en dessous, on l'y monte d'abord, sans risque.
const plafondDe = (p) => JEU.ameliorables[p].plafond;
function simulerForge(p, qualite, nom, graines = new Map()) {
  const depart = Math.max(qualite, plafondDe(p));
  const sim = simuler(p, depart, nom, graines, { regles: reglesDe(p) });
  if (depart > qualite) sim.station = { de: qualite, nom: JEU.ameliorables[p].station || "la station" };
  return sim;
}

function conseil(sim) {
  if (sim.pic === sim.depart) return sim.casse ? "casse sans progresser" : "aucun gain";
  return `<strong>q${sim.pic}</strong> après ${sim.picApres} tentative(s)`;
}

function ligneSimulation(sim, extra = "") {
  const avant = sim.station ? `<br><small class="aide-petite">q${sim.station.de} → q${sim.depart} à : ${echapper(sim.station.nom)}, sans risque</small>` : "";
  return `<tr><td>${echapper(nomPrefab(sim.prefab))}${extra}</td><td class="num">${sim.station ? `${sim.station.de} → ` : ""}${sim.depart}${avant}</td>
    <td class="num">${conseil(sim)}</td>
    <td class="num">${sim.casse ? `casse après ${sim.etapes.length} tentative(s)` : `ne casse pas en ${sim.etapes.length}`}</td>
    <td>${etapesHtml(sim.etapes)}</td></tr>`;
}

const enteteTableau = `<table class="tableau"><thead><tr><th>Objet</th><th>Qualité à la Forge</th><th>S'arrêter à</th><th>Issue si on continue</th><th>Déroulé</th></tr></thead><tbody>`;
const legende = `<p class="legende">▲ réussite (niveau atteint) · ▼ échec, l'objet perd un niveau · ✖ l'objet est détruit.
  Survolez une étape pour voir le tirage. « S'arrêter à » est le meilleur niveau atteint avant la casse.
  La Forge du potentiel n'accepte un objet qu'au maximum de sa station : un objet en dessous y est d'abord monté, sans tirage.</p>`;

actionsDepot.predicteur = (s) => {
  const cible = $("#predicteur-resultat");
  if (!s.joueur) { cible.innerHTML = erreur(s.erreurJoueur); return; }
  const sims = s.joueur.inventaire.filter((o) => PAR_HACHAGE.has(o.prefab)).map((o) => {
    const p = PAR_HACHAGE.get(o.prefab);
    return { sim: simulerForge(p, o.qualite, s.nom, s.joueur.graines), objet: o };
  }).sort((a, b) => (b.sim.pic - b.sim.depart) - (a.sim.pic - a.sim.depart) || comparer(nomPrefab(a.sim.prefab), nomPrefab(b.sim.prefab)));

  let html = `<div class="resume"><p><strong>${echapper(s.nom)}</strong> · ${nombre(s.joueur.graines.size)} graine(s) d'amélioration enregistrée(s)</p></div>`;
  if (!sims.length) html += `<p>Aucun objet améliorable dans l'inventaire.</p>`;
  else {
    html += enteteTableau + sims.map(({ sim, objet }) =>
      ligneSimulation(sim, (objet.equipe ? ' <small class="pastille">équipé</small>' : "") + (objet.pile > 1 ? ` <small>×${objet.pile}</small>` : ""))).join("") + "</tbody></table>";
  }
  html += legende + `<p><button type="button" id="predire-tout">Voir tous les objets améliorables pour ce personnage (depuis le maximum de leur station)</button></p>
    <div id="predire-tout-resultat"></div>`;
  cible.innerHTML = html;
  $("#predire-tout").addEventListener("click", () => {
    const toutes = AMELIORABLES.map(([p]) => simulerForge(p, 1, s.nom, s.joueur.graines))
      .sort((a, b) => b.pic - a.pic || comparer(nomPrefab(a.prefab), nomPrefab(b.prefab)));
    $("#predire-tout-resultat").innerHTML = enteteTableau + toutes.map((x) => ligneSimulation(x)).join("") + "</tbody></table>";
  });
};

$("#form-prediction").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target), cible = $("#prediction-resultat");
  try {
    const prefab = trouverObjet(f.get("objet"));
    const nom = f.get("nom");
    if (!nom) throw new Error("indiquez un nom de personnage");
    const sim = simulerForge(prefab, qualiteValide(f.get("qualite"), "La qualité"), nom);
    cible.innerHTML = `<p>Pour un nouveau personnage nommé <strong>${echapper(nom)}</strong> :</p>` + enteteTableau + ligneSimulation(sim) + "</tbody></table>" + legende;
  } catch (err) {
    cible.innerHTML = erreur(err.message);
  }
});

// ---------- recherches en arrière-plan ----------

const BUDGET = 8_000_000;

// Lance une recherche dans un worker. Renvoie une fonction qui l'arrête.
function lancerWorker(message, { progression, fin, echec }) {
  const w = new Worker("js/worker-noms.js");
  w.onmessage = (e) => {
    const d = e.data;
    if (d.type === "progression") progression(d);
    else { w.terminate(); d.type === "fin" ? fin(d) : echec(d.message); }
  };
  w.onerror = (e) => { w.terminate(); echec(e.message || "erreur dans la recherche"); };
  w.postMessage(message);
  return () => w.terminate();
}

// ---------- chercheur de noms ----------

let arreterNoms = null;

function rechercherNoms(params) {
  const cible = $("#noms-resultat"), boutonStop = $("#noms-stop");
  const titre = `${echapper(nomPrefab(params.prefab))}, qualité ${params.qualite} : ` +
    (params.mode === "exact" ? `exactement ${params.cible} réussite(s) puis un raté` : `au moins ${params.cible} réussite(s) d'affilée`);
  const zoneProg = document.createElement("p");
  zoneProg.className = "progression";
  zoneProg.textContent = "Recherche en cours…";
  cible.prepend(zoneProg);
  boutonStop.hidden = false;
  arreterNoms = lancerWorker({ type: "noms", ...params }, {
    progression: (d) => { zoneProg.textContent = `Recherche en cours… ${nombre(d.essais)} noms essayés`; },
    fin: (d) => {
      boutonStop.hidden = true;
      const suite = d.noms.length ? { ...params, apres: d.noms[d.noms.length - 1].nom } : null;
      const bloc = document.createElement("div");
      bloc.className = "bloc-resultat";
      bloc.innerHTML = `<p><strong>${titre}</strong> : ${d.noms.length} nom(s) sur ${nombre(d.essais)} essayés.
        ${d.epuise ? "Limite d'essais atteinte." : ""}</p>
        ${d.noms.length ? `<table class="tableau"><thead><tr><th>Nom</th><th>Meilleur niveau</th><th>Si on continue</th></tr></thead><tbody>
          ${d.noms.map((n) => `<tr><td><code>${echapper(n.nom)}</code></td><td class="num">q${n.pic} après ${n.picApres} tentative(s)</td>
          <td class="num">${n.casse ? `casse à la ${n.tentatives}e tentative` : "ne casse pas"}</td></tr>`).join("")}</tbody></table>` : ""}
        ${suite ? `<button type="button" class="continuer">Continuer la recherche</button>` : ""}`;
      zoneProg.replaceWith(bloc);
      const btn = $(".continuer", bloc);
      if (btn) btn.addEventListener("click", () => { btn.remove(); rechercherNoms(suite); });
    },
    echec: (msg) => { boutonStop.hidden = true; zoneProg.outerHTML = erreur(msg); },
  });
}

$("#form-noms").addEventListener("submit", (e) => {
  e.preventDefault();
  if (arreterNoms) arreterNoms();
  const f = new FormData(e.target);
  $("#noms-resultat").innerHTML = "";
  try {
    const prefab = trouverObjet(f.get("objet"));
    const qualite = qualiteValide(f.get("qualite"), "La qualité de départ");
    const depart = Math.max(qualite, plafondDe(prefab));
    if (depart > qualite) $("#noms-resultat").innerHTML = `<p class="aide-petite">La Forge n'accepte cet objet qu'à partir de q${depart}
      (maximum à ${echapper(JEU.ameliorables[prefab].station || "sa station")}) : montez-le d'abord jusque-là, la recherche part de q${depart}.</p>`;
    rechercherNoms({
      prefab, qualite: depart, regles: reglesDe(prefab),
      cible: Number(f.get("cible")), mode: f.get("mode"), alphabet: f.get("alphabet"),
      longueurMin: 3, longueurMax: 15, limite: Math.min(100, Math.max(1, Number(f.get("limite")) || 10)),
      budget: BUDGET, apres: null,
    });
  } catch (err) {
    $("#noms-resultat").innerHTML = erreur(err.message);
  }
});
$("#noms-stop").addEventListener("click", () => {
  if (arreterNoms) arreterNoms();
  $("#noms-stop").hidden = true;
  const p = $("#noms-resultat .progression");
  if (p) p.textContent = "Recherche arrêtée.";
});

// ---------- relais ----------

let arreterRelais = null;

$("#form-relais").addEventListener("submit", (e) => {
  e.preventDefault();
  if (arreterRelais) arreterRelais();
  const f = new FormData(e.target), cible = $("#relais-resultat"), boutonStop = $("#relais-stop");
  try {
    const prefab = trouverObjet(f.get("objet"));
    const actuelle = qualiteValide(f.get("depart"), "La qualité actuelle");
    const arrivee = qualiteValide(f.get("arrivee"), "La qualité visée");
    if (arrivee <= actuelle) throw new Error("la qualité visée doit être supérieure à la qualité actuelle");
    const plafond = plafondDe(prefab), station = JEU.ameliorables[prefab].station || "sa station";
    if (arrivee <= plafond) throw new Error(`pas besoin de la Forge : q${arrivee} s'obtient sans risque à ${station} (jusqu'à q${plafond})`);
    const depart = Math.max(actuelle, plafond);
    const avant = depart > actuelle ? `<li>Montez d'abord l'objet de q${actuelle} à <strong>q${depart}</strong> à ${echapper(station)}, sans risque.</li>` : "";
    cible.innerHTML = `<p class="progression">Recherche du premier personnage…</p>`;
    boutonStop.hidden = false;
    arreterRelais = lancerWorker({ type: "relais", prefab, depart, arrivee, regles: reglesDe(prefab), alphabet: "lettres", budget: BUDGET }, {
      progression: (d) => { $(".progression", cible).textContent = `${d.etape} personnage(s) trouvé(s), qualité ${d.niveau} atteinte…`; },
      fin: (d) => {
        boutonStop.hidden = true;
        cible.innerHTML = `<p><strong>${echapper(nomPrefab(prefab))}</strong> de la qualité ${depart} à ${arrivee} :
          ${d.plan.length} personnage(s).</p>
          <ol class="plan">${avant}${d.plan.map((p) => `<li>Créez <code>${echapper(p.nom)}</code> et améliorez l'objet de ${p.de} à <strong>${p.a}</strong>
            (${p.a - p.de} tentative(s), toutes réussies), puis arrêtez et transmettez l'objet.</li>`).join("")}</ol>
          <p class="aide-petite">Chaque personnage doit être neuf (jamais utilisé à la Forge) et ne doit pas tenter
          d'amélioration au-delà de l'étape indiquée : la suivante pourrait faire perdre un niveau ou détruire l'objet.</p>`;
      },
      echec: (msg) => { boutonStop.hidden = true; cible.innerHTML = erreur(msg); },
    });
  } catch (err) {
    cible.innerHTML = erreur(err.message);
  }
});
$("#relais-stop").addEventListener("click", () => {
  if (arreterRelais) arreterRelais();
  $("#relais-stop").hidden = true;
  $("#relais-resultat").innerHTML = "<p>Recherche arrêtée.</p>";
});

// ---------- coût d'amélioration ----------

let persoCout = null;     // { nom, graines } lus dans un fichier

actionsDepot.cout = (s) => {
  const cible = $("#cout-resultat");
  if (!s.joueur) { cible.innerHTML = erreur(s.erreurJoueur); return; }
  persoCout = { nom: s.nom, graines: s.joueur.graines };
  $("#form-cout").nom.value = s.nom;
  cible.innerHTML = `<p>Personnage <strong>${echapper(s.nom)}</strong> chargé (${nombre(s.joueur.graines.size)} graine(s) enregistrée(s)).</p>`;
};

function tableauMatieres(depense, rendu) {
  const cles = [...new Set([...depense.keys(), ...rendu.keys()])]
    .sort((a, b) => (depense.get(b) || 0) - (depense.get(a) || 0));
  return `<table class="tableau"><thead><tr><th>Matériau</th><th>Dépensé</th><th>Rendu à la casse</th><th>Coût net</th></tr></thead><tbody>
    ${cles.map((p) => `<tr><td>${echapper(nomPrefab(p))}</td><td class="num">${nombre(depense.get(p) || 0)}</td>
      <td class="num">${rendu.get(p) ? nombre(rendu.get(p)) : "—"}</td><td class="num"><strong>${nombre((depense.get(p) || 0) - (rendu.get(p) || 0))}</strong></td></tr>`).join("")}
    </tbody></table>`;
}

$("#form-cout").addEventListener("submit", (e) => {
  e.preventDefault();
  const f = new FormData(e.target), cible = $("#cout-resultat");
  try {
    const prefab = trouverObjet(f.get("objet"));
    const info = JEU.ameliorables[prefab];
    const cibleQ = qualiteValide(f.get("cible"), "La qualité visée");
    if (cibleQ < 2) throw new Error("la qualité visée doit être au moins 2");
    const nom = (f.get("nom") || "").trim();
    if (!nom) throw new Error("indiquez un nom de personnage ou déposez son fichier");
    const graines = persoCout && persoCout.nom === nom ? persoCout.graines : new Map();
    const r = simulerCout(prefab, cibleQ, nom, graines);
    if (r.abandon) throw new Error(`abandon après ${nombre(r.copies)} copies et ${nombre(r.essais)} tentatives`);
    cible.innerHTML = `<div class="resume">
        <p><strong>${echapper(info.nom)}</strong> jusqu'à la qualité ${cibleQ} pour <strong>${echapper(nom)}</strong>
          ${graines.size ? "(avec ses graines enregistrées)" : "(personnage neuf)"}</p>
        <p>${r.copies} copie(s) fabriquée(s), ${r.cassees} détruite(s) · ${nombre(r.essais)} tentative(s) à la Forge du potentiel ·
          station : ${echapper(info.station || "aucune")}, améliorable sans risque jusqu'à q${info.plafond}</p>
        ${info.actif ? "" : `<p class="attention">La recette de cet objet est désactivée dans le jeu (objet saisonnier ou retiré) : le calcul suppose qu'on peut le fabriquer.</p>`}
        ${info.moulage ? `<p class="aide-petite">Objet moulé : chaque copie coûte le moule et ${info.moulage.parMoule} ${echapper(nomPrefab(info.moulage.carburant))} à la fonderie.</p>` : ""}
      </div>` + tableauMatieres(r.depense, r.rendu) +
      `<details><summary>Détail des copies</summary><ol>${r.journal.map((c) =>
        `<li>meilleur niveau q${c.pic}, ${c.tentatives} tentative(s) à la Forge — ${c.cassee ? "détruite" : `<strong>q${c.niveau} atteinte</strong>`}</li>`).join("")}</ol></details>
      <p class="aide-petite">Chances de cet objet : réussite ${pourcent(info.chance)}, puis destruction ${pourcent(info.casse)} des tirages ratés ;
        à la casse, ${pourcent(info.retour)} des ingrédients récupérables sont rendus. Une idole est consommée à chaque tentative.</p>`;
  } catch (err) {
    cible.innerHTML = erreur(err.message);
  }
});

// ---------- compteurs de butin ----------

const LIGNES_BUTIN = lignesButin();
const LIGNES_PAR_CLE = new Map();
for (const l of LIGNES_BUTIN) {
  if (!LIGNES_PAR_CLE.has(l.cle)) LIGNES_PAR_CLE.set(l.cle, []);
  LIGNES_PAR_CLE.get(l.cle).push(l);
}
let compteursButin = null;

actionsDepot.butins = (s) => {
  if (!s.joueur) { $("#butins-resultat").innerHTML = erreur(s.erreurJoueur); return; }
  compteursButin = { nom: s.nom, compteurs: s.joueur.compteurs };
  afficherButins();
};
$("#butins-filtre").addEventListener("input", afficherButins);
$("#butins-tri").addEventListener("change", afficherButins);

const sansAccents = (t) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const etiquette = (l) => echapper(l.nomCreature) + (l.etoiles === null ? "" : ` ${"★".repeat(l.etoiles) || "0★"}`);

function afficherButins() {
  const filtres = sansAccents($("#butins-filtre").value).split(",").map((t) => t.trim()).filter(Boolean);
  const correspond = (l) => !filtres.length || filtres.some((f) =>
    sansAccents(l.nomCreature).includes(f) || sansAccents(nomPrefab(l.objet)).includes(f) || l.creature.toLowerCase().includes(f) || l.objet.toLowerCase().includes(f));
  // une entrée par compteur (objet + chance finale), avec les créatures qui le partagent
  const groupes = [...LIGNES_PAR_CLE.entries()].map(([cle, lignes]) => ({ cle, lignes, objet: lignes[0].objet, chance: lignes[0].chance, k: lignes[0].k,
    reste: compteursButin ? compteursButin.compteurs.get(cle) : undefined }))
    .filter((g) => g.lignes.some(correspond));
  const tri = $("#butins-tri").value;
  groupes.sort((a, b) => tri === "proche" && compteursButin
    ? ((a.reste ?? 1e9) - (b.reste ?? 1e9)) || comparer(nomPrefab(a.objet), nomPrefab(b.objet))
    : comparer(nomPrefab(a.objet), nomPrefab(b.objet)) || a.chance - b.chance);
  const prochain = (g) => g.reste === undefined ? `<span class="aide-petite">pas encore de compteur : au plus tard à la ${g.k}e mise à mort</span>`
    : `<strong>${g.reste <= 1 ? "la prochaine" : `la ${g.reste}e`}</strong> mise à mort`;
  let html = compteursButin ? `<div class="resume"><p><strong>${echapper(compteursButin.nom)}</strong> · ${compteursButin.compteurs.size} compteur(s) enregistré(s)</p></div>` : "";
  html += `<table class="tableau"><thead><tr><th>Objet</th><th>Chance</th><th>Créatures (étoiles)</th>${compteursButin ? "<th>Tombera à</th>" : "<th>Au plus tard</th>"}</tr></thead><tbody>
    ${groupes.map((g) => `<tr><td>${echapper(nomPrefab(g.objet))}</td><td class="num">${pourcent(g.chance)}</td>
      <td>${(() => { const e = [...new Set(g.lignes.map(etiquette))];
        return e.slice(0, 4).join(", ") + (e.length > 4 ? ` <small>et ${e.length - 4} autre(s)</small>` : ""); })()}</td>
      <td>${compteursButin ? prochain(g) : `${g.k}e mise à mort`}</td></tr>`).join("")}
    </tbody></table>
    <p class="aide-petite">Les créatures hors boss sont listées de 0 à 2 étoiles. Après chaque butin, le compteur repart d'un nombre
      aléatoire entre 0 et l'intervalle + 1. En multijoueur, c'est le compteur du joueur qui contrôle la créature qui compte.
      La clé de monde « NoPseudoDrops » désactive ce système.</p>`;
  if (compteursButin) {
    const inconnus = [...compteursButin.compteurs.keys()].filter((k) => !LIGNES_PAR_CLE.has(k)).length;
    if (inconnus) html += `<p class="aide-petite">${inconnus} compteur(s) du fichier ne correspondent à aucun butin connu (mod ou autre version du jeu).</p>`;
  }
  $("#butins-resultat").innerHTML = html;
}
afficherButins();

// ---------- idoles ----------

// idole -> objets qu'elle améliore (chaque recette d'amélioration en demande une)
const IDOLES = new Map();
for (const [p, info] of Object.entries(JEU.ameliorables)) {
  const r = info.res.find((x) => x[3]);
  if (!r) continue;
  if (!IDOLES.has(r[0])) IDOLES.set(r[0], []);
  IDOLES.get(r[0]).push(p);
}
// ordre : par palier (le chiffre du prefab, ex. Upgrader4Armor), protection avant combat
const palier = (p) => Number((p.match(/\d+/) || [99])[0]);
const ORDRE_IDOLES = [...IDOLES.keys()].sort((a, b) => palier(a) - palier(b) || (/Armor/.test(b) - /Armor/.test(a)));
function nomIdole(p) {
  const brut = nomPrefab(p);
  const type = /Armor/.test(p) ? "Protection" : "Combat";
  const matiere = brut.replace(/\s*(Protection|Combat)\s*Idole\s*$/i, "").trim();
  return matiere && matiere !== brut ? `Idole de ${type.toLowerCase()} — ${matiere}` : brut;
}

const selIdole = $("#idoles-choix");
selIdole.innerHTML = `<option value="">Toutes les idoles</option>` +
  ORDRE_IDOLES.map((p) => `<option value="${p}">${echapper(nomIdole(p))} (${IDOLES.get(p).length})</option>`).join("");
let inventaireIdoles = null;    // { nom, parHachage: Map hachage -> [objets de l'inventaire] }

actionsDepot.idoles = (s) => {
  if (!s.joueur) { inventaireIdoles = null; afficherIdoles(); return; }
  const parHachage = new Map();
  for (const o of s.joueur.inventaire) {
    if (!parHachage.has(o.prefab)) parHachage.set(o.prefab, []);
    parHachage.get(o.prefab).push(o);
  }
  inventaireIdoles = { nom: s.nom, parHachage };
  // par défaut, l'idole la plus utile : celle qui sert au plus d'objets de l'inventaire
  const utile = ORDRE_IDOLES.map((p) => [p, IDOLES.get(p).filter((x) => parHachage.has(hachage(x))).length]).sort((a, b) => b[1] - a[1])[0];
  if (utile && utile[1] && !selIdole.value) selIdole.value = utile[0];
  afficherIdoles();
};
for (const el of [selIdole, $("#idoles-filtre"), $("#idoles-miens")]) el.addEventListener(el.tagName === "INPUT" && el.type === "search" ? "input" : "change", afficherIdoles);

function afficherIdoles() {
  const filtre = sansAccents($("#idoles-filtre").value.trim());
  const miens = $("#idoles-miens").checked;
  const inv = inventaireIdoles;
  const possede = (p) => (inv && inv.parHachage.get(hachage(p))) || [];
  const choix = selIdole.value ? [selIdole.value] : ORDRE_IDOLES;
  let html = "";
  if (inv) {
    const mesIdoles = ORDRE_IDOLES.map((p) => [p, possede(p).reduce((n, o) => n + o.pile, 0)]).filter(([, n]) => n);
    html += `<div class="resume"><p><strong>${echapper(inv.nom)}</strong> · idoles dans l'inventaire : ${mesIdoles.length
      ? mesIdoles.map(([p, n]) => `${echapper(nomIdole(p))} ×${n}`).join(", ") : "aucune"}</p></div>`;
  }
  for (const idole of choix) {
    const objets = IDOLES.get(idole).map((p) => ({ p, info: JEU.ameliorables[p], miens: possede(p) }))
      .filter((o) => (!filtre || sansAccents(o.info.nom).includes(filtre) || o.p.toLowerCase().includes(filtre)) && (!miens || o.miens.length))
      .sort((a, b) => (b.miens.length > 0) - (a.miens.length > 0) || comparer(a.info.nom, b.info.nom));
    if (!objets.length && (filtre || miens)) continue;
    const stock = possede(idole).reduce((n, o) => n + o.pile, 0);
    html += `<details class="section-succes" ${choix.length === 1 || objets.some((o) => o.miens.length) ? "open" : ""}>
      <summary><span>${echapper(nomIdole(idole))}</span><span class="compteur">${inv ? `${stock} en stock · ` : ""}${objets.length} objet(s)</span></summary>
      <table class="tableau"><thead><tr><th>Objet</th><th>Station</th><th>Sans risque jusqu'à</th>${inv ? "<th>Dans l'inventaire</th>" : ""}</tr></thead><tbody>
      ${objets.map((o) => `<tr><td>${echapper(o.info.nom)}${o.info.actif ? "" : ' <small class="aide-petite">(recette désactivée)</small>'}</td>
        <td>${echapper(o.info.station || "à la main")}</td><td class="num">q${o.info.plafond}</td>
        ${inv ? `<td>${o.miens.length ? o.miens.map((x) => `<span class="pastille">q${x.qualite}${x.equipe ? " équipé" : ""}</span>`).join(" ") : ""}</td>` : ""}</tr>`).join("")}
      </tbody></table></details>`;
  }
  $("#idoles-resultat").innerHTML = html || `<p class="aide-petite">Aucun objet ne correspond.</p>`;
}
afficherIdoles();
