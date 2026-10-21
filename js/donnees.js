// Biome à partir duquel chaque chose devient accessible (estimation de ce site) et listes tenues à la main.
// Les noms officiels viennent de js/jeu.js ; ceux d'ici ne servent que si le jeu n'en fournit pas.
"use strict";

const BIOMES = [
  "Prairies", "Forêt noire", "Océan", "Marécages", "Montagnes",
  "Plaines", "Terres brumeuses", "Terres cendrées", "Grand Nord",
];

// [jeton, nom, biome]
const CREATURES = [
  ["$enemy_boar", "Sanglier", 0], ["$enemy_boarpiggy", "Marcassin", 0], ["$enemy_deer", "Cerf", 0],
  ["$enemy_greyling", "Petit gris", 0], ["$enemy_neck", "Neck", 0],
  ["$enemy_greydwarf", "Nain gris", 1], ["$enemy_greydwarfbrute", "Brute naine grise", 1],
  ["$enemy_greydwarfshaman", "Chaman nain gris", 1], ["$enemy_troll", "Troll", 1], ["$enemy_skeleton", "Squelette", 1],
  ["$enemy_ghost", "Fantôme", 1], ["$enemy_bjorn", "Ours", 1], ["$enemy_root", "Racine", 1],
  ["$piece_trainingdummy", "T.W.I.G. (mannequin d'entraînement)", 1],
  ["$enemy_serpent", "Serpent de mer", 2],
  ["$enemy_draugr", "Draugr", 3], ["$enemy_draugrelite", "Draugr d'élite", 3], ["$enemy_blob", "Blob", 3],
  ["$enemy_blobelite", "Suinteur", 3], ["$enemy_leech", "Sangsue", 3], ["$enemy_wraith", "Spectre", 3],
  ["$enemy_surtling", "Surtling", 3], ["$enemy_abomination", "Abomination", 3],
  ["$enemy_skeletonpoison", "Restes rances", 3], ["$enemy_kvastur", "Kvastur", 3],
  ["$enemy_wolf", "Loup", 4], ["$enemy_wolfcub", "Louveteau", 4], ["$enemy_drake", "Drake", 4],
  ["$enemy_fenring", "Fenring", 4], ["$enemy_fenringcultist", "Cultiste", 4], ["$enemy_stonegolem", "Golem de pierre", 4],
  ["$enemy_ulv", "Ulv", 4], ["$enemy_bat", "Chauve-souris", 4], ["$enemy_blobfrost", "Blob de givre", 4],
  ["$enemy_goblin", "Fuling", 5], ["$enemy_goblinbrute", "Fuling berserker", 5], ["$enemy_goblinshaman", "Chaman fuling", 5],
  ["$enemy_lox", "Lox", 5], ["$enemy_loxcalf", "Petit lox", 5], ["$enemy_deathsquito", "Moustimort", 5],
  ["$enemy_blobtar", "Excroissance", 5], ["$enemy_unbjorn", "Vil", 5], ["$enemy_chicken", "Poulet", 5], ["$enemy_hen", "Poule", 5],
  ["$enemy_seeker", "Chercheur", 6], ["$enemy_seekerbrute", "Soldat chercheur", 6], ["$enemy_babyseeker", "Couvain de chercheur", 6],
  ["$enemy_tick", "Tique", 6], ["$enemy_gjall", "Gjall", 6], ["$enemy_dvergr", "Dvergr voleur", 6],
  ["$enemy_dvergr_mage", "Mage dvergr", 6], ["$enemy_hare", "Lièvre", 6], ["$enemy_skeleton_summoned", "Skelett (invoqué)", 6],
  ["$enemy_charred_melee", "Guerrier calciné", 7], ["$enemy_charred_archer", "Tireur calciné", 7],
  ["$enemy_charred_mage", "Sorcier calciné", 7], ["$enemy_charred_twitcher", "Convulseur calciné", 7],
  ["$enemy_charred_twitcher_summoned", "Convulseur invoqué", 7], ["$enemy_charred_melee_Fader", "Guerrier calciné invoqué", 7],
  ["$enemy_asksvin", "Asksvin", 7], ["$enemy_asksvin_hatchling", "Bébé asksvin", 7], ["$enemy_volture", "Volture", 7],
  ["$enemy_morgen", "Morgen", 7], ["$enemy_fallenvalkyrie", "Valkyrie déchue", 7], ["$enemy_fallenwarrior", "Guerrier déchu", 7],
  ["$enemy_bloblava", "Blob de lave", 7], ["$enemy_bonemawserpent", "Gueule-d'os", 7], ["$enemy_summonedtroll", "Troll invoqué", 7],
  ["$enemy_moose", "Élan", 8], ["$enemy_moosecalf", "Petit élan", 8], ["$enemy_seal", "Phoque", 8], ["$enemy_seal_baby", "Bébé phoque", 8],
  ["$enemy_trollfrost", "Gammeltroll", 8], ["$enemy_jotun_warrior", "Krigen", 8], ["$enemy_jotun_witch", "Hexen", 8],
  ["$enemy_elaking", "Elaking", 8], ["$enemy_elakingmole", "Sans-yeux", 8], ["$enemy_barka", "Barka", 8],
  ["$enemy_writhan", "Writhan", 8], ["$enemy_blobmork", "Pulpe informe", 8], ["$enemy_blobmorkmini", "Petite pulpe", 8],
  ["$enemy_dvergr_deepnorth", "Dvergr prisonnier", 8], ["$enemy_goblin_deepnorth", "Fuling captif", 8],
  ["$enemy_frozenking", "Kall Fimbulbringer", 8],
  ["$enemy_aspect_eikthyr", "Aspect du Cerf de foudre", 8], ["$enemy_aspect_gdking", "Aspect de la Forêt vivante", 8],
  ["$enemy_aspect_bonemass", "Aspect des Morts grouillants", 8], ["$enemy_aspect_dragon", "Aspect de la Mère dragon", 8],
  ["$enemy_aspect_goblinking", "Aspect de l'Âme tordue", 8], ["$enemy_aspect_seekerqueen", "Aspect de la Matriarche rampante", 8],
  ["$enemy_aspect_fader", "Aspect de la Flamme émeraude", 8],
  ["$spiritcaller_boar", "Sanglier spirituel", 8], ["$spiritcaller_wolf", "Loup spirituel", 8],
  ["$spiritcaller_bjorn", "Ours spirituel", 8], ["$spiritcaller_moose", "Élan spirituel", 8],
  // les mini-boss comptent aussi comme créatures
  ["$enemy_skeletonfire", "Brenna", 1], ["$enemy_fenringcultist_hildir", "Geirrhafa", 4], ["$enemy_goblin_hildir", "Zil", 5],
  ["$enemy_goblinbrute_hildircombined", "Zil & Thungr", 5], ["$enemy_charred_melee_Dyrnwyn", "Seigneur Reto", 7],
];

