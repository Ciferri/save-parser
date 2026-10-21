# Analyseur de sauvegarde Valheim

Site statique, en français, qui lit un fichier de personnage Valheim (`.fch`) directement dans le navigateur.
Aucun fichier n'est envoyé sur Internet et le fichier n'est jamais modifié.

**Site :** https://ciferri.github.io/save-parser/

## Outils

| Onglet | Ce qu'il fait |
|---|---|
| **Succès** | Ce qu'il manque pour chaque succès : objets à fabriquer (414), armes (145), plats (82), aliments à goûter (96), pièces à construire (394), créatures (100), boss et mini-boss, trophées (68), poissons, façons de mourir et morts par arbre. Un filtre « Je suis actuellement dans » masque ce qui demande d'aller plus loin. |
| **Prédicteur** | Pour chaque objet améliorable de l'inventaire : le meilleur niveau atteignable à la Forge du potentiel, après combien de tentatives s'arrêter, et le déroulé complet. Fonctionne aussi sans fichier, pour un objet et un nom de nouveau personnage. |
| **Chercheur de noms** | Cherche des noms de personnage qui réussissent N améliorations d'affilée dès le départ. |
| **Relais** | Trouve une chaîne de nouveaux personnages qui amène un objet d'une qualité à une autre sans aucun échec. |
| **Coût d'amélioration** | Ce que coûte réellement à un personnage d'amener un objet à une qualité : copies fabriquées, idoles, matériaux dépensés et rendus quand l'objet casse. |
| **Compteurs de butin** | Pour chaque butin rare (30 % ou moins), à quelle mise à mort il tombera d'après les compteurs enregistrés dans le personnage. |

## Principe de la prédiction

À la Forge du potentiel, chaque tentative est tirée par le générateur aléatoire de Unity, initialisé avec une graine
qui ne dépend que du nom du personnage, de l'objet et du niveau visé — ou de la graine que le personnage a enregistrée
après une tentative précédente sur le même objet et le même niveau. Le site lit ces graines dans le fichier et rejoue
les tirages. La graine du monde n'intervient pas.

Avec les données actuelles du jeu : 65 % de réussite (l'objet gagne un niveau) ; sinon, 10 % des tirages détruisent
l'objet et les autres lui font perdre un niveau. Quand l'objet casse, 50 % des ingrédients récupérables sont rendus.
Ces valeurs sont lues par objet dans les fichiers du jeu.

## Compteurs de butin

Un butin dont la chance finale (chaque étoile la double) est de 30 % ou moins utilise un compteur enregistré dans le
personnage : la clé est le hachage du prefab de l'objet plus la partie entière de la chance × 1000, et la valeur est le
nombre de mises à mort restantes.

## Structure

```
index.html            la page et ses onglets
css/style.css         mise en forme (thème clair et sombre)
js/jeu.js             données extraites du jeu (généré, ne pas modifier à la main)
js/donnees.js         biomes estimés, poissons, causes de mort
js/fch.js             lecture du fichier .fch
js/forge.js           hachage des noms, générateur de Unity, simulation et recherche
js/cout.js            coût d'amélioration
js/butins.js          compteurs de butin
js/worker-noms.js     recherche de noms en arrière-plan
js/app.js             interface
outils/               extraction des données depuis le jeu installé
```

## Mettre à jour les données après une mise à jour du jeu

```bash
pip install UnityPy TypeTreeGeneratorAPI
python outils/extraire_jeu.py "<dossier Steam>/steamapps/common/Valheim" extraction/
python outils/construire_donnees.py extraction/ js/jeu.js
```

L'extraction lit les fichiers du jeu sans les modifier (environ une minute). Seuls des noms courts et des valeurs
numériques (recettes, chances, listes) sont gardés dans `js/jeu.js`.

Aucune dépendance ni étape de compilation : il suffit de servir le dossier (par exemple `python -m http.server`).
Le site est publié par GitHub Pages depuis la branche `main`.

## Limites

- Format de fichier testé : profil 46 et 47, données du joueur 34 (Valheim 1.0.20 et plus). Un personnage enregistré
  par une version plus ancienne doit d'abord être rechargé et sauvegardé dans le jeu à jour.
- Les noms sont les noms français officiels du jeu. Les biomes indiqués sont une estimation de ce site.
- Compteurs de butin : les créatures hors boss sont supposées pouvoir avoir 0 à 2 étoiles.
- Coût d'amélioration : quand l'objet redescend sous la limite de sa station, on suppose qu'il y est réamélioré.

Projet indépendant, non affilié à Iron Gate.
