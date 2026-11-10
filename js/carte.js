// Carte du monde : zones explorées par le personnage (lues dans le .fch), marqueurs, tombes et portails.
//
// Carte explorée d'un monde dans le .fch : int32 version, int32 taille, puis données gzip contenant
//   int32 côté (2048), côté² octets « exploré par moi », côté² octets « exploré par d'autres » (table de cartographie),
//   int32 nombre de marqueurs, puis par marqueur : nom, position (3 flottants), type (int32), coché (1 octet),
//   identifiant du propriétaire (int64), auteur (chaîne).
// Une case couvre 12 m ; la case (côté/2, côté/2) est le centre du monde.
"use strict";

const METRES_PAR_CASE = 12;
const RAYON_MONDE = 10500;
const TYPES_MARQUEUR = { 4: "mort", 5: "lit", 9: "boss" };

// Identifiant et nom d'un monde, lus dans son .fwl2 : int32 taille, int32 version, nom, nom de graine, int32 graine, int64 id.
function lireFwl(octets) {
  const v = new DataView(octets.buffer, octets.byteOffset, octets.byteLength);
  let p = 8;
  const chaine = () => {
    let n = 0, decal = 0, b;
    do { b = octets[p++]; n |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
    const s = new TextDecoder("utf-8").decode(octets.subarray(p, p + n)); p += n; return s;
  };
  const nom = chaine(), graine = chaine();
  p += 4;
  return { nom, graine, id: BigInt.asUintN(64, v.getBigInt64(p, true)) };
}

async function decompresserGzip(octets) {
  const flux = new Blob([octets]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

// Décode la carte explorée d'un monde (champ `carte` d'un monde du .fch).
async function lireCarteExploree(blob) {
  const v = new DataView(blob.buffer, blob.byteOffset, blob.byteLength);
  const longueur = v.getInt32(4, true);
  const o = await decompresserGzip(blob.subarray(8, 8 + longueur));
  const d = new DataView(o.buffer);
  const cote = d.getInt32(0, true), n = cote * cote;
  const moi = o.subarray(4, 4 + n), autres = o.subarray(4 + n, 4 + 2 * n);
  let p = 4 + 2 * n;
  const chaine = () => {
    let l = 0, decal = 0, b;
    do { b = o[p++]; l |= (b & 0x7f) << decal; decal += 7; } while (b & 0x80);
    const s = new TextDecoder("utf-8").decode(o.subarray(p, p + l)); p += l; return s;
  };
  const marqueurs = [];
  const nb = d.getInt32(p, true); p += 4;
  for (let k = 0; k < nb && p < o.length; k++) {
    const nom = chaine();
    const x = d.getFloat32(p, true), z = d.getFloat32(p + 8, true); p += 12;
    const type = d.getInt32(p, true); p += 4;
    const coche = o[p++] !== 0;
    p += 8; chaine();                           // propriétaire et auteur : non affichés
    marqueurs.push({ nom, x, z, type, coche });
  }
  return { cote, moi, autres, marqueurs };
}

// Dessine la carte dans un canvas. elements : { exploree?, tombes, portails, perso? } ; renvoie les points survolables.
function dessinerCarte(canvas, { exploree, tombes, portails, perso }) {
  const taille = canvas.width, ctx = canvas.getContext("2d");
  const echelle = taille / (2 * RAYON_MONDE);
  const versPixel = (x, z) => [taille / 2 + x * echelle, taille / 2 - z * echelle];   // le nord en haut

  ctx.fillStyle = "#1b2430";
  ctx.fillRect(0, 0, taille, taille);
  // zones explorées : une image du côté de la carte du jeu, réduite à la taille du canvas
  if (exploree) {
    const { cote, moi, autres } = exploree;
    const img = ctx.createImageData(taille, taille);
    for (let py = 0; py < taille; py++) {
      const z = RAYON_MONDE - py / echelle;
      const cy = Math.floor(z / METRES_PAR_CASE + cote / 2);
      for (let px = 0; px < taille; px++) {
        const x = px / echelle - RAYON_MONDE;
        const cx = Math.floor(x / METRES_PAR_CASE + cote / 2);
        const k = (py * taille + px) * 4;
        img.data[k] = 27; img.data[k + 1] = 36; img.data[k + 2] = 48; img.data[k + 3] = 255;   // fond : inexploré
        if (cx < 0 || cy < 0 || cx >= cote || cy >= cote) continue;
        const i = cy * cote + cx;
        if (moi[i]) { img.data[k] = 196; img.data[k + 1] = 178; img.data[k + 2] = 128; img.data[k + 3] = 255; }
        else if (autres[i]) { img.data[k] = 120; img.data[k + 1] = 112; img.data[k + 2] = 92; img.data[k + 3] = 255; }
      }
    }
    ctx.putImageData(img, 0, 0);
  }
  // bord du monde, cercles tous les 2 500 m et axes
  ctx.strokeStyle = "rgba(255,255,255,.18)"; ctx.lineWidth = 1;
  for (let r = 2500; r <= 10000; r += 2500) { ctx.beginPath(); ctx.arc(taille / 2, taille / 2, r * echelle, 0, 2 * Math.PI); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(taille / 2, 0); ctx.lineTo(taille / 2, taille); ctx.moveTo(0, taille / 2); ctx.lineTo(taille, taille / 2); ctx.stroke();
  ctx.fillStyle = "rgba(255,255,255,.6)"; ctx.font = `${Math.round(taille / 50)}px system-ui`; ctx.textAlign = "center";
  ctx.fillText("N", taille / 2, taille / 40 + 4); ctx.fillText("S", taille / 2, taille - 6);
  ctx.fillText("O", 10, taille / 2 - 6); ctx.fillText("E", taille - 10, taille / 2 - 6);

  const points = [];
  const point = (x, z, rayon, remplissage, contour, info) => {
    const [px, py] = versPixel(x, z);
    ctx.beginPath(); ctx.arc(px, py, rayon, 0, 2 * Math.PI);
    ctx.fillStyle = remplissage; ctx.fill();
    if (contour) { ctx.strokeStyle = contour; ctx.lineWidth = 1.5; ctx.stroke(); }
    points.push({ px, py, info });
  };
  const r = Math.max(3, taille / 220);
  for (const m of exploree ? exploree.marqueurs : []) {
    const libelle = m.nom.startsWith("$") ? (JEU.noms[m.nom] || m.nom) : m.nom;
    point(m.x, m.z, r * 0.7, m.type === 9 ? "#e8c35a" : "rgba(255,255,255,.75)", null,
      `Marqueur${TYPES_MARQUEUR[m.type] ? ` (${TYPES_MARQUEUR[m.type]})` : ""} : ${libelle || "sans nom"} — ${Math.round(m.x)}, ${Math.round(m.z)}`);
  }
  for (const p of portails) point(p.x, p.z, r, "#9b6bff", "#fff", `Portail « ${p.nom || "sans nom"} » — ${Math.round(p.x)}, ${Math.round(p.z)}`);
  if (perso && perso.mort) point(perso.mort.x, perso.mort.z, r * 1.2, "#ff9f43", "#000", `Votre dernière mort — ${Math.round(perso.mort.x)}, ${Math.round(perso.mort.z)}`);
  for (const t of tombes) {
    const [px, py] = versPixel(t.x, t.z), s = r * 1.6;
    ctx.strokeStyle = "#ff4d4d"; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(px - s, py - s); ctx.lineTo(px + s, py + s); ctx.moveTo(px + s, py - s); ctx.lineTo(px - s, py + s); ctx.stroke();
    ctx.fillStyle = "#fff"; ctx.font = `bold ${Math.round(taille / 60)}px system-ui`; ctx.textAlign = "left";
    ctx.fillText(t.joueur || "?", px + s + 3, py + 4);
    points.push({ px, py, info: `Tombe de ${t.joueur || "?"}${t.jour ? ` (jour ${t.jour})` : ""} — ${Math.round(t.x)}, ${Math.round(t.z)}${t.donjon ? ", dans un donjon" : ""} — ${t.objets.length} objet(s)` });
  }
  return points;
}

if (typeof module !== "undefined") module.exports = { lireFwl, lireCarteExploree };