const BOSS = [
  ["$enemy_eikthyr", "Eikthyr", 0], ["$enemy_gdking", "L'Ancien", 1], ["$enemy_bonemass", "Bonemass", 3],
  ["$enemy_dragon", "Moder", 4], ["$enemy_goblinking", "Yagluth", 5], ["$enemy_seekerqueen", "La Reine", 6],
  ["$enemy_fader", "Fader", 7], ["$enemy_frozenking_p3", "Kall Fimbulbringer", 8],
];

const MINI_BOSS = [
  ["$enemy_skeletonfire", "Brenna", 1], ["$enemy_fenringcultist_hildir", "Geirrhafa", 4], ["$enemy_goblin_hildir", "Zil", 5],
  ["$enemy_goblinbrute_hildircombined", "Zil & Thungr", 5], ["$enemy_charred_melee_Dyrnwyn", "Seigneur Reto", 7],
];

const POISSONS = [
  ["$animal_fish1", "Perche", 0], ["$animal_fish2", "Brochet", 1], ["$animal_fish3", "Thon", 2],
  ["$animal_fish4", "Tétra", 3], ["$animal_fish5", "Poisson-troll", 2], ["$animal_fish6", "Hareng géant", 2],
  ["$animal_fish7", "Mérou", 5], ["$animal_fish8", "Morue de corail", 2], ["$animal_fish9", "Baudroie", 6],
  ["$animal_fish10", "Saumon du Nord", 8], ["$animal_fish11", "Poisson de magma", 7], ["$animal_fish12", "Poisson-globe", 8],
];

