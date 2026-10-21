# Analyseur de sauvegarde Valheim

Site statique, en français, qui lit un fichier de personnage Valheim (`.fch`) directement dans le navigateur.
Aucun fichier n'est envoyé sur Internet et le fichier n'est jamais modifié.

**Site :** https://ciferri.github.io/save-parser/

## Outils

| Onglet | Ce qu'il fait |
|---|---|
| **Succès** | Liste ce qu'il manque pour les succès : boss (toutes difficultés, Normal ou plus, Difficile), mini-boss, créatures, trophées, poissons, façons de mourir et morts par variété d'arbre. Un filtre « Je suis actuellement dans » masque ce qui demande d'aller plus loin. Les objets fabriqués, pièces construites et aliments mangés sont aussi listés tels qu'ils figurent dans le fichier. |
| **Prédicteur d'amélioration** | Pour chaque objet améliorable de l'inventaire : combien d'améliorations il obtiendra à la Forge du potentiel avant de casser, et le déroulé tentative par tentative. Fonctionne aussi sans fichier, pour un objet et un nom de nouveau personnage. |
| **Chercheur de noms** | Cherche des noms de personnage qui obtiennent exactement N améliorations (jusqu'à 8) avant de casser, éventuellement sur plusieurs copies de l'objet. |
| **Planificateur de relais** | Trouve une chaîne de nouveaux personnages qui amène un objet d'une qualité à une autre sans le casser. |

## Principe de la prédiction

À la Forge du potentiel, chaque tentative est tirée par le générateur aléatoire de Unity, initialisé avec une graine
qui ne dépend que du nom du personnage, de l'objet et du niveau visé — ou de la graine que le personnage a enregistrée
après une tentative précédente sur le même objet et le même niveau. Le site lit ces graines dans le fichier et rejoue
les tirages. Chance de réussite : 65 % ; un échec détruit l'objet.

## Structure

```
index.html            la page et ses onglets
css/style.css         mise en forme (thème clair et sombre)
js/donnees.js         tables de référence : noms français, biomes, objets améliorables
js/fch.js             lecture du fichier .fch
js/forge.js           hachage des noms, générateur de Unity, simulation et recherche
js/worker-noms.js     recherche de noms en arrière-plan
js/app.js             interface
```

Aucune dépendance ni étape de compilation : il suffit de servir le dossier (par exemple `python -m http.server`).
Le site est publié par GitHub Pages depuis la branche `main`.

## Limites

- Format de fichier testé : profil 46 et 47, données du joueur 34 (Valheim 1.0.20 et plus). Un personnage enregistré
  par une version plus ancienne doit d'abord être rechargé et sauvegardé dans le jeu à jour.
- Les noms français des objets et créatures sont des traductions de ce site et peuvent différer de ceux du jeu.
  Les biomes indiqués sont approximatifs.
- Les listes complètes « fabriquer tous les objets » / « construire toutes les pièces » ne sont pas incluses :
  le site affiche ce qui est déjà fait, pas ce qui manque.

Projet indépendant, non affilié à Iron Gate.
