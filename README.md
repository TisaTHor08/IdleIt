# IdleIt Ferme

**Une ferme idle miniature qui vit au-dessus de ta barre des tâches.**
Une bande de 40 px, transparente et toujours au premier plan : un fermier, des robots et des animaux cultivent tout seuls pendant que tu travailles. Pas de fond, tout est vu de profil, en pixel art dessiné en code. Les clics traversent les zones vides : la ferme ne gêne jamais.

![La ferme au-dessus de la barre des tâches](docs/img/band.png)

- 44 légumes répartis en 10 familles et 17 ères, 16 robots, 69 améliorations, 28 talents de spécialisation
- 9 compagnons (dont 4 légendaires) avec arbre de talents, évolution, 3 voies chacun et une maîtrise
- Un marché vivant : silos, cours, pénuries, krachs, commandes, produits qui s'abîment
- Météo (8 temps), orages et éclairs, 13 événements aléatoires, 8 mutations, cultures denses
- 32 talents de renaissance, 85 succès, une durée de vie d'environ **160 h** jusqu'à l'Arbre-monde
- Sauvegarde 100 % automatique, compatible avec un dossier synchronisé (NAS, cloud)

---

## Installer

Télécharge l'un des deux fichiers de `dist/` (ou génère-les, voir [Développement](#développement)) :

- **`IdleIt Ferme Setup x.y.z.exe`** : installateur. Pour mettre à jour, lance simplement le nouvel installateur par-dessus l'ancien : **ta progression est conservée**.
- **`IdleIt-Ferme-portable-x.y.z.exe`** : version portable, sans installation (même sauvegarde que la version installée).

La ferme apparaît en bas de l'écran, juste au-dessus de la barre des tâches.

| Commande | Effet |
|---|---|
| **Ctrl+Alt+F** | Afficher / masquer la ferme (modifiable dans les réglages) |
| Icône de la zone de notification | Afficher / masquer, réglages, quitter |
| **Clic** sur une plante | Récolter, planter, arroser, traiter ou faire pousser |
| **Clic** sur un corbeau, un sanglier, un voleur, une nuée | Le chasser (et souvent gagner une récompense) |
| **Clic** sur un compagnon | Le caresser (+XP) |
| **Clic** sur le silo | Tout vendre au marché |
| **Clic droit** ou **Échap** | Lâcher le pinceau / fermer le panneau |

---

## Comment jouer

### Les bases

Le **fermier** plante, arrose et récolte tout seul. Il dort la nuit (sauf avec la lampe frontale). Toi, tu aides en cliquant sur les plantes, et surtout tu **investis** : la flèche à gauche du HUD déplie le menu (boutique, champ, robots…) et le **pinceau** de graines.

Le pinceau sert à choisir quoi planter : sélectionne une graine puis clique sur des parcelles. Le pinceau **Auto** plante toujours la meilleure graine.

![Graines](docs/img/graines.png)

### Légumes, familles et ères

Chaque légume rapporte plus que le précédent, mais pousse plus lentement et coûte bien plus cher à débloquer. Les légumes sont classés en **familles** (racines, céréales, feuilles, fruits, légumineuses, baies, fleurs, champignons, exotiques, mythiques). Chaque famille a ses outils (grelinette, fléau, serpette, cueilleur…), ses améliorations de culture (buttes, sillons, voiles, tuteurs…) et sa durée de conservation au silo.

Au départ, seuls les 12 légumes du potager (radis → citrouille) existent. Chaque **renaissance** ouvre une nouvelle ère : fraises et poivrons, puis brocoli et riz, champignons, framboises… jusqu'aux légumes mythiques (chou cosmique, haricot magique, fruit astral) et, tout au bout, l'**Arbre-monde** (20 renaissances).

### Champ, outils et robots

- **Champ** : achète des parcelles, l'irrigation, des paratonnerres, et fusionne tes parcelles en **cultures denses** (serrée ×3 plants, intensive ×9, quantique ×27). Une culture dense rapporte plus sur une seule place, mais planter, récolter et arroser y prennent d'autant plus de temps, et les légumes dorés y sont plus rares.
- **Outils** : vitesse du fermier, valeur des récoltes par famille, croissance, chance de légume doré…
- **Robots** : du robot rouillé à l'intelligence centrale (16 modèles, dont certains spécialisés : arroseur, semeur, moissonneuse, soigneur, paratonnerre, épouvantail). Ils vont plus vite que le fermier mais ont une **batterie** et retournent se recharger à la grange (bornes, panneaux solaires, charge rapide…). Les modèles avancés se débloquent au fil des renaissances. Une fois assez nombreux, un modèle peut être **miniaturisé** (plus discret).