// trophée -> [nom, biome]
const TROPHEES = [
  ["$item_trophy_boar", "Trophée de sanglier", 0], ["$item_trophy_deer", "Trophée de cerf", 0],
  ["$item_trophy_neck", "Trophée de neck", 0], ["$item_trophy_eikthyr", "Trophée d'Eikthyr", 0],
  ["$item_trophy_greydwarf", "Trophée de nain gris", 1], ["$item_trophy_greydwarfbrute", "Trophée de brute naine grise", 1],
  ["$item_trophy_greydwarfshaman", "Trophée de chaman nain gris", 1], ["$item_trophy_skeleton", "Trophée de squelette", 1],
  ["$item_trophy_ghost", "Trophée de fantôme", 1], ["$item_trophy_bjorn", "Trophée d'ours", 1],
  ["$item_trophy_elder", "Trophée de l'Ancien", 1], ["$item_trophy_skeleton_hildir", "Trophée de Brenna", 1],
  ["$item_trophy_serpent", "Trophée de serpent de mer", 2],
  ["$item_trophy_draugr", "Trophée de draugr", 3], ["$item_trophy_draugrelite", "Trophée de draugr d'élite", 3],
  ["$item_trophy_blob", "Trophée de blob", 3], ["$item_trophy_leech", "Trophée de sangsue", 3],
  ["$item_trophy_wraith", "Trophée de spectre", 3], ["$item_trophy_surtling", "Trophée de surtling", 3],
  ["$item_trophy_abomination", "Trophée d'abomination", 3], ["$item_trophy_skeletonpoison", "Trophée de restes rances", 3],
  ["$item_trophy_bonemass", "Trophée de Bonemass", 3], ["$enemy_kvastur", "Kvastur", 3],
  ["$item_trophy_wolf", "Trophée de loup", 4], ["$item_trophy_hatchling", "Trophée de drake", 4],
  ["$item_trophy_fenring", "Trophée de fenring", 4], ["$item_trophy_cultist", "Trophée de cultiste", 4],
  ["$item_trophy_sgolem", "Trophée de golem de pierre", 4], ["$item_trophy_ulv", "Trophée d'ulv", 4],
  ["$item_trophy_blob_frost", "Trophée de blob de givre", 4], ["$item_trophy_dragonqueen", "Trophée de Moder", 4],
  ["$item_trophy_cultist_hildir", "Trophée de Geirrhafa", 4],
  ["$item_trophy_goblin", "Trophée de fuling", 5], ["$item_trophy_goblinbrute", "Trophée de fuling berserker", 5],
  ["$item_trophy_goblinshaman", "Trophée de chaman fuling", 5], ["$item_trophy_lox", "Trophée de lox", 5],
  ["$item_trophy_deathsquito", "Trophée de moustimort", 5], ["$item_trophy_growth", "Trophée d'excroissance", 5],
  ["$item_trophy_bjorn_undead", "Trophée de vil", 5], ["$item_trophy_goblinking", "Trophée de Yagluth", 5],
  ["$item_trophy_shamanbro", "Trophée de Zil", 5], ["$item_trophy_brutebro", "Trophée de Thungr", 5],
  ["$item_trophy_seeker", "Trophée de chercheur", 6], ["$item_trophy_seeker_brute", "Trophée de soldat chercheur", 6],
  ["$item_trophy_tick", "Trophée de tique", 6], ["$item_trophy_gjall", "Trophée de gjall", 6],
  ["$item_trophy_dvergr", "Trophée de dvergr", 6], ["$item_trophy_hare", "Trophée de lièvre", 6],
  ["$item_trophy_seekerqueen", "Trophée de la Reine", 6],
  ["$item_trophy_charredmelee", "Trophée de guerrier calciné", 7], ["$item_trophy_charredarcher", "Trophée de tireur calciné", 7],
  ["$item_trophy_charredmage", "Trophée de sorcier calciné", 7], ["$item_trophy_asksvin", "Trophée d'asksvin", 7],
  ["$item_trophy_volture", "Trophée de volture", 7], ["$item_trophy_morgen", "Trophée de morgen", 7],
  ["$item_trophy_fallenvalkyrie", "Trophée de valkyrie déchue", 7], ["$item_trophy_blob_lava", "Trophée de blob de lave", 7],
  ["$item_trophy_bonemaw", "Trophée de gueule-d'os", 7], ["$item_trophy_fader", "Trophée de Fader", 7],
  ["$item_trophy_moose", "Trophée d'élan", 8], ["$item_trophy_seal", "Trophée de phoque", 8],
  ["$item_trophy_jotunwarrior", "Trophée de krigen", 8], ["$item_trophy_jotunwitch", "Trophée de hexen", 8],
  ["$item_trophy_elaking", "Trophée d'elaking", 8], ["$item_trophy_mole", "Trophée de sans-yeux", 8],
  ["$item_trophy_barka", "Trophée de barka", 8], ["$item_trophy_writhan", "Trophée de writhan", 8],
  ["$item_trophy_blob_morkhalla", "Trophée de pulpe", 8],
];

// Causes de mort : [index de la statistique dans le fichier, nom, biome]
const MORTS = [
  [56, "Tué par un ennemi", 0], [58, "Chute", 0], [59, "Noyade", 0], [60, "Brûlure", 0], [61, "Gel", 4],
  [62, "Empoisonnement", 1], [63, "Fumée", 0], [65, "Bord du monde", 2], [68, "Arbre", 0], [71, "Tourelle", 6],
  [73, "Stalactite", 4], [105, "Catapulte", 7], [107, "Océan des Terres cendrées", 7], [108, "Oblitérateur", 3],
  [203, "Pont-levis", 4], [204, "Lave des Terres cendrées", 7],
];

const MORTS_ARBRE = [
  [199, "Hêtre", 0], [200, "Bouleau", 0], [194, "Chêne", 0], [195, "Pin", 1], [193, "Sapin", 1], [198, "Arbre des marécages", 3],
  [197, "Pousse d'Yggdrasil", 6], [196, "Arbre des Terres cendrées", 7],
  [201, "Sapin enneigé (bois de charpente)", 8], [202, "Pin enneigé (bois de charpente)", 8],
];
