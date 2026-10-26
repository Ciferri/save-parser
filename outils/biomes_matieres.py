# Biome à partir duquel chaque matière première (ce qui ne se fabrique pas) peut être obtenue.
# Estimation tenue à la main pour ce site ; les objets fabriqués en héritent via leurs recettes.
# 0 Prairies, 1 Forêt noire, 2 Océan, 3 Marécages, 4 Montagnes, 5 Plaines, 6 Terres brumeuses,
# 7 Terres cendrées, 8 Grand Nord
PRAIRIES, FORET, OCEAN, MARAIS, MONTAGNE, PLAINES, BRUMES, CENDRES, NORD = range(9)

BIOME_MATIERE = {
    # Prairies
    "Wood": PRAIRIES, "Stone": PRAIRIES, "StoneRock": PRAIRIES, "Flint": PRAIRIES, "Resin": PRAIRIES,
    "RawMeat": PRAIRIES, "LeatherScraps": PRAIRIES, "DeerHide": PRAIRIES, "DeerMeat": PRAIRIES, "TrophyDeer": PRAIRIES,
    "Feathers": PRAIRIES, "Raspberry": PRAIRIES, "Mushroom": PRAIRIES, "Dandelion": PRAIRIES, "Honey": PRAIRIES,
    "QueenBee": PRAIRIES, "NeckTail": PRAIRIES, "Fish1": PRAIRIES, "Acorn": PRAIRIES, "BeechSeeds": PRAIRIES,
    "BirchSeeds": PRAIRIES, "HardAntler": PRAIRIES, "BarberKit": PRAIRIES, "FireworksRocket_White": PRAIRIES,
    "AxeHead1": PRAIRIES, "AxeHead2": PRAIRIES,
    # Forêt noire
    "FineWood": FORET, "RoundLog": FORET, "PineCone": FORET, "FirCone": FORET, "CopperOre": FORET, "CopperScrap": FORET,
    "TinOre": FORET, "BronzeScrap": FORET, "Blueberries": FORET, "Carrot": FORET, "CarrotSeeds": FORET, "Thistle": FORET,
    "GreydwarfEye": FORET, "TrophyGreydwarfShaman": FORET, "TrophySkeleton": FORET, "BoneFragments": FORET,
    "TrollHide": FORET, "BjornHide": FORET, "BjornMeat": FORET, "BjornPaw": FORET, "TrophyBjorn": FORET,
    "AncientSeed": FORET, "SurtlingCore": FORET, "Ectoplasm": FORET, "MushroomYellow": FORET, "Fish2": FORET,
    "Coins": FORET, "Ruby": FORET, "AmberPearl": FORET, "SilverNecklace": FORET, "Thunderstone": FORET,
    "FishingBait": FORET,
    # Océan
    "SerpentMeat": OCEAN, "SerpentScale": OCEAN, "TrophySerpent": OCEAN, "Chitin": OCEAN, "FreshSeaweed": OCEAN,
    "Fish3": OCEAN, "Fish5": OCEAN, "Fish6": OCEAN, "Fish8": OCEAN, "Hook": OCEAN, "SpiceOceans": OCEAN,
    # Marécages
    "IronScrap": MARAIS, "IronOre": MARAIS, "Chain": MARAIS, "ElderBark": MARAIS, "Guck": MARAIS, "Bloodbag": MARAIS,
    "Entrails": MARAIS, "Ooze": MARAIS, "Root": MARAIS, "RottenMeat": MARAIS, "WitheredBone": MARAIS,
    "Turnip": MARAIS, "TurnipSeeds": MARAIS, "TrophyLeech": MARAIS, "TrophyDraugrElite": MARAIS,
    "TrophyAbomination": MARAIS, "TrophySurtling": MARAIS, "TrophyBlob": MARAIS, "BlobVial": MARAIS,
    "Fish4_cave": MARAIS, "Pukeberries": MARAIS, "CandleWick": MARAIS, "FragrantBundle": MARAIS,
    "MushroomSmokePuff": MARAIS, "CuredSquirrelHamstring": MARAIS, "PungentPebbles": MARAIS, "VineGreenSeeds": MARAIS,
    "MeadTrollPheromones": MARAIS, "SpiceForests": FORET,
    # Montagnes
    "SilverOre": MONTAGNE, "Obsidian": MONTAGNE, "Crystal": MONTAGNE, "FreezeGland": MONTAGNE, "DragonTear": MONTAGNE,
    "Onion": MONTAGNE, "OnionSeeds": MONTAGNE, "WolfPelt": MONTAGNE, "WolfFang": MONTAGNE, "WolfMeat": MONTAGNE,
    "WolfClaw": MONTAGNE, "WolfHairBundle": MONTAGNE, "TrophyWolf": MONTAGNE, "TrophyHatchling": MONTAGNE,
    "TrophySGolem": MONTAGNE, "TrophyFenring": MONTAGNE, "TrophyCultist": MONTAGNE, "PowderedDragonEgg": MONTAGNE,
    "SpiceMountains": MONTAGNE,
    # Plaines
    "Barley": PLAINES, "Flax": PLAINES, "Cloudberry": PLAINES, "BlackMetalScrap": PLAINES, "Needle": PLAINES,
    "Tar": PLAINES, "LoxMeat": PLAINES, "LoxPelt": PLAINES, "TrophyLox": PLAINES, "TrophyGoblin": PLAINES,
    "TrophyGoblinBrute": PLAINES, "TrophyGrowth": PLAINES, "TrophyBjornUndead": PLAINES, "UndeadBjornRibcage": PLAINES,
    "ChickenEgg": PLAINES, "ChickenMeat": PLAINES, "YagluthDrop": PLAINES, "BarrelRings": PLAINES, "JuteBlue": PLAINES,
    "ScytheHandle": PLAINES, "Fish7": PLAINES, "SpicePlains": PLAINES,
    # Terres brumeuses
    "BlackMarble": BRUMES, "BlackCore": BRUMES, "YggdrasilWood": BRUMES, "Sap": BRUMES, "Softtissue": BRUMES,
    "Carapace": BRUMES, "Mandible": BRUMES, "ScaleHide": BRUMES, "BugMeat": BRUMES, "HareMeat": BRUMES,
    "GiantBloodSack": BRUMES, "Bilebag": BRUMES, "RoyalJelly": BRUMES, "QueenDrop": BRUMES, "JuteRed": BRUMES,
    "DvergrKeyFragment": BRUMES, "DvergrNeedle": BRUMES, "MushroomJotunPuffs": BRUMES, "MushroomMagecap": BRUMES,
    "TrophyGjall": BRUMES, "TrophySeeker": BRUMES, "Wisp": BRUMES, "YmirRemains": BRUMES, "Pot_Shard_Green": BRUMES,
    "Fish9": BRUMES, "SpiceMistlands": BRUMES,
    # Terres cendrées
    "FlametalOreNew": CENDRES, "Flametal": CENDRES, "Blackwood": CENDRES, "Grausten": CENDRES, "CharredBone": CENDRES,
    "Charredskull": CENDRES, "CharredCogwheel": CENDRES, "CharcoalResin": CENDRES, "SulfurStone": CENDRES,
    "ProustitePowder": CENDRES, "MoltenCore": CENDRES, "MorgenHeart": CENDRES, "MorgenSinew": CENDRES,
    "AskHide": CENDRES, "AskBladder": CENDRES, "AsksvinMeat": CENDRES, "AsksvinCarrionNeck": CENDRES,
    "AsksvinCarrionPelvic": CENDRES, "AsksvinCarrionRibcage": CENDRES, "AsksvinCarrionSkull": CENDRES,
    "TrophyAsksvin": CENDRES, "TrophyCharredMelee": CENDRES, "TrophyFallenValkyrie": CENDRES, "TrophyMorgen": CENDRES,
    "VoltureEgg": CENDRES, "VoltureMeat": CENDRES, "BoneMawSerpentMeat": CENDRES, "BonemawSerpentTooth": CENDRES,
    "CelestialFeather": CENDRES, "BellFragment": CENDRES, "FaderDrop": CENDRES, "FaderEmber": CENDRES,
    "DyrnwynBladeFragment": CENDRES, "DyrnwynHiltFragment": CENDRES, "DyrnwynTipFragment": CENDRES,
    "GemstoneBlue": CENDRES, "GemstoneGreen": CENDRES, "GemstoneRed": CENDRES, "Fiddleheadfern": CENDRES,
    "Vineberry": CENDRES, "VineberrySeeds": CENDRES, "Pot_Shard_Red": CENDRES, "MushroomBzerker": CENDRES,
    "Fish11": CENDRES, "SpiceAshlands": CENDRES,
    # Grand Nord
    "GoldOre": NORD, "Frostwood": NORD, "FirConeFrost": NORD, "BarkaBranch": NORD, "Ice": NORD, "FrostCore": NORD,
    "MooseHide": NORD, "MooseMeat": NORD, "MooseSinew": NORD, "SealHide": NORD, "SealBlubber": NORD,
    "ElakingHairBundle": NORD, "MoleClaws": NORD, "OozeMork": NORD, "WrithanRoots": NORD, "NornThread": NORD,
    "Leatherstraps": NORD, "CrownJewel": NORD, "OrbFrostFire": NORD, "OrbThunderBlood": NORD, "GlowWorm": NORD,
    "Poteitr": NORD, "PoteitrSeeds": NORD, "OatSeeds": NORD, "Kale": NORD, "KaleSeeds": NORD, "Lingonberry": NORD,
    "TrophyMoose": NORD, "TrophyJotunWitch": NORD, "TrophyBlob_Morkhalla": NORD, "TrophyFrostTroll": NORD,
    "Ironpit": NORD, "Fish10": NORD, "Fish12": NORD, "SpiceDeepNorth": NORD,
}

# Familles entières, d'après le début du nom du prefab
PREFIXES = {"Mold": NORD}     # tous les moules viennent des donjons et créatures du Grand Nord
