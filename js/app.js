// Interface de la page : onglets, dépôt de fichiers et affichage des résultats de chaque outil.
"use strict";

const $ = (sel, racine = document) => racine.querySelector(sel);
const echapper = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nombre = (n) => n.toLocaleString("fr-FR");
const pourcent = (v) => (v * 100).toFixed(2).replace(".", ",") + " %";
const comparer = (a, b) => a.localeCompare(b, "fr", { sensitivity: "base" });

// ---------- objets améliorables ----------

const NOM_OBJET = new Map(AMELIORABLES);                                       // prefab -> nom français
const PAR_HACHAGE = new Map(AMELIORABLES.map(([p]) => [hachage(p), p]));       // hachage -> prefab

$("#liste-objets").innerHTML = [...AMELIORABLES].sort((a, b) => comparer(a[1], b[1]))
  .map(([, nom]) => `<option value="${echapper(nom)}">`).join("");

// Retrouve un prefab à partir d'un nom français ou d'un nom de prefab (casse ignorée).
function trouverObjet(texte) {
  const t = texte.trim().toLowerCase();
  if (!t) throw new Error("indiquez un objet");
  const exact = AMELIORABLES.find(([p, n]) => p.toLowerCase() === t || n.toLowerCase() === t);
  if (exact) return exact[0];
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

const erreur = (msg) => `<p class="erreur">${echapper(msg)}</p>`;

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

// l'aide « où est mon fichier » sous chaque zone de dépôt et dans son onglet
const tplAide = $("#tpl-aide");
for (const zone of document.querySelectorAll(".depot")) zone.after(tplAide.content.cloneNode(true));
const aidePage = tplAide.content.cloneNode(true);
aidePage.querySelector("details").open = true;
$("#aide-contenu").append(aidePage);

// ---------- dépôt de fichiers ----------

const actionsDepot = {};

for (const zone of document.querySelectorAll(".depot")) {
  const entree = $("input", zone);
  const lire = async (fichier) => {
    if (!fichier) return;
    zone.querySelector("span").textContent = `Fichier : ${fichier.name}`;
    const octets = new Uint8Array(await fichier.arrayBuffer());
    actionsDepot[zone.dataset.depot](octets, fichier.name);
  };
  entree.addEventListener("change", () => lire(entree.files[0]));
  zone.addEventListener("dragover", (e) => { e.preventDefault(); zone.classList.add("survol"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("survol"));
  zone.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("survol");
    lire(e.dataTransfer.files[0]);
  });
}

function lireOuErreur(octets, cible) {
  try {
    return lireSauvegarde(octets);
  } catch (e) {
    cible.innerHTML = erreur("Lecture impossible : " + e.message);
    return null;
  }
}

// ---------- succès ----------

let sauvegardeSucces = null;
const selBiome = $("#succes-biome");
selBiome.innerHTML = BIOMES.map((b, i) => `<option value="${i}">${b}</option>`).join("");
selBiome.value = String(BIOMES.length - 1);
selBiome.addEventListener("change", afficherSucces);
$("#succes-tout").addEventListener("change", afficherSucces);

actionsDepot.succes = (octets) => {
  sauvegardeSucces = lireOuErreur(octets, $("#succes-resultat"));
  $("#succes-options").hidden = !sauvegardeSucces;
  if (sauvegardeSucces) afficherSucces();
};

// Les listes de succès : chaque élément est [clé, nom, biome] et `fait` donne le compteur de chaque clé.
function listesSucces(s) {
  const tous = s.jeux[JEU.tous], normal = s.jeux[JEU.normal], difficile = s.jeux[JEU.difficile];
  const parStat = (table) => table.map(([i, nom, b]) => [i, nom, b]);
  return [
    { titre: "Boss vaincus (toutes difficultés)", liste: BOSS, fait: tous.tues },
    { titre: "Boss vaincus (Normal ou plus)", liste: BOSS, fait: normal.tues },
    { titre: "Boss vaincus (Difficile)", liste: BOSS, fait: difficile.tues },
    { titre: "Mini-boss vaincus", liste: MINI_BOSS, fait: tous.tues },
    { titre: "Créatures tuées (toutes difficultés)", liste: CREATURES, fait: tous.tues, note: "Les boss sont comptés à part." },
    { titre: "Créatures tuées (Difficile)", liste: CREATURES, fait: difficile.tues },
    { titre: "Trophées ramassés", liste: TROPHEES, fait: tous.ramasses,
      note: "Un trophée compte quand il est ramassé. Ceux obtenus avant le suivi des succès doivent parfois être ramassés à nouveau." },
    { titre: "Poissons pêchés", liste: POISSONS, fait: tous.cueillis,
      note: "Il faut remonter le poisson à la canne : le ramasser au sol ne compte pas." },
    { titre: "Façons de mourir", liste: parStat(MORTS), fait: { get: (i) => tous.stats[i] } },
    { titre: "Tué par chaque variété d'arbre", liste: parStat(MORTS_ARBRE), fait: { get: (i) => tous.stats[i] } },
  ];
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

  for (const sec of listesSucces(s)) {
    const entrees = sec.liste.map(([cle, nom, biome]) => ({ nom, biome, n: sec.fait.get(cle) || 0 }));
    const faits = entrees.filter((e) => e.n > 0).length;
    const visibles = entrees.filter((e) => e.biome <= biomeMax && (toutAfficher || e.n === 0))
      .sort((a, b) => a.biome - b.biome || comparer(a.nom, b.nom));
    const masques = entrees.filter((e) => e.n === 0 && e.biome > biomeMax).length;
    html += `<details class="section-succes" ${faits < entrees.length ? "open" : ""}>
      <summary><span>${sec.titre}</span><span class="compteur ${faits === entrees.length ? "complet" : ""}">${faits} / ${entrees.length}</span></summary>
      ${sec.note ? `<p class="aide-petite">${sec.note}</p>` : ""}
      ${visibles.length ? `<ul class="liste">${visibles.map((e) => `<li class="${e.n ? "fait" : ""}">
        <span>${e.n ? "✔" : "○"} ${echapper(e.nom)}${e.n ? ` <small>×${nombre(Math.round(e.n))}</small>` : ""}</span>
        <span class="biome b${e.biome}">${BIOMES[e.biome]}</span></li>`).join("")}</ul>`
        : `<p class="aide-petite">${faits === entrees.length ? "Tout est fait !" : "Rien de plus à faire jusqu'à ce biome."}</p>`}
      ${masques ? `<p class="aide-petite">${masques} élément(s) plus loin que ${BIOMES[biomeMax]} sont masqués.</p>` : ""}
    </details>`;
  }

  // listes brutes tirées du fichier, sans liste de référence
  const tous = s.jeux[JEU.tous];
  const brut = (titre, dico) => {
    const lignes = [...dico].filter(([, n]) => n > 0).map(([k, n]) => [k.replace(/^\$(item|piece|enemy)_/, ""), n])
      .sort((a, b) => comparer(a[0], b[0]));
    return `<details class="section-succes"><summary><span>${titre}</span><span class="compteur">${lignes.length}</span></summary>
      <p class="aide-petite">Liste lue telle quelle dans le fichier (noms internes du jeu).</p>
      <ul class="liste brut">${lignes.map(([k, n]) => `<li><span>${echapper(k)}</span><small>×${nombre(Math.round(n))}</small></li>`).join("")}</ul></details>`;
  };
  html += `<h3>Déjà réalisé</h3>` + brut("Objets fabriqués", tous.fabriques) + brut("Pièces construites", tous.construits) +
    brut("Aliments mangés", tous.manges);
  $("#succes-resultat").innerHTML = html;
}

// ---------- prédicteur ----------

function etapesHtml(etapes) {
  return `<ol class="etapes">${etapes.map((e) => `<li class="${e.issue}" title="tirage ${pourcent(e.valeur)}${e.enregistree ? " (graine enregistrée)" : ""}">
    ${e.issue === "reussite" ? "▲" : e.issue === "casse" ? "✖" : "▼"} ${e.vers}</li>`).join("")}</ol>`;
}

function ligneSimulation(sim, extra = "") {
  return `<tr><td>${echapper(NOM_OBJET.get(sim.prefab) || sim.prefab)}${extra}</td><td class="num">${sim.depart}</td>
    <td class="num"><strong>${sim.ameliorations}</strong></td>
    <td class="num">${sim.casse ? `casse en visant ${sim.etapes[sim.etapes.length - 1].vers}` : "ne casse pas"}</td>
    <td>${etapesHtml(sim.etapes)}</td></tr>`;
}

const enteteTableau = `<table class="tableau"><thead><tr><th>Objet</th><th>Qualité</th><th>Améliorations</th><th>Issue</th><th>Déroulé</th></tr></thead><tbody>`;

actionsDepot.predicteur = (octets) => {
  const cible = $("#predicteur-resultat");
  const s = lireOuErreur(octets, cible);
  if (!s) return;
  if (!s.joueur) { cible.innerHTML = erreur(s.erreurJoueur); return; }
  const sims = s.joueur.inventaire.filter((o) => PAR_HACHAGE.has(o.prefab)).map((o) => ({
    sim: simuler(PAR_HACHAGE.get(o.prefab), o.qualite, s.nom, s.joueur.graines), objet: o,
  })).sort((a, b) => b.sim.ameliorations - a.sim.ameliorations || comparer(NOM_OBJET.get(a.sim.prefab), NOM_OBJET.get(b.sim.prefab)));

  let html = `<div class="resume"><p><strong>${echapper(s.nom)}</strong> · ${nombre(s.joueur.graines.size)} graine(s) d'amélioration enregistrée(s)</p></div>`;
  if (!sims.length) html += `<p>Aucun objet améliorable dans l'inventaire.</p>`;
  else {
    html += enteteTableau + sims.map(({ sim, objet }) =>
      ligneSimulation(sim, (objet.equipe ? ' <small class="pastille">équipé</small>' : "") + (objet.pile > 1 ? ` <small>×${objet.pile}</small>` : ""))).join("") + "</tbody></table>";
  }
  html += `<p class="legende">▲ réussite · ✖ l'objet casse · ▼ l'objet perd un niveau. Survolez une étape pour voir le tirage.</p>
    <p><button type="button" id="predire-tout">Voir tous les objets améliorables depuis la qualité 1 pour ce personnage</button></p>
    <div id="predire-tout-resultat"></div>`;
  cible.innerHTML = html;
  $("#predire-tout").addEventListener("click", () => {
    const toutes = AMELIORABLES.map(([p]) => simuler(p, 1, s.nom, s.joueur.graines))
      .sort((a, b) => b.ameliorations - a.ameliorations || comparer(NOM_OBJET.get(a.prefab), NOM_OBJET.get(b.prefab)));
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
    const sim = simuler(prefab, qualiteValide(f.get("qualite"), "La qualité"), nom);
    cible.innerHTML = `<p>Pour un nouveau personnage nommé <strong>${echapper(nom)}</strong> :</p>` + enteteTableau + ligneSimulation(sim) + "</tbody></table>";
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
let dernierRecherche = null;   // pour « Continuer »

function rechercherNoms(params) {
  const cible = $("#noms-resultat"), boutonStop = $("#noms-stop");
  const titre = `${echapper(NOM_OBJET.get(params.prefab))}, qualité ${params.qualite} → ${params.cible} amélioration(s)` +
    (params.copies > 1 ? `, ${params.copies} copies` : "");
  const zoneProg = document.createElement("p");
  zoneProg.className = "progression";
  zoneProg.textContent = "Recherche en cours…";
  cible.prepend(zoneProg);
  boutonStop.hidden = false;
  arreterNoms = lancerWorker({ type: "noms", ...params }, {
    progression: (d) => { zoneProg.textContent = `Recherche en cours… ${nombre(d.essais)} noms essayés`; },
    fin: (d) => {
      boutonStop.hidden = true;
      dernierRecherche = d.noms.length ? { ...params, apres: d.noms[d.noms.length - 1] } : null;
      const bloc = document.createElement("div");
      bloc.className = "bloc-resultat";
      bloc.innerHTML = `<p><strong>${titre}</strong> : ${d.noms.length} nom(s) sur ${nombre(d.essais)} essayés.
        ${d.epuise ? "Limite d'essais atteinte." : ""}</p>
        ${d.noms.length ? `<ul class="noms">${d.noms.map((n) => `<li><code>${echapper(n)}</code></li>`).join("")}</ul>` : ""}
        ${dernierRecherche ? `<button type="button" class="continuer">Continuer la recherche</button>` : ""}`;
      zoneProg.replaceWith(bloc);
      const btn = $(".continuer", bloc);
      if (btn) btn.addEventListener("click", () => { btn.remove(); rechercherNoms(dernierRecherche); });
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
    rechercherNoms({
      prefab: trouverObjet(f.get("objet")), qualite: qualiteValide(f.get("qualite"), "La qualité de départ"),
      cible: Number(f.get("cible")), copies: Number(f.get("copies")), alphabet: f.get("alphabet"),
      longueurMin: 3, longueurMax: 15, limite: Math.min(100, Math.max(1, Number(f.get("limite")) || 10)),
      budget: Number(f.get("copies")) > 1 ? BUDGET * 10 : BUDGET, apres: null,
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
    const depart = qualiteValide(f.get("depart"), "La qualité actuelle");
    const arrivee = qualiteValide(f.get("arrivee"), "La qualité visée");
    if (arrivee <= depart) throw new Error("la qualité visée doit être supérieure à la qualité actuelle");
    cible.innerHTML = `<p class="progression">Recherche du premier personnage…</p>`;
    boutonStop.hidden = false;
    arreterRelais = lancerWorker({ type: "relais", prefab, depart, arrivee, alphabet: "lettres", budget: BUDGET }, {
      progression: (d) => { $(".progression", cible).textContent = `${d.etape} personnage(s) trouvé(s), qualité ${d.niveau} atteinte…`; },
      fin: (d) => {
        boutonStop.hidden = true;
        cible.innerHTML = `<p><strong>${echapper(NOM_OBJET.get(prefab))}</strong> de la qualité ${depart} à ${arrivee} :
          ${d.plan.length} personnage(s).</p>
          <ol class="plan">${d.plan.map((p) => `<li>Créez <code>${echapper(p.nom)}</code> et améliorez l'objet de ${p.de} à <strong>${p.a}</strong>
            (${p.a - p.de} tentative(s), toutes réussies), puis arrêtez et transmettez l'objet.</li>`).join("")}</ol>
          <p class="aide-petite">Chaque personnage doit être neuf (jamais utilisé à la Forge) et ne doit pas tenter
          d'amélioration au-delà de l'étape indiquée : la suivante pourrait casser l'objet.</p>`;
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