![Robots](docs/img/robots.png)

### Spécialisation

Trois branches (Mécanique, Botanique, Paysannerie) et deux doctrines exclusives, **Bio** ou **Science**. Chaque niveau acheté dans une branche rend les autres plus chères : il faut choisir un style de ferme. La Science active les **OGM** et les **mutations** tirées à la plantation : géante (plus grosse, vaut beaucoup plus, plus longue à récolter), infinie (grandit tant que tu ne la cueilles pas), carnivore, stérile, fébrile, lente, solide, moisie.

![Spécialisation](docs/img/spec.png)

### Compagnons

Adopte un animal : chacun a un bonus, un malus et un **arbre de talents**. Il gagne de l'XP quand la ferme récolte et quand tu le caresses. Une fois évolué (poussin → coq, chien → chien de berger…) et au niveau 20, il choisit l'une de ses **3 voies** (Basilic, Phénix ou Rapace pour le coq, par exemple), puis continue de progresser en **maîtrise** (force, sagesse, éclat, rayonnement).

À chaque renaissance, tes compagnons reviennent au niveau 0, mais tu gagnes un **emplacement** de plus (jusqu'à 6) : le même animal en double, ou un autre. Les **compagnons légendaires** ne s'adoptent qu'après plusieurs renaissances, et sont bien plus puissants :

| Compagnon | Après | Points forts | Voies |
|---|---|---|---|
| Renard | 2 renaissances | Chasse tout, doubles récoltes, dorés | Kitsune, Fennec, Renard roux |
| Hibou | 5 renaissances | Nuits courtes et sans malus | Chouette effraie, Harfang des neiges, Chouette savante |
| Licorne | 9 renaissances | Aura magique : +60 % de croissance, +20 % de valeur | Licorne irisée, sylvestre, étoilée |
| Dragonnet | 14 renaissances | +40 % sur tous les légumes, ouvriers +20 % | Dragon d'or, Dragon de l'orage, Wyverne |

![Compagnons](docs/img/pets.png)
![Toutes les apparences des compagnons](docs/img/pets-sheet.png)

### Marché

Dès 10 M$ gagnés dans une partie, le marché ouvre. Les récoltes partent dans tes **silos**, et tu les vends quand le cours est bon (ou tu confies ça à un trader, puis à un gestionnaire).

- Les **cours** bougent sans cesse, plus fort sur les légumes bon marché. Des **pénuries** (cours ×6 à ×25) et des **krachs** frappent au hasard.
- Les **commandes** (bio, sans OGM, résistant au froid…) paient à parité avec ton meilleur légume : de quoi rendre le blé ou les carottes rentables en fin de partie. Le prix reste plafonné à 3× la rentabilité de ton meilleur légume.
- Les produits **s'abîment** : la salade et les champignons pourrissent vite, le blé et les pommes de terre se gardent des heures. Chambre froide et conserverie ralentissent l'usure, et un voleur peut s'en prendre à tes silos.

![Marché](docs/img/marche.png)

### Météo et événements

Soleil, nuages, pluie, canicule, gel (abîme les plantes, sauf sous serre), brouillard (ralentit les ouvriers, attire les corbeaux), vent (sème tout seul les parcelles vides)… et des **orages** : la foudre peut détruire une plante, geler un robot ou **énergiser** une récolte (×100). Les paratonnerres et le robot paratonnerre en profitent.

Et de temps en temps, un événement aléatoire :

| Événement | Ce qui se passe |
|---|---|
| Sanglier | Piétine les plantes : clique pour le chasser |
| Nuée de sauterelles | Dévore feuilles et fleurs : clique pour la disperser |
| Étoile filante | Une plante devient étoilée (×20 à la récolte) |
| Arc-en-ciel | Croissance ×2, dorés ×5 |
| Éclipse | La nuit en plein jour (les mandragores adorent) |
| Comète | Croissance ×2 jusqu'à l'aube |
| Foire agricole | Un juge prime ta plus belle plante mûre (×30) |
| Voleur nocturne | Vole 25 % des silos si tu ne l'attrapes pas |
| Tornade | Arrache des plantes et projette les robots |
| Panne de courant | Plus de recharge pendant 45 s |
| Oies sauvages | Les plantes survolées poussent +30 % |
| Touristes | Cueillent tes plantes mûres et les paient ×3 |
| Champignons sauvages | Poussent tout seuls après la pluie |

### Renaissance

Une fois le **seuil** atteint (1 milliard de $ gagnés dans la partie, puis plus à chaque fois), tu peux renaître : la ferme repart de zéro contre des **graines d'or**. Elles donnent +1 % de revenus chacune et s'échangent contre des **talents de renaissance** ciblés : argent et parcelles de départ, graine débloquée d'avance, robots d'une génération, une famille de légumes, la pluie, les événements heureux, les compagnons, le commerce…

Les graines d'or sont rares : aller bien au-delà du seuil en rapporte un peu plus, mais pas beaucoup. Chaque renaissance débloque surtout de **nouveaux légumes, robots, améliorations et compagnons**.

![Renaissance](docs/img/prestige.png)

### Succès et réglages

85 succès, chacun +2 % de revenus. Dans les **réglages** : écran, taille, opacité, lancement au démarrage de Windows, raccourci clavier, dossier de sauvegarde.

---

## Sauvegarde

Automatique, toutes les 5 s et à la fermeture, dans `%APPDATA%\IdleIt Ferme\save.json` (avec une copie `save.json.bak`). `npm start`, le portable et la version installée utilisent le même fichier.

**Dossier de sauvegarde** (Réglages) : toute la partie tient dans un dossier (`save.json` + `save.json.bak`). « Choisir… » un dossier vide y copie la partie en cours ; choisir un dossier qui contient déjà une partie la charge. Pour jouer sur plusieurs PC, choisis un dossier synchronisé (NAS, cloud…) et ne lance le jeu que sur un PC à la fois. Si la sauvegarde est modifiée ailleurs pendant que le jeu tourne, il ne l'écrase pas : la partie en cours est mise de côté dans `save-conflit-AAAAMMJJ-HHMMSS.json` et le jeu te demande laquelle garder. Les réglages (écran, taille, opacité…) restent propres à chaque PC, dans `%APPDATA%\IdleIt Ferme\settings.json`.

**Mises à jour** : la sauvegarde est hors du dossier d'installation et n'est jamais supprimée, même à la désinstallation. Au chargement, les champs manquants sont complétés et le contenu supprimé est nettoyé. Une partie d'une version antérieure à la 0.11 est convertie : ses renaissances deviennent des graines d'or (12 par renaissance) et ses talents de renaissance sont remboursés.

---

## Développement

Electron + JavaScript, sans framework ni dépendance d'exécution. Node.js 20 ou plus.

```
npm install
npm start                 # jouer
npm run debug             # jouer en affichant les erreurs du jeu dans le terminal
npm run build             # dist/IdleIt-Ferme-portable-x.y.z.exe et l'installateur
```

### Tests et équilibrage

```
node tools/test-v4.js       # renaissances, ères, compagnons multiples, maîtrise, périssabilité, 13 événements
node tools/test-paths.js    # les 27 voies de compagnons (et le verrouillage des légendaires)
node tools/test-market.js   # marché
node tools/test-storm.js    # orages
node tools/test-dense.js    # cultures denses et miniaturisation
node tools/test-giant.js    # les 8 mutations
node tools/sim-life.js 200 20       # partie complète simulée : 20 renaissances, au plus 200 h
npm run sim -- 6 50 bota+bio+trade  # une seule partie (branches, +trade = marché)
npm start -- --farm-savetest        # dossier de sauvegarde et conflits (dossier temporaire)
npm start -- --farm-shots --farm-demo=tools/demo-v4.js   # captures de chaque onglet dans tools/shots
python tools/readme-shots.py        # recadre tools/shots pour docs/img
```

Les captures s'exécutent dans une fenêtre à 1 % d'opacité (invisible à l'écran) qui se ferme toute seule.

`sim-life.js` joue avec un acheteur glouton et accepte des réglages d'essai par variables d'environnement (`PGROW`, `PBASE`, `UNLR`, `GPOW`/`GALL`, `TPOW`, `RPOW`, `DT`, `TRACE=secondes`). Repère clé : la somme des « rendements » de tout ce qui s'achète (effet par niveau / hausse de prix par niveau) doit rester inférieure à 1, sinon chaque partie finit en explosion de quelques minutes. C'est le rôle de `COST_CURVE` dans data.js.

### Ajouter du contenu

Presque tout se trouve dans [src/renderer/js/data.js](src/renderer/js/data.js) : ajoute une entrée dans un tableau et l'interface suit. Le champ `pr` (nombre de renaissances requises) existe sur les graines, les robots, les améliorations et les compagnons.

| Quoi | Tableau | Notes |
|---|---|---|
| Légume | `SEED_LIST` | `[id, nom, famille, forme, feuillage, fruit, pr, options]`. Valeur, temps de pousse, prix et conservation sont calculés (`ECO`, `FAMILIES`). Formes dans `drawPlant` de [sprites.js](src/renderer/js/sprites.js) : `root`, `leafy`, `vine`, `stalk`, `spear`, `ground`, `mandrake`, `cosmic`, `grain`, `tuber`, `pod`, `bulb`, `bush`, `flower`, `mushroom`, `tree`, `cactus`. |
| Famille | `FAMILIES` | Nom et durée de conservation au silo (s). |
| Robot | `ROBOTS` | `walk`, `act`, `fly`, `only` (robot spécialisé), `tag` (ancien, moderne, volant, futur), `hub`, `scare`, `noBattery`, `drain`. Couleurs dans `ROBOT_PAL` de sprites.js. |
| Amélioration | `UPGRADES` | `tab` : `outils`, `champ`, `robots`, `marche`. Effet générique avec `fx: [{ k, mult \| add, fam, seed, robot, tag, ev }]` (lu par `fxMul`/`fxAdd` de core.js), ou codé avec `this.lvl('id')`. `g` est élevé à `COST_CURVE`. |
| Talent de spécialisation | `TALENTS` | `branch`, `req`. Effet avec `this.tal('id')`. |
| Talent de renaissance | `PERKS` | `cat` (voir `PERK_CATS`), `fx` comme les améliorations, ou `this.perk('id')`. |
| Compagnon | `PETS` | `nodes` (arbre, un nœud `evo: true`), `mods(L, evo)` → modificateurs de `PET_MOD_DEFAULTS`, `pr` pour un légendaire (son prix suit le seuil de son ère). Gardez les nœuds hors évolution ≤ 15 points. Sprite : `PET_SPRITES` (`<id>`, `<id>_evo`, une entrée par voie) ; les légendaires sont dessinés par le cas générique de `drawPet`. |
| Voie | `PET_PATHS` | 3 par compagnon, `mods(L, base)` remplace des modificateurs (cri, perchoir, meute, ver, gemmes…). |
| Maîtrise | `MASTERY`, `PET_LEVEL` | Niveaux après le niveau 20, une fois la voie choisie. |
| Événement | `EVENTS`, `EVENT_FX` | Poids `w`, condition `when`, `good`. Logique dans [events.js](src/renderer/js/events.js) (`startEvent`, `update…`), sprites dans sprites.js. |
| Météo | `WEATHER` | `growth`, `evap`, `rain`, `w`, et des effets propres (`frost`, `fog`, `wind`) traités dans `updateWeatherEffects`. |
| Marché | `MARKET`, `TRAITS` | Cours, pénuries/krachs (`shortage`, `crash`), parité des commandes, plafond `parityCap`, pourriture (`rotten`). Logique dans [market.js](src/renderer/js/market.js). |
| Culture dense | `DENSE` | Plants, `costMult`, `growth`. |
| Mutation | `MUTATIONS` | `value`, `harvest`, `growth`, `fail`, `mold`, `infinite`, `catcher`, `good`. |
| Succès | `ACHIEVEMENTS` | `check: g => …` (`g.s` = état sauvegardé). |
| Renaissance | `PRESTIGE` | Seuil `base × growth^renaissances`, gain `gsBase × (gagné / seuil)^gsExp`, emplacements de compagnons. |

### Structure

```
src/main.js                 fenêtre Electron, placement, click-through, raccourci, sauvegarde fichier, captures
src/preload.js              pont sécurisé entre Electron et le jeu
src/renderer/js/data.js     tout le contenu et l'équilibrage
src/renderer/js/core.js     la logique (sans DOM, réutilisée par les tests et le simulateur)
src/renderer/js/pets.js     compagnons (emplacements, arbres, voies, maîtrise)
src/renderer/js/market.js   silos, cours, commandes, fraîcheur, trader, gestionnaire
src/renderer/js/events.js   événements aléatoires et effets de la météo
src/renderer/js/sprites.js  pixel art dessiné en code
src/renderer/js/render.js   rendu de la bande
src/renderer/js/ui.js       HUD, panneau, info-bulles, notifications
src/renderer/js/app.js      boucle, sauvegarde, souris
tools/                      tests, simulateurs, démos de capture, lanceur, icône
docs/img/                   captures du README
```
