// Données statiques du jeu : graines, robots, améliorations, talents, compagnons, événements, succès.
// Fichier partagé entre le jeu (navigateur) et le simulateur d'équilibrage (Node).
(function (root) {
  'use strict';

  // ---------- Renaissances ----------
  // Seuil de la renaissance n° p (p = renaissances déjà faites) : base × growth^p.
  // Graines d'or gagnées : gsBase × (gagné / seuil)^gsExp (au moins 1 au seuil). Chaque graine d'or gagnée : +bonus de revenus.
  // Seuils des renaissances (gagné dans la partie), calibrés avec tools/sim-life.js (CALIB=1) pour que la partie n° p+1 dure
  // environ 5.5 h + 0.27 h × p avec un joueur efficace (≈ 160 h pour 20 renaissances), puis lissés. Au-delà du tableau : ×1000 par renaissance.
  const PRESTIGE = {
    thresholds: [3e8, 2.4e13, 2.3e14, 2.2e15, 2.1e16, 2e17, 1.9e18, 1.9e19, 1.8e20, 1.7e21, 1.7e22, 1.6e23, 1.5e24, 1.5e25, 1.4e26, 1.3e27, 1.3e28, 1.2e29, 1.2e30, 1.1e31],
    gsBase: 5, gsExp: 0.25, bonus: 0.01, petSlots: 1, maxPetSlots: 6,
  };
  const threshold = p => {
    const T = PRESTIGE.thresholds, last = T.length - 1;
    return p <= last ? T[p] : T[last] * Math.pow(1000, p - last);
  };

  // ---------- Légumes ----------
  // Familles : bonus ciblés, durée de conservation au silo (secondes avant de perdre ~63% de fraîcheur).
  const FAMILIES = {
    racine: { name: 'Racines', shelf: 1500 },
    cereale: { name: 'Céréales', shelf: 4000 },
    feuille: { name: 'Feuilles', shelf: 300 },
    fruit: { name: 'Fruits', shelf: 500 },
    legumineuse: { name: 'Légumineuses', shelf: 2500 },
    baie: { name: 'Baies', shelf: 220 },
    fleur: { name: 'Fleurs', shelf: 350 },
    champi: { name: 'Champignons', shelf: 180 },
    exotique: { name: 'Exotiques', shelf: 700 },
    mythique: { name: 'Mythiques', shelf: 1200 },
  };
  // Courbe économique : valeur ×valueR, pousse ×growR par rang. Prix : ×unlockR par légume dans l'ère 1 ;
  // ensuite, le k-ième légume d'une ère coûte eraMult[k] × le seuil de la renaissance précédente.
  const ECO = { valueR: 2.9, growBase: 5, growR: 1.105, growMax: 600, unlockBase: 30, unlockR: 20, eraMult: [0.3, 1, 3] };

  // [id, nom, famille, forme, feuillage, fruit, renaissances requises, options]
  const SEED_LIST = [
    // Ère 1 : dès le départ
    ['radis', 'Radis', 'racine', 'root', '#4fae3c', '#e0405a', 0, { desc: 'Pousse en un clin d\'œil.' }],
    ['carotte', 'Carotte', 'racine', 'root', '#62c23f', '#f28a1e', 0, { desc: 'Le classique du potager.' }],
    ['ble', 'Blé', 'cereale', 'grain', '#c9b04a', '#e8d27a', 0, { desc: 'Peu cher, mais se conserve des heures au silo.' }],
    ['salade', 'Salade', 'feuille', 'leafy', '#6fbf3c', '#c4ec8a', 0, { thirst: 1.4, desc: 'Assoiffée, et s\'abîme vite au silo.' }],
    ['patate', 'Pomme de terre', 'racine', 'tuber', '#5c9a3a', '#c9a06b', 0, { desc: 'Pousse sous terre.' }],
    ['tomate', 'Tomate', 'fruit', 'vine', '#3f9a3a', '#e8372e', 0, { thirst: 1.2, desc: 'Grimpe le long de son tuteur.' }],
    ['haricot', 'Haricot vert', 'legumineuse', 'pod', '#4f9a3a', '#7cc25a', 0, { desc: 'Des gousses à profusion.' }],
    ['chou', 'Chou', 'feuille', 'leafy', '#4f8f68', '#a6d8b0', 1, { desc: 'Robuste et rentable.' }],
    ['oignon', 'Oignon', 'racine', 'bulb', '#6fae3c', '#e8d0a0', 2, { desc: 'Fait pleurer les corbeaux.' }],
    ['mais', 'Maïs', 'cereale', 'stalk', '#69a83a', '#f5d142', 2, { desc: 'Monte très haut.' }],
    ['aubergine', 'Aubergine', 'fruit', 'vine', '#3d8a45', '#6b2d8c', 3, { thirst: 1.2, desc: 'Violette et précieuse.' }],
    ['citrouille', 'Citrouille', 'fruit', 'ground', '#4b9a3a', '#f07f13', 4, { desc: 'Énorme à maturité.' }],
    // Ère 2 et suivantes : se débloquent avec les renaissances
    ['fraise', 'Fraise', 'baie', 'bush', '#3f9a3a', '#e8372e', 4, { desc: 'Délicieuse, mais périt très vite.' }],
    ['poivron', 'Poivron', 'fruit', 'vine', '#3f8f34', '#f2b84b', 5, { desc: 'Jaune, rouge ou vert selon l\'humeur.' }],
    ['pasteque', 'Pastèque', 'fruit', 'ground', '#3f8f34', '#2f8f3a', 6, { fruit2: '#8fd16a', thirst: 1.7, desc: 'Très assoiffée.' }],
    ['brocoli', 'Brocoli', 'feuille', 'leafy', '#3f7f4a', '#4f9a5a', 6, { desc: 'Un petit arbre comestible.' }],
    ['tournesol', 'Tournesol', 'fleur', 'flower', '#4f9a3a', '#ffd84a', 7, { center: '#6b4426', desc: 'Suit le soleil : pousse mieux par beau temps.' }],
    ['riz', 'Riz', 'cereale', 'grain', '#7cc25a', '#f2efe6', 7, { thirst: 2.2, desc: 'Les pieds dans l\'eau.' }],
    ['champignon', 'Champignon', 'champi', 'mushroom', '#e8dcc8', '#c0392b', 8, { night: true, desc: 'Pousse surtout la nuit.' }],
    ['asperge', 'Asperge dorée', 'feuille', 'spear', '#8bb84a', '#f2c84b', 9, { desc: 'Un mets de roi.' }],
    ['ail', 'Ail', 'racine', 'bulb', '#7cc25a', '#f2efe6', 9, { desc: 'Éloigne les vampires et les pucerons.' }],
    ['framboise', 'Framboise', 'baie', 'bush', '#3f8f34', '#c2185b', 10, { desc: 'Fragile comme tout.' }],
    ['artichaut', 'Artichaut', 'fleur', 'flower', '#5a8f6a', '#8fae8f', 10, { center: '#7d3fc4', desc: 'Une fleur qu\'on mange avant qu\'elle n\'éclose.' }],
    ['poireau', 'Poireau', 'feuille', 'stalk', '#4f8f3a', '#e8f2d0', 11, { desc: 'Long et droit.' }],
    ['melon', 'Melon', 'fruit', 'ground', '#4b9a3a', '#d9c27a', 11, { fruit2: '#b8a35a', desc: 'Parfumé.' }],
    ['cafe', 'Café', 'exotique', 'tree', '#2f6a3a', '#c0392b', 12, { desc: 'Réveille même le fermier.' }],
    ['lentille', 'Lentille', 'legumineuse', 'pod', '#6f9a3a', '#a0703a', 12, { desc: 'Petite mais se garde longtemps.' }],
    ['vanille', 'Vanille', 'exotique', 'vine', '#3f8f34', '#f2e0a0', 13, { desc: 'Une orchidée grimpante.' }],
    ['cacao', 'Cacao', 'exotique', 'tree', '#2f6a3a', '#a0602f', 13, { desc: 'Le chocolat commence ici.' }],
    ['safran', 'Safran', 'fleur', 'flower', '#4f9a3a', '#9a4bff', 14, { center: '#ff7a1e', desc: 'L\'or rouge.' }],
    ['truffe', 'Truffe noire', 'champi', 'mushroom', '#5a4a3a', '#2b1d14', 14, { night: true, desc: 'Le diamant noir, pousse la nuit.' }],
    ['mandragore', 'Mandragore', 'mythique', 'mandrake', '#5b7f3a', '#d9b48a', 15, { thirst: 0.8, night: true, desc: 'Pousse surtout la nuit.' }],
    ['ginseng', 'Ginseng', 'racine', 'root', '#4f8f3a', '#e8d0a0', 15, { desc: 'La racine de vie.' }],
    ['pitaya', 'Fruit du dragon', 'exotique', 'cactus', '#4f9a5a', '#ff4f9a', 16, { thirst: 0.5, desc: 'Un cactus qui boit à peine.' }],
    ['lotus', 'Lotus', 'fleur', 'flower', '#3f8f6a', '#ffb0d0', 16, { center: '#ffd84a', thirst: 2, desc: 'Fleurit sur l\'eau.' }],
    ['poivre', 'Poivre de Kampot', 'exotique', 'vine', '#2f6a3a', '#3a2a1a', 17, { desc: 'Piquant et rare.' }],
    ['cosmique', 'Chou cosmique', 'mythique', 'cosmic', '#6a3fc4', '#c7a6ff', 17, { desc: 'Venu d\'ailleurs.' }],
    ['rose', 'Rose éternelle', 'fleur', 'flower', '#2f6a3a', '#e0302a', 18, { center: '#8a1c1c', desc: 'Ne fane jamais au silo.', shelf: 99999 }],
    ['orchidee', 'Orchidée lunaire', 'mythique', 'flower', '#3f5f8f', '#c7a6ff', 18, { center: '#ffffff', night: true, desc: 'S\'ouvre au clair de lune.' }],
    ['magique', 'Haricot magique', 'mythique', 'pod', '#5fd14f', '#7fe3ff', 18, { desc: 'Monte jusqu\'aux nuages.' }],
    ['melon_celeste', 'Melon céleste', 'mythique', 'ground', '#5a6fd1', '#b9f3ff', 19, { fruit2: '#ffffff', desc: 'Il flotte presque.' }],
    ['fruit_astral', 'Fruit astral', 'mythique', 'tree', '#3a2a6b', '#ffe14d', 19, { desc: 'Tombé d\'une étoile.' }],
    ['vide', 'Champignon du vide', 'mythique', 'mushroom', '#1b1040', '#9a7bff', 20, { night: true, desc: 'Pousse dans l\'ombre de rien.' }],
    ['arbre_monde', 'Arbre-monde', 'mythique', 'tree', '#2f8f3a', '#ffd84a', 20, { desc: 'La fin du voyage : il porte toutes les saisons.' }],
  ];

  const eraIndex = {};
  const SEEDS = SEED_LIST.map(([id, name, fam, shape, leaf, fruit, pr, o = {}], i) => {
    const k = eraIndex[pr] = eraIndex[pr] == null ? 0 : eraIndex[pr] + 1;
    const unlock = i === 0 ? 0 : pr === 0 ? ECO.unlockBase * Math.pow(ECO.unlockR, i - 1)
      : threshold(pr - 1) * ECO.eraMult[Math.min(k, ECO.eraMult.length - 1)] * Math.pow(10, Math.max(0, k - ECO.eraMult.length + 1));
    return {
      id, name, fam, shape, leaf, fruit, pr, eraK: k, rank: i, thirst: 1, desc: '', ...o,
      value: o.value || Math.round(Math.pow(ECO.valueR, i) * 100) / 100,
      grow: o.grow || Math.min(ECO.growMax, Math.round(ECO.growBase * Math.pow(ECO.growR, i))),
      unlock: o.unlock != null ? o.unlock : Math.round(unlock),
      shelf: o.shelf || FAMILIES[fam].shelf,
    };
  });
  const FAST_GROW = 30; // en dessous : graine "rapide", au-dessus : graine "lente"

  // ---------- Ouvriers ----------
  const FARMER = { id: 'farmer', name: 'Fermier', walk: 14, act: 1 };

  // only : ne fait que cette tâche ('plant' | 'water' | 'harvest' | 'treat' | 'none') ; tag : famille pour les bonus ;
  // pr : renaissances requises ; noBattery : jamais besoin de recharger ; scare : éloigne les corbeaux ; hub : booste les autres robots.
  const ROBOTS = [
    { id: 'rouille', name: 'Robot rouillé', tag: 'ancien', desc: 'Grince, mais bosse plus vite que toi.', walk: 20, act: 0.85, cost: 150, g: 1.55, max: 12 },
    { id: 'arroseur', name: 'Robot arroseur', tag: 'ancien', desc: 'Ne fait qu\'arroser, très vite.', walk: 26, act: 0.25, cost: 400, g: 1.5, max: 12, only: 'water' },
    { id: 'semeur', name: 'Robot semeur', tag: 'ancien', desc: 'Ne fait que planter, très vite.', walk: 26, act: 0.3, cost: 900, g: 1.5, max: 12, only: 'plant' },
    { id: 'moissonneur', name: 'Moissonneuse', tag: 'moderne', desc: 'Ne fait que récolter, très vite.', walk: 30, act: 0.3, cost: 2500, g: 1.5, max: 12, only: 'harvest' },
    { id: 'paratonnerre', name: 'Robot paratonnerre', tag: 'moderne', desc: 'Lent au quotidien, mais attire la foudre : foudroyé, il devient 200× plus rapide pendant 5 s.', walk: 12, act: 1.3, cost: 3000, g: 1.6, max: 8, rod: true },
    { id: 'soigneur', name: 'Robot soigneur', tag: 'moderne', desc: 'Ne fait que traiter les ravageurs.', walk: 30, act: 0.3, cost: 5000, g: 1.6, max: 8, only: 'treat' },
    { id: 'chrome', name: 'Robot chromé', tag: 'moderne', desc: 'Rapide et brillant.', walk: 32, act: 0.55, cost: 2e4, g: 1.6, max: 12 },
    { id: 'laser', name: 'Robot laser', tag: 'moderne', desc: 'Récolte au laser.', walk: 48, act: 0.35, cost: 3e7, g: 1.65, max: 12, pr: 1 },
    { id: 'epouvantail_r', name: 'Robot épouvantail', tag: 'ancien', desc: 'Ne travaille pas, mais chacun éloigne 15% des corbeaux.', walk: 8, act: 1, cost: 2e8, g: 2.2, max: 5, only: 'none', scare: 0.15, pr: 1 },
    { id: 'drone', name: 'Drone agricole', tag: 'volant', desc: 'Vole au-dessus du champ.', walk: 75, act: 0.22, cost: 2e10, g: 1.7, max: 12, fly: true, pr: 2 },
    { id: 'tracteur', name: 'Tracteur autonome', tag: 'moderne', desc: 'Plante et récolte à toute allure, mais vide sa batterie 2× plus vite.', walk: 24, act: 0.12, cost: 4e11, g: 1.7, max: 8, drain: 2, pr: 3 },
    { id: 'quantique', name: 'Androïde quantique', tag: 'futur', desc: 'Existe à plusieurs endroits à la fois.', walk: 140, act: 0.12, cost: 2e13, g: 1.75, max: 12, pr: 4 },
    { id: 'abeille_meca', name: 'Abeille mécanique', tag: 'volant', desc: 'Ne fait que récolter, en volant, très vite.', walk: 95, act: 0.1, cost: 3e15, g: 1.7, max: 12, fly: true, only: 'harvest', pr: 5 },
    { id: 'golem', name: 'Golem de terre', tag: 'futur', desc: 'Lent, mais n\'a jamais besoin de recharger.', walk: 12, act: 0.3, cost: 2e18, g: 1.8, max: 10, noBattery: true, pr: 7 },
    { id: 'nanoessaim', name: 'Nano-essaim', tag: 'futur', desc: 'Des milliers de robots minuscules : foudroyant, mais vide sa batterie 3× plus vite.', walk: 160, act: 0.05, cost: 5e22, g: 1.8, max: 10, drain: 3, pr: 10 },
    { id: 'ia', name: 'Intelligence centrale', tag: 'futur', desc: 'Ne travaille pas : chaque exemplaire rend tous les autres robots 8% plus efficaces.', walk: 6, act: 1, cost: 2e27, g: 2.5, max: 5, only: 'none', hub: 0.08, noBattery: true, pr: 13 },
  ];

  // Temps d'action de base (secondes) pour le fermier.
  const ACTIONS = { plant: 1.4, water: 0.9, harvest: 1.1, treat: 1.2 };

  // Orages : la foudre tombe toutes les `every` s sur une cible tirée selon ces poids.
  const STORM = {
    every: [3, 8],
    weights: { ground: 6, plot: 1, rod: 5, robot: 0.6, rodRobot: 6, farmer: 0.6, crow: 2 },
    energyTime: 10, energyMult: 100,      // plante dorée foudroyée
    robotFreeze: 2, robotBoost: 1.5,      // robot : figé, puis ×2
    rodRobotTime: 5, rodRobotMult: 200,   // robot paratonnerre
    farmerFreeze: 10,
    cursedTime: 5, crowFreeze: 2,         // corbeau maudit
  };

  // Batteries des robots : autonomie en secondes de travail, recharge complète en secondes, places à la grange.
  const BATTERY = { capacity: 150, charge: 20, slots: 3, low: 0.08, idleDrain: 0.2 };

  // ---------- Effets génériques ----------
  // Une amélioration, un talent de renaissance ou une maîtrise peut porter `fx` : liste d'effets appliqués par niveau.
  //   { k, mult }   : multiplicateur (mult^niveau)       { k, add } : ajout (add × niveau)
  //   ciblage optionnel : fam (famille de légume), seed (id), robot (id), tag (famille de robot), ev (événement)
  // k : value, growth, harvestTime, plantTime, evap, robot, farmer, gold, crow, spoil, price, demand, demandMult,
  //     petXp, click, event, frozen, rain, night, energy, merchant, dense, petCost
  const UPGRADES = [
    // Outils
    { id: 'bottes', tab: 'outils', name: 'Bottes de marche', desc: '+12% vitesse de marche pour tous.', base: 25, g: 1.75, max: 25 },
    { id: 'houe', tab: 'outils', name: 'Houe affûtée', desc: 'Plantation 10% plus rapide.', base: 40, g: 1.8, max: 20 },
    { id: 'arrosoir', tab: 'outils', name: 'Arrosoir XXL', desc: 'Arrosage 12% plus rapide, la terre reste humide +10%.', base: 35, g: 1.8, max: 20 },
    { id: 'faucille', tab: 'outils', name: 'Faucille', desc: 'Récolte 10% plus rapide.', base: 50, g: 1.8, max: 20 },
    { id: 'mainverte', tab: 'outils', name: 'Main verte', desc: 'Tes clics font pousser +2% de plus.', base: 100, g: 2.2, max: 15 },
    { id: 'panier', tab: 'outils', name: 'Panier d\'osier', desc: '+5% de chance de double récolte.', base: 800, g: 2.4, max: 10 },
    { id: 'lampe', tab: 'outils', name: 'Lampe frontale', desc: 'Le fermier travaille aussi la nuit (35% plus lentement) au lieu de dormir.', base: 300, g: 1, max: 1 },
    { id: 'gants', tab: 'outils', name: 'Gants de cuir', desc: 'Récolte 6% plus rapide (tous).', base: 4000, g: 2.3, max: 15, fx: [{ k: 'harvestTime', mult: 0.94 }] },
    { id: 'semoir', tab: 'outils', name: 'Semoir manuel', desc: 'Plantation 6% plus rapide (tous).', base: 6000, g: 2.3, max: 15, fx: [{ k: 'plantTime', mult: 0.94 }] },
    { id: 'brouette', tab: 'outils', name: 'Brouette', desc: 'Fermier +10%.', base: 2e4, g: 2.6, max: 10, fx: [{ k: 'farmer', mult: 1.1 }] },
    { id: 'grelinette', tab: 'outils', name: 'Grelinette', desc: 'Racines ×1.2.', base: 3e3, g: 2.6, max: 15, fx: [{ k: 'value', fam: 'racine', mult: 1.2 }] },
    { id: 'fleau', tab: 'outils', name: 'Fléau à grain', desc: 'Céréales ×1.25.', base: 5e3, g: 2.6, max: 15, fx: [{ k: 'value', fam: 'cereale', mult: 1.25 }] },
    { id: 'cueilleur', tab: 'outils', name: 'Cueille-fruits', desc: 'Fruits ×1.2.', base: 4e4, g: 2.6, max: 15, fx: [{ k: 'value', fam: 'fruit', mult: 1.2 }] },
    { id: 'serpette', tab: 'outils', name: 'Serpette', desc: 'Feuilles ×1.2.', base: 2e4, g: 2.6, max: 15, fx: [{ k: 'value', fam: 'feuille', mult: 1.2 }] },
    { id: 'egrenoir', tab: 'outils', name: 'Égrenoir', desc: 'Légumineuses ×1.25.', base: 3e4, g: 2.6, max: 15, fx: [{ k: 'value', fam: 'legumineuse', mult: 1.25 }] },
    { id: 'secateur', tab: 'outils', name: 'Sécateur fin', desc: 'Baies et fleurs ×1.25.', base: 5e9, g: 2.8, max: 15, pr: 1, fx: [{ k: 'value', fam: 'baie', mult: 1.25 }, { k: 'value', fam: 'fleur', mult: 1.25 }] },
    { id: 'panier_champi', tab: 'outils', name: 'Panier à champignons', desc: 'Champignons ×1.3.', base: 2e13, g: 2.8, max: 15, pr: 3, fx: [{ k: 'value', fam: 'champi', mult: 1.3 }] },
    { id: 'machette', tab: 'outils', name: 'Machette', desc: 'Exotiques ×1.25.', base: 1e17, g: 2.9, max: 15, pr: 5, fx: [{ k: 'value', fam: 'exotique', mult: 1.25 }] },
    { id: 'faucille_or', tab: 'outils', name: 'Faucille d\'or', desc: 'Mythiques ×1.3.', base: 1e21, g: 3, max: 15, pr: 7, fx: [{ k: 'value', fam: 'mythique', mult: 1.3 }] },
    { id: 'loupe', tab: 'outils', name: 'Loupe de botaniste', desc: '+0.2% de chance de légume doré.', base: 1e8, g: 3.2, max: 10, pr: 1, fx: [{ k: 'gold', add: 0.002 }] },
    // Champ
    { id: 'engrais', tab: 'champ', name: 'Engrais', desc: '+10% vitesse de croissance.', base: 150, g: 1.9, max: 30 },
    { id: 'compost', tab: 'champ', name: 'Compost', desc: 'Valeur des légumes ×1.12.', base: 300, g: 2.3, max: 30 },
    { id: 'irrigation', tab: 'champ', name: 'Irrigation', desc: 'Arrose automatiquement une parcelle de plus.', base: 120, g: 1.3, max: 999 },
    { id: 'epouvantail', tab: 'champ', name: 'Épouvantail', desc: '-25% de corbeaux.', base: 1000, g: 6, max: 3 },
    { id: 'contrat', tab: 'champ', name: 'Contrat de marché', desc: 'Prix de vente ×1.4.', base: 2e4, g: 10, max: 8 },
    { id: 'paratonnerres', tab: 'champ', name: 'Paratonnerres', desc: 'Un paratonnerre de plus (posés depuis la droite du champ). Il attire la foudre et protège sa plante ; une plante dorée foudroyée devient énergisée (×100, à récolter en 10 s).', base: 2500, g: 1.35, max: 999 },
    { id: 'serre', tab: 'champ', name: 'Serre-tunnel', desc: 'Plus de malus de nuit ni d\'évaporation en canicule.', base: 5e5, g: 1, max: 1 },
    { id: 'paillage', tab: 'champ', name: 'Paillage', desc: 'La terre sèche 8% moins vite.', base: 2000, g: 2.4, max: 12, fx: [{ k: 'evap', mult: 0.92 }] },
    { id: 'buttes', tab: 'champ', name: 'Buttes de culture', desc: 'Racines et légumineuses : croissance +10%.', base: 8000, g: 2.5, max: 15, fx: [{ k: 'growth', fam: 'racine', mult: 1.1 }, { k: 'growth', fam: 'legumineuse', mult: 1.1 }] },
    { id: 'tuteurs', tab: 'champ', name: 'Tuteurs', desc: 'Fruits : croissance +10%.', base: 3e4, g: 2.5, max: 15, fx: [{ k: 'growth', fam: 'fruit', mult: 1.1 }] },
    { id: 'voiles', tab: 'champ', name: 'Voiles d\'hivernage', desc: 'Feuilles : croissance +10%, et le gel les épargne.', base: 2e4, g: 2.5, max: 15, fx: [{ k: 'growth', fam: 'feuille', mult: 1.1 }] },
    { id: 'sillons', tab: 'champ', name: 'Sillons profonds', desc: 'Céréales : croissance +12%.', base: 5e3, g: 2.5, max: 15, fx: [{ k: 'growth', fam: 'cereale', mult: 1.12 }] },
    { id: 'filets', tab: 'champ', name: 'Filets anti-oiseaux', desc: '-10% de corbeaux et de sauterelles.', base: 5e5, g: 3, max: 5, fx: [{ k: 'crow', mult: 0.9 }, { k: 'event', ev: 'sauterelles', mult: 0.9 }] },
    { id: 'rigoles', tab: 'champ', name: 'Rigoles', desc: 'Sous la pluie, croissance +10% de plus.', base: 1e5, g: 2.8, max: 8, fx: [{ k: 'rain', mult: 1.1 }] },
    { id: 'cloture', tab: 'champ', name: 'Clôture', desc: 'Les sangliers piétinent 20% de plantes en moins.', base: 1e6, g: 3, max: 4, fx: [{ k: 'event', ev: 'sanglier', mult: 0.8 }] },
    { id: 'serre_chauffee', tab: 'champ', name: 'Serre chauffée', desc: 'Le gel n\'abîme plus rien et les plantes poussent +10% la nuit.', base: 3e10, g: 1, max: 1, pr: 1, fx: [{ k: 'night', mult: 1.1 }] },
    { id: 'ruchers', tab: 'champ', name: 'Ruchers', desc: 'Fleurs : croissance +12%.', base: 2e10, g: 2.6, max: 15, pr: 2, fx: [{ k: 'growth', fam: 'fleur', mult: 1.12 }] },
    { id: 'cave', tab: 'champ', name: 'Cave humide', desc: 'Champignons : croissance +15%.', base: 5e13, g: 2.6, max: 15, pr: 3, fx: [{ k: 'growth', fam: 'champi', mult: 1.15 }] },
    { id: 'serre_tropicale', tab: 'champ', name: 'Serre tropicale', desc: 'Exotiques : croissance +12%.', base: 2e17, g: 2.7, max: 15, pr: 5, fx: [{ k: 'growth', fam: 'exotique', mult: 1.12 }] },
    { id: 'cercle', tab: 'champ', name: 'Cercle de pierres', desc: 'Mythiques : croissance +12%.', base: 3e21, g: 2.8, max: 15, pr: 7, fx: [{ k: 'growth', fam: 'mythique', mult: 1.12 }] },
    { id: 'lombricompost', tab: 'champ', name: 'Lombricompost', desc: 'Tous les légumes ×1.08.', base: 1e9, g: 2.9, max: 30, pr: 1, fx: [{ k: 'value', mult: 1.08 }] },
    // Robots
    { id: 'batterie', tab: 'robots', name: 'Moteurs optimisés', desc: 'Robots +15% plus rapides.', base: 3000, g: 2, max: 20 },
    { id: 'bornes', tab: 'robots', name: 'Bornes de recharge', desc: 'Une place de recharge de plus à la grange.', base: 1500, g: 2.2, max: 20 },
    { id: 'charge_rapide', tab: 'robots', name: 'Charge rapide', desc: 'Recharge 30% plus rapide.', base: 1200, g: 2, max: 15 },
    { id: 'capacite', tab: 'robots', name: 'Grosses batteries', desc: 'Autonomie des robots +25%.', base: 1000, g: 2, max: 15 },
    { id: 'solaire', tab: 'robots', name: 'Panneaux solaires', desc: 'Le jour, les batteries s\'usent 2× moins vite.', base: 2e5, g: 1, max: 1 },
    { id: 'turbo', tab: 'robots', name: 'Surcharge', desc: 'Après une recharge : marche +60% pendant 20 s.', base: 3e4, g: 1, max: 1, boost: true },
    { id: 'overclock', tab: 'robots', name: 'Overclocking', desc: 'Après une recharge : actions 2× plus rapides pendant 15 s.', base: 4e5, g: 1, max: 1, boost: true },
    { id: 'calibrage', tab: 'robots', name: 'Calibrage', desc: 'Après une recharge : les 4 récoltes suivantes valent ×2.', base: 5e6, g: 1, max: 1, boost: true },
    { id: 'replant', tab: 'robots', name: 'Algorithme de replantation', desc: 'Chaque récolte replante instantanément.', base: 25000, g: 1, max: 1 },
    { id: 'huile', tab: 'robots', name: 'Huile de graissage', desc: 'Robots anciens (rouillé, arroseur, semeur, épouvantail) +12%.', base: 5000, g: 2.4, max: 15, fx: [{ k: 'robot', tag: 'ancien', mult: 1.12 }] },
    { id: 'puces', tab: 'robots', name: 'Puces neuronales', desc: 'Robots modernes (chromé, laser, moissonneuse, soigneur, tracteur...) +12%.', base: 5e4, g: 2.5, max: 15, fx: [{ k: 'robot', tag: 'moderne', mult: 1.12 }] },
    { id: 'helices', tab: 'robots', name: 'Hélices en carbone', desc: 'Robots volants +15%.', base: 5e11, g: 2.6, max: 15, pr: 2, fx: [{ k: 'robot', tag: 'volant', mult: 1.15 }] },
    { id: 'supraconducteurs', tab: 'robots', name: 'Supraconducteurs', desc: 'Robots du futur (quantique, golem, nano-essaim) +12%.', base: 5e14, g: 2.7, max: 15, pr: 4, fx: [{ k: 'robot', tag: 'futur', mult: 1.12 }] },
    { id: 'blindage', tab: 'robots', name: 'Blindage', desc: 'Les robots restent figés 25% moins longtemps (foudre, corbeaux maudits, tornades...).', base: 3e6, g: 4, max: 3, fx: [{ k: 'frozen', mult: 0.75 }] },
    // Marché (débloqué à MARKET.unlockAt gagnés dans une partie). req : prérequis ; market : nécessite le déblocage.
    { id: 'licence', tab: 'marche', name: 'Licence de trading', desc: 'Les récoltes vont dans les silos pour être revendues au cours du marché. Le surplus part au marché classique (75%, prix fixe).', base: 1e6, g: 1, max: 1, market: true },
    { id: 'silo_cap', tab: 'marche', name: 'Silos agrandis', desc: 'Capacité des silos +50%.', base: 3e5, g: 2.4, max: 10, req: { licence: 1 } },
    { id: 'reseau', tab: 'marche', name: 'Réseau commercial', desc: 'Le marché absorbe 25% de plus avant que les prix ne chutent.', base: 5e5, g: 2.6, max: 10, req: { licence: 1 } },
    { id: 'chambre_froide', tab: 'marche', name: 'Chambre froide', desc: 'Les légumes se gardent 20% plus longtemps au silo.', base: 8e5, g: 2.6, max: 10, req: { licence: 1 }, fx: [{ k: 'spoil', mult: 0.8 }] },
    { id: 'conserverie', tab: 'marche', name: 'Conserverie', desc: 'Les légumes ne descendent plus sous 40% de fraîcheur : plus rien ne pourrit.', base: 5e7, g: 1, max: 1, req: { chambre_froide: 2 } },
    { id: 'publicite', tab: 'marche', name: 'Publicité', desc: 'Une commande du marché de plus en même temps.', base: 2e6, g: 6, max: 3, req: { licence: 1 }, fx: [{ k: 'demand', add: 1 }] },
    { id: 'courtier', tab: 'marche', name: 'Courtier', desc: 'Commandes du marché payées ×1.15.', base: 5e6, g: 3, max: 10, req: { licence: 1 }, fx: [{ k: 'demandMult', mult: 1.15 }] },
    { id: 'cadenas', tab: 'marche', name: 'Cadenas', desc: 'Les voleurs nocturnes ne peuvent plus forcer les silos.', base: 3e6, g: 1, max: 1, req: { licence: 1 } },
    { id: 'trader', tab: 'marche', name: 'Embaucher un trader', desc: 'Vend automatiquement quand le cours est bon, quand ça va pourrir ou quand les silos débordent (commission 10%).', base: 3e6, g: 1, max: 1, req: { licence: 1 } },
    { id: 'trader_comm', tab: 'marche', name: 'Trader : négociation', desc: 'Commission -2%.', base: 2e6, g: 3, max: 5, req: { trader: 1 } },
    { id: 'trader_lots', tab: 'marche', name: 'Trader : ventes fractionnées', desc: 'Vend par plus petits lots pour moins faire baisser les prix.', base: 4e6, g: 3, max: 4, req: { trader: 1 } },
    { id: 'trader_vif', tab: 'marche', name: 'Trader : réactivité', desc: 'Surveille les cours plus souvent.', base: 1.5e6, g: 2.5, max: 5, req: { trader: 1 } },
    { id: 'gestion', tab: 'marche', name: 'Embaucher un gestionnaire', desc: 'Choisit les graines des parcelles selon les cours et les commandes (sans dépasser le seuil d\'épidémie).', base: 2e7, g: 1, max: 1, req: { trader: 1 } },
    { id: 'gestion_part', tab: 'marche', name: 'Gestionnaire : délégation', desc: 'Il gère 25% du champ de plus (25% au départ).', base: 1e7, g: 3, max: 3, req: { gestion: 1 } },
  ];

  // Marché : cours aléatoire (marche au hasard qui revient vers 1) × saturation (ce qu'on a vendu récemment).
  // Les légumes bon marché sont bien plus volatils (jusqu'à trendMax × 10) ; les commandes paient à parité avec ton meilleur légume.
  const MARKET = {
    unlockAt: 1e7,        // gagnés dans une même partie, débloque l'onglet Marché pour toujours
    surplus: 0.75,        // prix du marché classique, fixe
    premium: 1.25,        // le marché paie 25% de plus que le prix de référence (avant cours et saturation)
    siloCost: 4e5, siloG: 2.2, siloMax: 8, siloCap: 150, // capacité d'un silo, en unités
    trendStep: 5, trendVol: [0.04, 0.16], trendPull: 0.035, trendMin: 0.25, trendMax: [2, 10], // [légume le plus cher, le moins cher]
    depth: 40, depthPerPlot: 3, memory: 90, // unités absorbées sans chute de prix ; oubli en ~90 s
    depthTier: 6, depthSlope: 1.5, depthMin: 0.25,
    supplyDepth: 2, supplyMemory: 300,
    traderEvery: 8, traderTarget: 1.05, traderBusy: 0.3, traderBusyTarget: 0.9, traderFull: 0.9, traderFresh: 0.35, commission: 0.1,
    managerEvery: 45,
    demandEvery: [50, 110], demandLife: 200, demandMax: 3,
    // Les commandes paient à parité avec le légume le plus rentable que tu possèdes : de quoi rendre le blé intéressant.
    demandParity: [1.3, 3],
    parityCap: 3,         // prix plafonné à 3× la rentabilité de ton meilleur légume (cours × pénurie × commande)
    rotten: 0.1,          // en dessous de cette fraîcheur, le lot pourrit et disparaît
    // Événements du marché (toutes les `every` s) : pénurie (×mult, plus probable sur les légumes bon marché), krach, modes.
    shockEvery: [150, 300], shortage: [6, 25], crash: [0.15, 0.4], shockLife: [180, 360],
  };
  // Étiquettes des produits (commandes du marché). 'sansogm' : tout sauf l'étiquette ogm.
  const TRAITS = {
    bio: { name: 'bio', w: 3, mult: [1.6, 2.4] },
    sansogm: { name: 'sans OGM', w: 2, mult: [1.2, 1.6] },
    froid: { name: 'résistant au froid', w: 2, mult: [1.8, 2.6] },
    chaleur: { name: 'résistant à la chaleur', w: 2, mult: [1.8, 2.6] },
    sec: { name: 'résistant à la sécheresse', w: 2, mult: [1.8, 2.6] },
    ogm: { name: 'OGM', w: 0 },
    any: { name: '', w: 5, mult: [1, 1.5] },
  };

  const PLOTS = { start: 3, base: 10, g: 1.33 };

  // Cultures denses : un achat fusionne 3 parcelles du niveau précédent en une seule qui produit pour tous ses plants.
  // Gain de place uniquement : planter/récolter, eau et chance de doré suivent le nombre de plants.
  // Le prix des nouvelles parcelles se base sur le nombre total de plants (pas sur les parcelles visibles).
  const DENSE = [
    { id: 'classique', name: 'Parcelle', plants: 1, growth: 1 },
    { id: 'serree', name: 'Culture serrée', plants: 3, growth: 1, costMult: 25, g: 1.2, color: '#7ee081',
      desc: 'Fusionne 3 parcelles en une parcelle serrée de 3 plants : récolte ×3 sur une seule place, mais planter et récolter prennent 3× plus longtemps, elle boit 3× plus et a 3× moins de chances de donner un doré.' },
    { id: 'intensive', name: 'Culture intensive', plants: 9, growth: 1, costMult: 150, g: 1.25, color: '#ffd84a',
      desc: 'Fusionne 3 cultures serrées en une culture intensive de 9 plants (3×3) : ×9 sur une place, actions et eau ×9, dorés ÷9.' },
    { id: 'quantique', name: 'Culture quantique', plants: 27, growth: 0.98, costMult: 900, g: 1.3, color: '#c77dff',
      desc: 'Fusionne 3 cultures intensives en une culture quantique de 27 plants : ×27 sur une place, actions et eau ×27, dorés ÷27, et pousse 2% plus lente.' },
  ];

  // Courbe de prix : chaque niveau coûte g^COST_CURVE fois le précédent (g tel qu'écrit ci-dessus).
  // Toutes les améliorations à niveaux se renchérissent assez vite pour que la ferme progresse sans exploser :
  // la somme des « rendements » (effet par niveau / hausse de prix) doit rester < 1. Vérifier avec tools/sim-life.js.
  const COST_CURVE = 3;
  // Une amélioration de famille n'apparaît qu'avec le premier légume de cette famille.
  const famEra = fam => Math.min(...SEEDS.filter(sd => sd.fam === fam).map(sd => sd.pr));
  for (const u of UPGRADES) {
    const fams = (u.fx || []).map(f => f.fam).filter(Boolean);
    if (fams.length) u.pr = Math.max(u.pr || 0, Math.min(...fams.map(famEra)));
  }
  for (const u of UPGRADES) if (u.g > 1 && u.max > 1 && u.max < 999) u.g = Math.round(Math.pow(u.g, COST_CURVE) * 100) / 100;

  // Miniaturisation : une fois MINI.need robots d'un modèle, ils peuvent devenir minuscules (plus discrets, un peu moins efficaces).
  const MINI = { need: 8, costMult: 40, pace: 0.95 };
  for (const r of ROBOTS) {
    UPGRADES.push({
      id: 'mini_' + r.id, tab: 'robots', name: 'Miniaturisation : ' + r.name,
      desc: `Rend ce modèle minuscule (bien plus discret), mais ${Math.round((1 - MINI.pace) * 100)}% moins efficace.`,
      base: r.cost * MINI.costMult, g: 1, max: 1, needRobots: { id: r.id, n: Math.min(MINI.need, r.max) }, cosmetic: true,
    });
  }

  // Spécialisations : achetées avec l'argent, remises à zéro à la renaissance.
  // Chaque niveau acheté dans une branche rend les AUTRES branches SPEC_PENALTY fois plus chères.
  const BRANCHES = [
    { id: 'meca', name: 'Mécanique', desc: 'Une armée de robots sur des graines rapides.' },
    { id: 'bota', name: 'Botanique', desc: 'Peu d\'actions, des graines rares qui valent une fortune.' },
    { id: 'paysan', name: 'Paysannerie', desc: 'Le fermier et tes clics avant tout.' },
    // Doctrines : group = branches exclusives. Un niveau dans l'une verrouille l'autre jusqu'à la renaissance.
    // Elles ne comptent pas dans la pénalité entre spécialisations.
    { id: 'bio', group: 'doctrine', name: 'Bio', desc: 'Plus lent, mais des légumes qui valent bien plus. Attention aux ravageurs.' },
    { id: 'science', group: 'doctrine', name: 'Science', desc: 'OGM : rendements énormes, valeur unitaire en baisse, gènes de résistance. Mutations et épidémies. Pas de « sans OGM ».' },
  ];
  const TALENTS = [
    { id: 'surcadence', branch: 'meca', name: 'Surcadence', desc: 'Robots +20% plus rapides.', base: 2500, g: 2.2, max: 20 },
    { id: 'usine', branch: 'meca', name: 'Chaîne d\'assemblage', desc: '+2 robots max pour chaque modèle.', base: 10000, g: 4, max: 10 },
    { id: 'echelle', branch: 'meca', name: 'Économies d\'échelle', desc: 'Récoltes des robots +1% par robot possédé.', base: 25000, g: 3.4, max: 20 },
    { id: 'serie', branch: 'meca', name: 'Production en série', desc: 'Graines rapides (pousse en moins de 30 s) ×1.25.', base: 7500, g: 3.2, max: 20 },
    { id: 'recherche', branch: 'bota', name: 'Laboratoire', desc: 'Déblocage des graines -15%.', base: 4000, g: 3.5, max: 8 },
    { id: 'selection', branch: 'bota', name: 'Sélection génétique', desc: 'Tous les légumes ×1.1.', base: 10000, g: 3, max: 20 },
    { id: 'rares', branch: 'bota', name: 'Graines rares', desc: 'Graines lentes (pousse en 30 s ou plus) ×1.3.', base: 2e6, g: 3.2, max: 20 },
    { id: 'croissance', branch: 'bota', name: 'Hormones de croissance', desc: '+15% de croissance.', base: 5000, g: 2.3, max: 20 },
    { id: 'vigueur', branch: 'paysan', name: 'Vigueur', desc: 'Fermier +25% plus rapide.', base: 1500, g: 2, max: 25 },
    { id: 'artisan', branch: 'paysan', name: 'Récolte artisanale', desc: 'Récoltes du fermier et à la main ×1.3.', base: 5000, g: 3.2, max: 20 },
    { id: 'doigte', branch: 'paysan', name: 'Doigté', desc: 'Tes clics font pousser +5% de plus.', base: 2000, g: 2.2, max: 15 },
    { id: 'flair', branch: 'paysan', name: 'Flair', desc: 'Corbeaux, sangliers et marchand rapportent ×1.5, marché en folie +15 s.', base: 15000, g: 3.5, max: 8 },
    { id: 'levetot', branch: 'paysan', name: 'Lève-tôt', desc: 'Avec la lampe, le malus de nuit du fermier -30%.', base: 1000, g: 2.5, max: 3 },
    // Bio
    { id: 'certif', branch: 'bio', name: 'Certification bio', desc: 'Légumes ×1.8, croissance -20%. Sans pesticides, des ravageurs apparaissent.', base: 3000, g: 1, max: 1 },
    { id: 'label', branch: 'bio', name: 'Label rouge', desc: 'Légumes ×1.2.', base: 1e4, g: 3, max: 15, req: { certif: 1 } },
    { id: 'rotation', branch: 'bio', name: 'Rotation des cultures', desc: 'Planter une autre graine que la précédente sur une parcelle : +15% de valeur.', base: 8000, g: 3, max: 5, req: { certif: 1 } },
    { id: 'compagnes', branch: 'bio', name: 'Plantes compagnes', desc: '+6% de croissance par voisine d\'une autre espèce.', base: 6000, g: 2.8, max: 5, req: { certif: 1 } },
    { id: 'purin', branch: 'bio', name: 'Purin d\'ortie', desc: 'Malus de croissance bio -3%.', base: 5000, g: 2.6, max: 5, req: { certif: 1 } },
    { id: 'coccinelles', branch: 'bio', name: 'Coccinelles', desc: 'Ravageurs -15%.', base: 4000, g: 2.6, max: 5, req: { certif: 1 } },
    // Science
    { id: 'labo', branch: 'science', name: 'Laboratoire agronomique', desc: 'Croissance +30%. Active les mutations et le risque d\'épidémie en monoculture.', base: 3000, g: 1, max: 1 },
    { id: 'ogm', branch: 'science', name: 'Palier OGM', desc: 'Rendement ×1.8, mais valeur unitaire ×0.8 et +1% de mutations.', base: 1e4, g: 3.5, max: 10, req: { labo: 1 } },
    { id: 'chimie', branch: 'science', name: 'Engrais chimiques', desc: 'Croissance +12%, mais la terre sèche 8% plus vite.', base: 6000, g: 2.6, max: 10, req: { labo: 1 } },
    { id: 'pesticides', branch: 'science', name: 'Pesticides', desc: 'Corbeaux et sauterelles -25%, mais légumes -3% (résidus).', base: 5000, g: 3, max: 4, req: { labo: 1 } },
    { id: 'crispr', branch: 'science', name: 'Édition génétique', desc: 'Mutations : +10% de chances d\'obtenir une bonne mutation (géante, infinie, carnivore) plutôt qu\'une mauvaise.', base: 3e4, g: 3, max: 5, req: { ogm: 1 } },
    { id: 'gene_froid', branch: 'science', name: 'Gène antigel', desc: 'Plus de malus de nuit ni de gel. Récoltes étiquetées « résistant au froid ».', base: 4e4, g: 1, max: 1, req: { ogm: 1 } },
    { id: 'gene_chaleur', branch: 'science', name: 'Gène thermorésistant', desc: 'La canicule n\'assèche plus la terre. Récoltes « résistant à la chaleur ».', base: 4e4, g: 1, max: 1, req: { ogm: 1 } },
    { id: 'gene_sec', branch: 'science', name: 'Gène sécheresse', desc: 'Une plante sèche pousse quand même à 75%. Récoltes « résistant à la sécheresse ».', base: 6e4, g: 1, max: 1, req: { ogm: 2 } },
    { id: 'banque', branch: 'science', name: 'Banque de graines', desc: 'Risque d\'épidémie -15%.', base: 1e4, g: 2.8, max: 5, req: { labo: 1 } },
  ];

  for (const t of TALENTS) if (t.g > 1) t.g = Math.round(Math.pow(t.g, COST_CURVE) * 100) / 100;

  // Mutations (Science) : tirées à la plantation, visibles dans le champ. good = tirée dans la part « bonne » (Édition génétique).
  // value : × valeur ; harvest : × temps de récolte ; growth : × vitesse de pousse ; fail : chance de ne rien donner ;
  // mold : divise la valeur des plantes voisines ; infinite : grandit sans limite ; catcher : attrape un robot.
  const MUTATIONS = {
    giant: { name: 'Gigantisme', good: true, w: 3, value: 8, harvest: 3, color: '#ff8fff', desc: 'Vaut ×8, mais la récolte prend 3× plus de temps.' },
    infini: { name: 'Infinie', good: true, w: 1, infinite: true, color: '#7fe3ff', desc: 'Grandit sans limite tant qu\'elle n\'est pas récoltée, et sa valeur avec. Les ouvriers la laissent : clique pour la récolter.' },
    carnivore: { name: 'Carnivore', good: true, w: 1, value: 2, catcher: true, color: '#ff5e5e', desc: 'Vaut ×2, mais attrape le premier robot qui vient la récolter : un autre ouvrier doit la récolter pour le libérer.' },
    sterile: { name: 'Stérile', w: 3, value: 0, color: '#9aa3ad', desc: 'Ne vaut rien.' },
    febrile: { name: 'Fébrile', w: 3, fail: 0.5, color: '#ff7b6b', desc: '1 chance sur 2 de ne rien donner.' },
    lente: { name: 'Lente', w: 2, growth: 1 / 6, color: '#5aa9e6', desc: 'Pousse 6× plus lentement.' },
    solide: { name: 'Solide', w: 2, harvest: 5, color: '#b9c2cc', desc: 'La récolte prend 5× plus de temps.' },
    moisi: { name: 'Moisie', w: 1, value: 0, mold: { radius: 3, div: 10 }, color: '#8a9a6a', desc: 'Ne vaut rien, et divise par 10 la valeur des plantes à 3 cases autour tant qu\'elle est là.' },
  };

  // Risques des doctrines
  const BIO = { value: 1.8, growth: 0.8, pestEvery: 480, pestDeath: 150 };
  const SCIENCE = { growth: 1.3, yield: 1.8, unit: 0.8, mutation: 0.02, goodShare: 0.3, blightEvery: 90, blightShare: 0.6 };
  const SPEC_PENALTY = 1.25;

  // ---------- Talents de renaissance (graines d'or) ----------
  // Ciblés plutôt que généralistes. start : effets lus au début de chaque partie.
  const famPerk = (fam, name, base) => ({ id: 'p_' + fam, cat: 'familles', name, desc: `${FAMILIES[fam].name} ×1.3.`, base, g: 1.7, max: 10, fx: [{ k: 'value', fam, mult: 1.3 }] });
  const PERKS = [
    { id: 'tresor', cat: 'depart', name: 'Bas de laine', desc: 'Argent de départ : 100 $, ×6 par niveau.', base: 1, g: 1.8, max: 6 },
    { id: 'terres', cat: 'depart', name: 'Terres héritées', desc: '+1 parcelle au départ.', base: 1, g: 1.6, max: 8 },
    { id: 'memoire', cat: 'depart', name: 'Mémoire des graines', desc: 'Commence avec une graine de l\'ère 1 de plus déjà débloquée.', base: 2, g: 1.9, max: 6 },
    { id: 'fidele', cat: 'depart', name: 'Robot fidèle', desc: 'Commence avec un robot rouillé de plus.', base: 2, g: 2, max: 4 },
    { id: 'athlete', cat: 'ouvriers', name: 'Fermier athlète', desc: 'Fermier +10%.', base: 1, g: 1.5, max: 10, fx: [{ k: 'farmer', mult: 1.1 }] },
    { id: 'pb_ancien', cat: 'ouvriers', name: 'Mécanique ancienne', desc: 'Robots anciens +15%.', base: 2, g: 1.7, max: 8, fx: [{ k: 'robot', tag: 'ancien', mult: 1.15 }] },
    { id: 'pb_moderne', cat: 'ouvriers', name: 'Électronique', desc: 'Robots modernes +15%.', base: 3, g: 1.7, max: 8, fx: [{ k: 'robot', tag: 'moderne', mult: 1.15 }] },
    { id: 'pb_volant', cat: 'ouvriers', name: 'Aéronautique', desc: 'Robots volants +18%.', base: 4, g: 1.7, max: 8, fx: [{ k: 'robot', tag: 'volant', mult: 1.18 }] },
    { id: 'pb_futur', cat: 'ouvriers', name: 'Futurisme', desc: 'Robots du futur +15%.', base: 6, g: 1.7, max: 8, fx: [{ k: 'robot', tag: 'futur', mult: 1.15 }] },
    famPerk('racine', 'Racines profondes', 1), famPerk('cereale', 'Grenier ancestral', 1), famPerk('feuille', 'Feuilles tendres', 1),
    famPerk('fruit', 'Verger familial', 2), famPerk('legumineuse', 'Cosses pleines', 2), famPerk('baie', 'Ronces bénies', 3),
    famPerk('fleur', 'Pollen d\'or', 3), famPerk('champi', 'Mycélium', 4), famPerk('exotique', 'Comptoir colonial', 5), famPerk('mythique', 'Grimoire', 7),
    { id: 'ciel', cat: 'nature', name: 'Faveur du ciel', desc: 'Pluie +25% plus fréquente.', base: 2, g: 2, max: 4 },
    { id: 'foudre', cat: 'nature', name: 'Enfant de l\'orage', desc: 'Les plantes énergisées valent 50% de plus.', base: 3, g: 2, max: 4, fx: [{ k: 'energy', mult: 1.5 }] },
    { id: 'nuit', cat: 'nature', name: 'Noctambule', desc: 'Les plantes poussent 6% mieux la nuit.', base: 2, g: 1.8, max: 5, fx: [{ k: 'night', mult: 1.06 }] },
    { id: 'meteo', cat: 'nature', name: 'Bonne étoile', desc: 'Événements heureux (étoile filante, arc-en-ciel, oies, touristes...) 20% plus fréquents.', base: 3, g: 1.9, max: 5, fx: [{ k: 'event', ev: 'good', mult: 1.2 }] },
    { id: 'or', cat: 'nature', name: 'Doigts d\'or', desc: '+0.25% de chance de légume doré.', base: 3, g: 1.7, max: 8, fx: [{ k: 'gold', add: 0.0025 }] },
    { id: 'chasseur', cat: 'nature', name: 'Chasseur', desc: 'Corbeaux, sangliers et voleurs chassés rapportent ×1.5.', base: 2, g: 2, max: 4 },
    { id: 'dresseur', cat: 'compagnons', name: 'Dresseur', desc: 'Compagnons +20% d\'XP.', base: 2, g: 1.8, max: 6, fx: [{ k: 'petXp', mult: 1.2 }] },
    { id: 'eleveur', cat: 'compagnons', name: 'Éleveur', desc: 'Adoptions 40% moins chères.', base: 2, g: 2, max: 3, fx: [{ k: 'petCost', mult: 0.6 }] },
    { id: 'negociant', cat: 'commerce', name: 'Négociant', desc: 'Marchand ambulant +50% et commission du trader -2%.', base: 2, g: 1.9, max: 5 },
    { id: 'frigo', cat: 'commerce', name: 'Frigo de famille', desc: 'Les légumes se gardent 12% plus longtemps.', base: 2, g: 1.8, max: 6, fx: [{ k: 'spoil', mult: 0.88 }] },
    { id: 'contacts', cat: 'commerce', name: 'Carnet d\'adresses', desc: 'Commandes du marché payées ×1.15.', base: 3, g: 1.8, max: 6, fx: [{ k: 'demandMult', mult: 1.15 }] },
    { id: 'genie', cat: 'commerce', name: 'Génie rural', desc: 'Cultures denses 20% moins chères.', base: 4, g: 2, max: 4, fx: [{ k: 'dense', mult: 0.8 }] },
    { id: 'rabais', cat: 'commerce', name: 'Négociateur', desc: 'Améliorations, robots et parcelles -5%.', base: 4, g: 2, max: 5 },
  ];
  const PERK_CATS = { depart: 'Départ', ouvriers: 'Ouvriers', familles: 'Familles de légumes', nature: 'Nature et événements', compagnons: 'Compagnons', commerce: 'Commerce' };

  // ---------- Compagnons ----------
  // Emplacements : 1 + 1 par renaissance (max PRESTIGE.maxPetSlots). Le même animal peut occuper plusieurs emplacements.
  // À chaque renaissance, les compagnons reviennent au niveau 0 (on les garde, sans les racheter).
  // mods(L, evo) renvoie les modificateurs lus par core.js (voir PET_MOD_DEFAULTS) ; L('noeud') = niveau d'un nœud ou d'une maîtrise.
  // Plusieurs compagnons : multiplicateurs multipliés, ajouts additionnés, interrupteurs combinés (voir pets.js).
  const PET_MOD_DEFAULTS = {
    aura: null,          // { mult, radius, value, evap } : croissance ×mult, valeur ×value, évaporation ×evap autour du compagnon
    chicks: 0,           // compagnons supplémentaires qui portent aussi l'aura
    nightSpeed: 1,       // vitesse d'écoulement du temps la nuit (>1 = nuits plus courtes)
    nightRelief: 0,      // 0..1 : réduit les malus de nuit (plantes et fermier)
    crowHunter: null,    // { delay, reward } : chasse les corbeaux posés après delay s, rapporte reward × la récompense d'un clic
    noCrows: false,
    farmerSpeed: 1, robotSpeed: 1, farmerHarvest: 1,
    clickBoost: 0,
    golden: 0, goldenMult: 1, double: 0, nothing: 0,
    frenzyFreq: 1, cartMult: 1,
    irrigateExtra: 0, irrigGrowth: 1,
    fastGrowth: 1, slowGrowth: 1, headStart: 0,
    valueAll: 1,
    honey: null,         // { every, secs } : toutes les every s, rapporte secs secondes de revenus
    petWorker: null,     // définition d'ouvrier : le compagnon travaille lui-même
    move: 'wander',      // 'wander' | 'farmer' (suit le fermier) | 'fly' | 'dig'
    // Voies (après évolution) :
    cry: null,           // { every, boost, freeze, block: { seed, radius } } : cri périodique
    auraNoNight: false,  // pas de nuit pour les plantes de l'aura
    chargeMult: 1,       // vitesse de recharge des robots
    batteryDrain: 1,     // usure des batteries
    perch: false,        // se perche sur un robot au repos : ce robot ×2
    autoCart: false,     // ramène le marchand tout seul
    noCart: false,       // le marchand ne vient plus
    petWorkerCount: 1,   // nombre d'ouvriers-compagnons (meute)
    farmerNoSleep: false,
    crowMult: 1,         // fréquence des corbeaux
    ripenEvery: 0,       // fait mûrir une plante au hasard toutes les N s
    gem: null,           // { chance, mult } : une récolte sur 1/chance vaut mult× plus
    worm: null,          // { every, radius } : surgit et fait mûrir autour, dévore la plante du centre
    noPests: false,
    growthAll: 1,
    noSolar: false,
    stormMult: 1,        // fréquence des orages
    chaseBoar: false,    // chasse les sangliers
    guardSilo: false,    // garde les silos contre les voleurs
  };

  // XP : 1 par seconde active. Niveaux 1-20 : arbre ; 21-30 : maîtrise (une fois la voie choisie).
  const PET_LEVEL = { max: 20, base: 50, g: 1.21, perHarvest: 0.1, perPet: 3, masteryMax: 10, masteryBase: 1200, masteryG: 1.25 };
  // Maîtrise : 4 nœuds communs à tous les compagnons (effets lus dans mods via L('m_force')...).
  const MASTERY = [
    { id: 'm_force', name: 'Force', desc: 'Son bonus principal est 15% plus fort.', max: 4, cost: 1 },
    { id: 'm_sagesse', name: 'Sagesse', desc: 'Son malus est 20% plus faible.', max: 3, cost: 1 },
    { id: 'm_eclat', name: 'Éclat', desc: 'Les effets de sa voie sont 15% plus puissants (ou plus fréquents).', max: 4, cost: 1 },
    { id: 'm_aura', name: 'Rayonnement', desc: 'Tous les légumes +3%.', max: 3, cost: 1 },
  ];
  // Raccourcis pour écrire les mods : force (bonus ×), sage (malus atténué), eclat (voie), et leur forme « fréquence ».
  const F = L => 1 + 0.15 * L('m_force');
  const S = (L, malus) => 1 - (1 - malus) * (1 - 0.2 * L('m_sagesse')); // malus < 1 (multiplicateur pénalisant)
  const E = L => 1 + 0.15 * L('m_eclat');

  const PETS = [
    {
      id: 'poussin', name: 'Poussin', evoName: 'Coq', cost: 50, color: '#ffd84a',
      desc: 'Les plantes autour de lui poussent 25% plus vite.', malus: 'Il picore : les récoltes dans son aura valent -15%.',
      meta: 'Botanique, graines lentes',
      nodes: [
        { id: 'croissance', name: 'Picorage fertile', desc: 'Aura +15% de croissance.', max: 5, cost: 1 },
        { id: 'rayon', name: 'Promenade', desc: 'Rayon de l\'aura +8.', max: 3, cost: 1 },
        { id: 'digestion', name: 'Estomac sage', desc: 'Malus de picorage -5%.', max: 3, cost: 1, req: { croissance: 2 } },
        { id: 'nid', name: 'Nid douillet', desc: 'La terre sèche 30% moins vite dans l\'aura.', max: 2, cost: 1, req: { rayon: 1 } },
        { id: 'coq', evo: true, name: 'Devenir Coq', desc: 'Le coq appelle 3 poussins, les nuits durent 45% de moins et il chasse les corbeaux.', max: 1, cost: 5, req: { croissance: 5, rayon: 3 } },
      ],
      mods: (L, evo) => ({
        aura: { mult: 1 + (0.25 + 0.15 * L('croissance')) * F(L), radius: 16 + 8 * L('rayon'), value: S(L, 0.85 + 0.05 * L('digestion')), evap: 1 - 0.3 * L('nid') },
        chicks: evo ? 3 : 0,
        nightSpeed: evo ? 1 / 0.55 : 1,
        crowHunter: evo ? { delay: 2, reward: 0.5 } : null,
        valueAll: 1 + 0.03 * L('m_aura'),
      }),
    },
    {
      id: 'chien', name: 'Chien', evoName: 'Chien de berger', cost: 5000, color: '#a8723c',
      desc: 'Suit le fermier, le motive, chasse les corbeaux et les sangliers.', malus: 'Il aboie sur les robots : robots -15%.',
      meta: 'Paysannerie, peu de robots',
      nodes: [
        { id: 'endurance', name: 'Compagnon de route', desc: 'Fermier +8% plus rapide.', max: 5, cost: 1 },
        { id: 'dressage', name: 'Dressage', desc: 'Malus sur les robots -5%.', max: 3, cost: 1 },
        { id: 'rapporteur', name: 'Rapporteur', desc: 'Les corbeaux chassés rapportent +25% de plus.', max: 3, cost: 1, req: { endurance: 1 } },
        { id: 'complice', name: 'Complice', desc: 'Tes clics font pousser +3% de plus.', max: 3, cost: 1, req: { endurance: 2 } },
        { id: 'berger', evo: true, name: 'Devenir Chien de berger', desc: 'Il récolte lui-même, garde les silos, et les récoltes du fermier valent ×1.3.', max: 1, cost: 5, req: { endurance: 5, rapporteur: 1 } },
      ],
      mods: (L, evo) => ({
        farmerSpeed: 1 + (0.2 + 0.08 * L('endurance')) * F(L),
        robotSpeed: S(L, 0.85 + 0.05 * L('dressage')),
        crowHunter: { delay: 3, reward: 0.25 + 0.25 * L('rapporteur') },
        clickBoost: 0.03 * L('complice'),
        farmerHarvest: evo ? 1.3 : 1,
        petWorker: evo ? { id: 'chien', name: 'Chien de berger', walk: 40, act: 0.5, harvestOnly: true } : null,
        move: 'farmer',
        chaseBoar: true, guardSilo: evo,
        valueAll: 1 + 0.03 * L('m_aura'),
      }),
    },
    {
      id: 'chat', name: 'Chat', evoName: 'Chat porte-bonheur', cost: 2e5, color: '#3a3a44',
      desc: 'Porte chance : +1% de légumes dorés et des doubles récoltes. Voit la nuit.', malus: 'Il joue avec les légumes : 6% des récoltes sont perdues.',
      meta: 'Clics, Doigts d\'or, Flair',
      nodes: [
        { id: 'chance', name: 'Moustaches chanceuses', desc: '+0.5% de chance de légume doré.', max: 5, cost: 1 },
        { id: 'agilite', name: 'Agilité', desc: '+3% de chance de double récolte.', max: 3, cost: 1 },
        { id: 'sagesse', name: 'Sagesse féline', desc: 'Récoltes perdues -2%.', max: 3, cost: 1, req: { agilite: 1 } },
        { id: 'nocturne', name: 'Vision nocturne', desc: 'Malus de nuit -33%.', max: 3, cost: 1, req: { chance: 2 } },
        { id: 'maneki', evo: true, name: 'Devenir Porte-bonheur', desc: 'Légumes dorés ×2, marché en folie 2× plus fréquent, marchand ×3.', max: 1, cost: 5, req: { chance: 5, agilite: 3 } },
      ],
      mods: (L, evo) => ({
        golden: (0.01 + 0.005 * L('chance')) * F(L),
        double: 0.03 * L('agilite'),
        nothing: (0.06 - 0.02 * L('sagesse')) * (1 - 0.2 * L('m_sagesse')),
        nightRelief: Math.min(1, 0.33 * L('nocturne')),
        goldenMult: evo ? 2 : 1,
        frenzyFreq: evo ? 0.5 : 1,
        cartMult: evo ? 3 : 1,
        valueAll: 1 + 0.03 * L('m_aura'),
      }),
    },
    {
      id: 'taupe', name: 'Taupe', evoName: 'Reine des taupes', cost: 5e6, color: '#5b4a5e',
      desc: 'Creuse des galeries : 3 parcelles irriguées gratuites, graines rapides +10%.', malus: 'Abîme les grosses racines : graines lentes -25% de croissance.',
      meta: 'Mécanique, graines rapides',
      nodes: [
        { id: 'galeries', name: 'Galeries', desc: '+2 parcelles irriguées gratuitement.', max: 5, cost: 1 },
        { id: 'terreau', name: 'Terreau aéré', desc: 'Graines rapides +6% de croissance.', max: 5, cost: 1 },
        { id: 'racines', name: 'Délicatesse', desc: 'Malus des graines lentes -5%.', max: 2, cost: 1 },
        { id: 'taupinieres', name: 'Taupinières', desc: 'Après une récolte, la plante suivante démarre à +4%.', max: 3, cost: 1, req: { terreau: 2 } },
        { id: 'reine', evo: true, name: 'Devenir Reine', desc: 'Robots +30% (ils passent par les tunnels), la plante suivante démarre à +15%, malus des graines lentes divisé par 2.', max: 1, cost: 5, req: { galeries: 5, terreau: 5 } },
      ],
      mods: (L, evo) => {
        const slow = 0.75 + 0.05 * L('racines');
        return {
          irrigateExtra: 3 + 2 * L('galeries'),
          fastGrowth: 1 + (0.1 + 0.06 * L('terreau')) * F(L),
          slowGrowth: S(L, evo ? 1 - (1 - slow) / 2 : slow),
          headStart: 0.04 * L('taupinieres') + (evo ? 0.15 : 0),
          robotSpeed: evo ? 1.3 : 1,
          move: 'dig',
          valueAll: 1 + 0.03 * L('m_aura'),
        };
      },
    },
    {
      id: 'abeille', name: 'Abeille', evoName: 'Essaim royal', cost: 1e8, color: '#f2b84b',
      desc: 'Pollinise tout le champ (+5%) et produit du miel (3 s de récoltes par minute).', malus: 'Pique le fermier : fermier -25%.',
      meta: 'Mécanique, irrigation',
      nodes: [
        { id: 'pollen', name: 'Pollinisation', desc: 'Tous les légumes +3%.', max: 5, cost: 1 },
        { id: 'miel', name: 'Miel', desc: 'Le miel rapporte +3 s de récoltes par minute.', max: 3, cost: 1 },
        { id: 'apiculteur', name: 'Apiculteur', desc: 'Malus sur le fermier -8%.', max: 3, cost: 1 },
        { id: 'butinage', name: 'Butinage', desc: 'Parcelles irriguées +10% de croissance.', max: 3, cost: 1, req: { pollen: 2 } },
        { id: 'essaim', evo: true, name: 'Devenir Essaim royal', desc: 'Légumes +10% de plus, plus aucun corbeau, miel ×1.5.', max: 1, cost: 5, req: { pollen: 5, miel: 1 } },
      ],
      mods: (L, evo) => ({
        valueAll: (1 + (0.05 + 0.03 * L('pollen') + (evo ? 0.1 : 0)) * F(L)) * (1 + 0.03 * L('m_aura')),
        honey: { every: 60, secs: (3 + 3 * L('miel')) * (evo ? 1.5 : 1) },
        farmerSpeed: S(L, 0.75 + 0.08 * L('apiculteur')),
        irrigGrowth: 1 + 0.1 * L('butinage'),
        noCrows: evo,
        move: 'fly',
      }),
    },
    // ---------- Compagnons légendaires : plus puissants, mais seulement après plusieurs renaissances (pr) ----------
    {
      id: 'renard', name: 'Renard', evoName: 'Renard argenté', pr: 2, color: '#e07a2e',
      desc: 'Rusé : chasse corbeaux, sangliers et voleurs, +4% de doubles récoltes et +0.5% de légumes dorés.', malus: 'Chapardeur : 3% des récoltes disparaissent.',
      meta: 'Événements, clics, marché',
      nodes: [
        { id: 'ruse', name: 'Ruse', desc: '+2% de doubles récoltes.', max: 5, cost: 1 },
        { id: 'flair_r', name: 'Flair', desc: '+0.3% de légumes dorés.', max: 5, cost: 1 },
        { id: 'terrier', name: 'Terrier', desc: 'Après une récolte, la plante suivante démarre à +3%.', max: 3, cost: 1, req: { ruse: 2 } },
        { id: 'traque', name: 'Traque', desc: 'Les corbeaux chassés rapportent +30%.', max: 2, cost: 1, req: { flair_r: 1 } },
        { id: 'argente', evo: true, name: 'Devenir Renard argenté', desc: 'Légumes dorés ×1.5, marchand ×2 et tous les légumes +10%.', max: 1, cost: 5, req: { ruse: 5, flair_r: 5 } },
      ],
      mods: (L, evo) => ({
        double: (0.04 + 0.02 * L('ruse')) * F(L),
        golden: (0.005 + 0.003 * L('flair_r')) * F(L),
        nothing: 0.03 * (1 - 0.2 * L('m_sagesse')),
        headStart: 0.03 * L('terrier'),
        crowHunter: { delay: 1.5, reward: 0.5 + 0.3 * L('traque') },
        chaseBoar: true, guardSilo: true,
        goldenMult: evo ? 1.5 : 1, cartMult: evo ? 2 : 1,
        valueAll: (evo ? 1.1 : 1) * (1 + 0.03 * L('m_aura')),
      }),
    },
    {
      id: 'hibou', name: 'Hibou', evoName: 'Grand-duc', pr: 5, color: '#8a6a4a',
      desc: 'Veille la nuit : les nuits passent 40% plus vite et les plantes n\'y perdent plus que la moitié de leur vitesse.', malus: 'Il hulule toute la nuit : le fermier dort mal (-10%).',
      meta: 'Nuit, mandragores, graines lentes',
      nodes: [
        { id: 'veille', name: 'Veille', desc: 'Nuits encore 10% plus courtes.', max: 5, cost: 1 },
        { id: 'plumes', name: 'Plumes silencieuses', desc: 'Malus de nuit -10%.', max: 3, cost: 1 },
        { id: 'serres', name: 'Serres', desc: 'Chasse les corbeaux (+30% de récompense par niveau).', max: 3, cost: 1, req: { veille: 2 } },
        { id: 'savoir', name: 'Savoir nocturne', desc: 'Tous les légumes +3%.', max: 4, cost: 1, req: { plumes: 1 } },
        { id: 'grandduc', evo: true, name: 'Devenir Grand-duc', desc: 'Le fermier ne dort plus et les corbeaux n\'osent plus approcher.', max: 1, cost: 5, req: { veille: 5, plumes: 3 } },
      ],
      mods: (L, evo) => ({
        nightSpeed: 1 + (0.4 + 0.1 * L('veille')) * F(L),
        nightRelief: Math.min(1, 0.5 + 0.1 * L('plumes')),
        crowHunter: L('serres') ? { delay: 1, reward: 0.3 * L('serres') } : null,
        valueAll: (1 + 0.03 * L('savoir')) * (1 + 0.03 * L('m_aura')),
        farmerSpeed: S(L, 0.9),
        farmerNoSleep: evo, noCrows: evo,
        move: 'fly',
      }),
    },
    {
      id: 'licorne', name: 'Licorne', evoName: 'Licorne ailée', pr: 9, color: '#f4f1ea',
      desc: 'Aura magique : les plantes autour d\'elle poussent 60% plus vite et valent 20% de plus.', malus: 'Elle ne supporte pas les machines : robots -10%.',
      meta: 'Botanique, graines lentes, dorés',
      nodes: [
        { id: 'magie', name: 'Magie', desc: 'Aura +15% de croissance.', max: 5, cost: 1 },
        { id: 'crin', name: 'Crinière', desc: 'Rayon de l\'aura +10.', max: 3, cost: 1 },
        { id: 'prisme', name: 'Prisme', desc: '+0.5% de légumes dorés.', max: 4, cost: 1, req: { magie: 2 } },
        { id: 'purete', name: 'Pureté', desc: 'Légumes de l\'aura +5%.', max: 3, cost: 1, req: { crin: 1 } },
        { id: 'ailee', evo: true, name: 'Devenir Licorne ailée', desc: 'Elle s\'envole : aura 2× plus large et +2% de légumes dorés.', max: 1, cost: 5, req: { magie: 5, crin: 3 } },
      ],
      mods: (L, evo) => ({
        aura: { mult: 1 + (0.6 + 0.15 * L('magie')) * F(L), radius: (24 + 10 * L('crin')) * (evo ? 2 : 1), value: 1.2 + 0.05 * L('purete'), evap: 1 },
        golden: 0.005 * L('prisme') + (evo ? 0.02 : 0),
        robotSpeed: S(L, 0.9),
        valueAll: 1 + 0.03 * L('m_aura'),
        move: evo ? 'fly' : 'wander',
      }),
    },
    {
      id: 'dragon', name: 'Dragonnet', evoName: 'Dragon ancien', pr: 14, color: '#3f9a4a',
      desc: 'Gardien légendaire : tous les légumes +40%, fermier et robots +20%.', malus: 'Il attire les orages (2× plus fréquents).',
      meta: 'Tout, surtout les grosses fermes',
      nodes: [
        { id: 'magot', name: 'Magot', desc: 'Tous les légumes +8%.', max: 5, cost: 1 },
        { id: 'ailes', name: 'Ailes', desc: 'Robots +5%.', max: 5, cost: 1 },
        { id: 'souffle', name: 'Souffle chaud', desc: 'Fermier +8%.', max: 3, cost: 1, req: { magot: 2 } },
        { id: 'ecailles', name: 'Écailles', desc: 'Orages attirés -25%.', max: 2, cost: 1, req: { ailes: 1 } },
        { id: 'ancien', evo: true, name: 'Devenir Dragon ancien', desc: 'Il s\'envole : tous les légumes +30% de plus, et les batteries des robots s\'usent 2× moins.', max: 1, cost: 5, req: { magot: 5, ailes: 5 } },
      ],
      mods: (L, evo) => ({
        valueAll: (1 + (0.4 + 0.08 * L('magot')) * F(L)) * (evo ? 1.3 : 1) * (1 + 0.03 * L('m_aura')),
        robotSpeed: 1.2 + 0.05 * L('ailes'),
        farmerSpeed: 1.2 + 0.08 * L('souffle'),
        stormMult: 1 + (1 - 0.25 * L('ecailles')) * (1 - 0.2 * L('m_sagesse')),
        batteryDrain: evo ? 0.5 : 1,
        move: evo ? 'fly' : 'wander',
      }),
    },
  ];

  // Voies : choisies une fois le compagnon évolué ET au niveau max. Définitives jusqu'à la renaissance.
  // mods(L, base) renvoie des modificateurs qui remplacent ceux de base (base = résultat de mods du compagnon).
  const PET_PATHS = {
    poussin: [
      { id: 'basilic', name: 'Basilic', desc: 'Toutes les 45 s, il pousse un cri : toutes les plantes gagnent +50% de croissance.',
        malus: 'Les robots se figent 1 s à chaque cri. Ne peut pas crier à moins de 4 parcelles d\'une mandragore.',
        mods: L => ({ cry: { every: 45 / E(L), boost: 0.5, freeze: 1, block: { seed: 'mandragore', radius: 4 } } }) },
      { id: 'phenix', name: 'Phénix', desc: 'Son aura brille : pas de nuit pour les plantes touchées, et les robots se rechargent 50% plus vite.',
        malus: 'Sa chaleur assèche énormément les plantes de son aura, plus vite que les arroseurs (cumulé avec la canicule).',
        mods: (L, b) => ({ aura: { ...b.aura, evap: 6 }, auraNoNight: true, chargeMult: 1 + 0.5 * E(L) }) },
      { id: 'rapace', name: 'Rapace', desc: 'Attaque tous les corbeaux, ramène automatiquement le marchand ambulant, et se perche sur un robot quand il n\'a rien à faire (ce robot devient 2× plus efficace).',
        malus: 'Plus d\'aura de croissance, plus de poussins.',
        mods: L => ({ aura: null, chicks: 0, crowHunter: { delay: 0.5, reward: E(L) }, autoCart: true, perch: true, move: 'fly', chaseBoar: true }) },
    ],
    chien: [
      { id: 'cerbere', name: 'Cerbère', desc: 'Garde de nuit : la nuit, il récolte 2× plus vite, chasse aussitôt les corbeaux et garde les silos.',
        malus: 'Le jour, il dort à la grange.',
        mods: (L, b) => ({ petWorker: { ...b.petWorker, walk: 60 * E(L), act: 0.25, onlyAt: 'night' }, crowHunter: { delay: 0.3, reward: b.crowHunter.reward }, guardSilo: true }) },
      { id: 'loup', name: 'Loup alpha', desc: 'Mène une meute : 2 loups de plus récoltent avec lui.',
        malus: 'La meute fait fuir le marchand ambulant.',
        mods: L => ({ petWorkerCount: 3 + (L('m_eclat') >= 4 ? 1 : 0), noCart: true }) },
      { id: 'saintbernard', name: 'Saint-Bernard', desc: 'Le fermier ne dort plus, ne ralentit plus la nuit et devient 50% plus rapide.',
        malus: 'Le chien ne récolte plus, et il surveille les robots de trop près (-30%).',
        mods: (L, b) => ({ petWorker: null, farmerNoSleep: true, farmerSpeed: b.farmerSpeed * (1 + 0.5 * E(L)), robotSpeed: S(L, 0.7), move: 'farmer' }) },
    ],
    chat: [
      { id: 'noir', name: 'Chat noir', desc: 'Légumes dorés 2× plus fréquents, et il attire les orages (3× plus fréquents) : de quoi énergiser les dorés.',
        malus: 'Porte malheur : 2× plus de corbeaux et 10% des récoltes perdues.',
        mods: (L, b) => ({ golden: b.golden * 2 * E(L), nothing: 0.1 * (1 - 0.2 * L('m_sagesse')), crowMult: 2, stormMult: 3 }) },
      { id: 'lynx', name: 'Lynx', desc: 'Chasse les corbeaux et +15% de doubles récoltes.',
        malus: 'Ne porte plus chance : plus de légumes dorés grâce à lui.',
        mods: (L, b) => ({ golden: 0, goldenMult: 1, double: b.double + 0.15 * E(L), crowHunter: { delay: 1, reward: 0.8 } }) },
      { id: 'cheshire', name: 'Chat du Cheshire', desc: 'Toutes les 15 s, il apparaît sur une plante et la fait mûrir instantanément. Le marchand paie ×5.',
        malus: 'Ses nuits sont interminables : elles durent 40% de plus.',
        mods: L => ({ ripenEvery: 15 / E(L), cartMult: 5, nightSpeed: 0.7 }) },
    ],
    taupe: [
      { id: 'foreuse', name: 'Foreuse', desc: 'Taupe mécanique : tout le champ est irrigué et les robots sont 50% plus rapides.',
        malus: 'Elle consomme de l\'énergie : les batteries des robots se vident 50% plus vite.',
        mods: L => ({ irrigateExtra: 999, robotSpeed: 1 + 0.5 * E(L), batteryDrain: 1 + 0.5 * (1 - 0.2 * L('m_sagesse')) }) },
      { id: 'cristal', name: 'Taupe de cristal', desc: 'Déterre des gemmes : 3% des récoltes valent 15× plus.',
        malus: 'Ses cristaux blessent les racines : graines lentes -50%.',
        mods: L => ({ gem: { chance: 0.03 * E(L), mult: 15 }, slowGrowth: S(L, 0.5) }) },
      { id: 'ver', name: 'Ver des sables', desc: 'Toutes les 40 s, il surgit du sol : les plantes autour (3 de chaque côté) mûrissent instantanément.',
        malus: 'Il dévore la plante sous laquelle il surgit.',
        mods: L => ({ worm: { every: 40 / E(L), radius: 3 } }) },
    ],
    abeille: [
      { id: 'guerriere', name: 'Reine guerrière', desc: 'Des frelons : ils chassent tous les corbeaux, les sauterelles et dévorent les ravageurs.',
        malus: 'Ils piquent le fermier (-50%) et ne font plus de miel.',
        mods: L => ({ crowHunter: { delay: 0.5, reward: E(L) }, noPests: true, farmerSpeed: S(L, 0.5), honey: null }) },
      { id: 'doree', name: 'Ruche dorée', desc: 'Miel ×2 et +2% de légumes dorés.',
        malus: 'Elles ne pollinisent plus : le bonus de valeur disparaît.',
        mods: (L, b) => ({ honey: { ...b.honey, secs: b.honey.secs * 2 * E(L) }, golden: 0.02, valueAll: 1 + 0.03 * L('m_aura') }) },
      { id: 'nuee', name: 'Essaim-nuage', desc: 'Une nuée immense pollinise tout le champ : croissance +40%.',
        malus: 'Elle cache le soleil et bouche les engrenages : robots -20%, panneaux solaires inutiles.',
        mods: L => ({ growthAll: 1 + 0.4 * E(L), robotSpeed: S(L, 0.8), noSolar: true }) },
    ],
    renard: [
      { id: 'kitsune', name: 'Kitsune', desc: 'Renard à neuf queues : marché en folie 2× plus fréquent et légumes dorés encore ×1.5.',
        malus: 'Ses illusions inquiètent le marchand ambulant : il paie 2× moins.',
        mods: (L, b) => ({ frenzyFreq: 2 * E(L), goldenMult: b.goldenMult * 1.5, cartMult: b.cartMult * 0.5 }) },
      { id: 'fennec', name: 'Fennec', desc: 'Renard du désert : tout le champ pousse 25% plus vite et les nuits le gênent moins (malus -30%).',
        malus: 'Petit et frileux : il ne chasse plus rien et ne garde plus les silos.',
        mods: L => ({ growthAll: 1 + 0.25 * E(L), nightRelief: 0.3, crowHunter: null, chaseBoar: false, guardSilo: false }) },
      { id: 'renard_roux', name: 'Renard roux', desc: 'Grand chasseur : il chasse aussitôt les corbeaux (×2) et dévore tous les ravageurs.',
        malus: 'Il creuse partout : graines lentes -20%.',
        mods: L => ({ crowHunter: { delay: 0.3, reward: 2 * E(L) }, noPests: true, slowGrowth: S(L, 0.8) }) },
    ],
    hibou: [
      { id: 'effraie', name: 'Chouette effraie', desc: 'Toutes les 12 s, elle fait mûrir une plante au hasard.',
        malus: 'Son cri effraie le marchand ambulant : il ne vient plus.',
        mods: L => ({ ripenEvery: 12 / E(L), noCart: true }) },
      { id: 'harfang', name: 'Harfang des neiges', desc: 'Il apaise le ciel : orages 2× moins fréquents, et toutes les plantes poussent 20% plus vite.',
        malus: 'Il fait froid autour de lui : les robots se rechargent 30% moins vite.',
        mods: L => ({ stormMult: 0.5, growthAll: 1 + 0.2 * E(L), chargeMult: S(L, 0.7) }) },
      { id: 'savante', name: 'Chouette savante', desc: 'Tous les légumes valent 20% de plus.',
        malus: 'Elle lit au lieu de chasser : plus de chasse aux corbeaux.',
        mods: (L, b) => ({ valueAll: b.valueAll * (1 + 0.2 * E(L)), crowHunter: null }) },
    ],
    licorne: [
      { id: 'irisee', name: 'Licorne irisée', desc: '5% des récoltes deviennent des gemmes qui valent 12× plus.',
        malus: 'Ses couleurs aveuglent les plantes : aura de croissance -30%.',
        mods: (L, b) => ({ gem: { chance: 0.05 * E(L), mult: 12 }, aura: { ...b.aura, mult: 1 + (b.aura.mult - 1) * 0.7 } }) },
      { id: 'sylvestre', name: 'Licorne sylvestre', desc: 'Pas de nuit dans son aura, et tout le champ pousse 30% plus vite.',
        malus: 'Elle boit dans les rigoles : la terre de son aura sèche 3× plus vite.',
        mods: (L, b) => ({ auraNoNight: true, growthAll: 1 + 0.3 * E(L), aura: { ...b.aura, evap: 3 } }) },
      { id: 'etoilee', name: 'Licorne étoilée', desc: 'Légumes dorés ×2 et +3% de chances d\'en avoir.',
        malus: 'Rêveuse, elle ne s\'éloigne plus : aura réduite à son rayon de départ.',
        mods: (L, b) => ({ goldenMult: 2 * E(L), golden: b.golden + 0.03, aura: { ...b.aura, radius: 24 } }) },
    ],
    dragon: [
      { id: 'dragon_or', name: 'Dragon d\'or', desc: 'Il couve son trésor : +3% de légumes dorés et dorés ×2.',
        malus: 'Avare : le marchand ambulant ne vient plus.',
        mods: L => ({ golden: 0.03 * E(L), goldenMult: 2, noCart: true }) },
      { id: 'dragon_orage', name: 'Dragon de l\'orage', desc: 'La foudre le nourrit : orages 3× plus fréquents et robots rechargés 3× plus vite.',
        malus: 'Plus d\'orages, c\'est aussi plus de plantes foudroyées et de robots gelés.',
        mods: L => ({ stormMult: 3, chargeMult: 1 + 2 * E(L) }) },
      { id: 'wyverne', name: 'Wyverne', desc: 'Toutes les 30 s, elle rugit : toutes les plantes gagnent +80% de croissance.',
        malus: 'Les robots se figent 2 s à chaque rugissement.',
        mods: L => ({ cry: { every: 30 / E(L), boost: 0.8, freeze: 2 } }) },
    ],
  };
  for (const p of PETS) p.paths = PET_PATHS[p.id] || [];
  // Coût des compagnons légendaires : proportionnel au seuil de renaissance de leur ère.
  for (const p of PETS) if (p.pr && !p.cost) p.cost = Math.round(threshold(p.pr - 1) * 0.3);

  const ACH_BONUS = 0.02;

  // ---------- Météo ----------
  // frost : gel (abîme les plantes non protégées) ; fog : brouillard ; wind : vent.
  const WEATHER = {
    soleil: { name: 'Ensoleillé', desc: 'Temps normal.', growth: 1, evap: 1, w: 40 },
    nuageux: { name: 'Nuageux', desc: 'La terre sèche moins vite.', growth: 0.95, evap: 0.6, w: 20 },
    pluie: { name: 'Pluie', desc: 'Tout est arrosé, croissance +20%.', growth: 1.2, evap: 0, rain: true, w: 16 },
    orage: { name: 'Orage', desc: 'Tout est arrosé, croissance +50% ! Mais attention à la foudre.', growth: 1.5, evap: 0, rain: true, storm: true, w: 5 },
    canicule: { name: 'Canicule', desc: 'Croissance +15%, mais la terre sèche très vite. Les sauterelles adorent.', growth: 1.15, evap: 2.4, w: 12 },
    gel: { name: 'Gel', desc: 'Croissance -40%, et le givre peut faire reculer les plantes non protégées.', growth: 0.6, evap: 0.3, frost: true, w: 6 },
    brouillard: { name: 'Brouillard', desc: 'Les corbeaux en profitent (×2) et les robots y voient mal (-15%).', growth: 1, evap: 0.5, fog: true, w: 8 },
    vent: { name: 'Vent', desc: 'La terre sèche plus vite, les robots volants peinent, et des graines s\'envolent sur les parcelles vides.', growth: 1.05, evap: 1.5, wind: true, w: 9 },
  };

  const DAY_LEN = 480; // secondes réelles pour un jour complet

  // ---------- Événements aléatoires ----------
  // Tirés toutes les EVENTS_EVERY s parmi ceux dont la condition est remplie (when : 'day' | 'night' | 'storm'...).
  // good : compte comme événement heureux (talent « Bonne étoile »).
  const EVENTS_EVERY = [70, 150];
  const EVENTS = {
    sanglier: { name: 'Sanglier', w: 6, desc: 'Un sanglier traverse le champ en piétinant les plantes ! Clique dessus pour le chasser.' },
    sauterelles: { name: 'Nuée de sauterelles', w: 4, when: 'hot', desc: 'Des sauterelles dévorent les feuilles et les fleurs. Clique sur la nuée pour la disperser.' },
    etoile: { name: 'Étoile filante', w: 5, when: 'night', good: true, desc: 'Une étoile filante tombe sur une plante : elle devient étoilée (×20 à la récolte).' },
    arcenciel: { name: 'Arc-en-ciel', w: 4, when: 'afterRain', good: true, dur: 45, desc: 'Croissance ×2 et dorés ×5 pendant 45 s.' },
    eclipse: { name: 'Éclipse', w: 1, when: 'day', dur: 40, desc: 'La nuit tombe en plein jour pendant 40 s. Les mandragores et les champignons adorent.' },
    comete: { name: 'Comète', w: 1, when: 'night', good: true, desc: 'Une comète illumine la nuit : croissance ×2 jusqu\'à l\'aube.' },
    foire: { name: 'Foire agricole', w: 3, good: true, dur: 60, desc: 'Un juge visite la ferme : dans 60 s, la plus belle plante mûre est primée (×30).' },
    voleur: { name: 'Voleur nocturne', w: 4, when: 'nightStock', desc: 'Un voleur s\'approche des silos ! Clique dessus avant qu\'il ne vole 25% du stock.' },
    tornade: { name: 'Tornade', w: 2, when: 'windy', desc: 'Une tornade traverse le champ : elle arrache des plantes et projette les robots.' },
    panne: { name: 'Panne de courant', w: 3, when: 'afterStorm', dur: 45, desc: 'Les bornes de recharge sont en panne pendant 45 s.' },
    oies: { name: 'Oies sauvages', w: 4, good: true, desc: 'Une volée d\'oies fertilise le champ : les plantes survolées gagnent +30% de croissance.' },
    touristes: { name: 'Touristes', w: 3, good: true, dur: 40, when: 'day', desc: 'Des touristes cueillent les plantes mûres et les paient ×3 pendant 40 s.' },
    champignons_sauvages: { name: 'Champignons sauvages', w: 3, when: 'afterRain', good: true, desc: 'Après la pluie, des champignons poussent tout seuls sur les parcelles vides.' },
  };
  const EVENT_FX = { wildMult: 4, starMult: 20, fairMult: 30, touristMult: 3, thiefSteal: 0.25, geeseBoost: 0.3, boarTrample: 0.4, locustEat: 0.08 };

  const count = (g, k) => g.s.stats[k] || 0;
  const D_ROBOTS = ROBOTS;
  const D_BRANCH_MAX = g => Math.max(...BRANCHES.map(b => g.branchLevels(b.id)));
  const famUnlocked = (g, fam) => SEEDS.filter(s => s.fam === fam).every(s => g.s.everSeeds && g.s.everSeeds[s.id]);
  const ACHIEVEMENTS = [
    { id: 'h1', name: 'Première récolte', desc: 'Récolter un légume.', check: g => count(g, 'harvest') >= 1 },
    { id: 'h100', name: 'Petit maraîcher', desc: 'Récolter 100 légumes.', check: g => count(g, 'harvest') >= 100 },
    { id: 'h1k', name: 'Maraîcher', desc: 'Récolter 1 000 légumes.', check: g => count(g, 'harvest') >= 1e3 },
    { id: 'h10k', name: 'Grand maraîcher', desc: 'Récolter 10 000 légumes.', check: g => count(g, 'harvest') >= 1e4 },
    { id: 'h100k', name: 'Légende du potager', desc: 'Récolter 100 000 légumes.', check: g => count(g, 'harvest') >= 1e5 },
    { id: 'h1m', name: 'Grenier du monde', desc: 'Récolter 1 000 000 de légumes.', check: g => count(g, 'harvest') >= 1e6 },
    { id: 'e1k', name: 'Premiers sous', desc: 'Gagner 1 000 $ au total.', check: g => g.s.totalEarned >= 1e3 },
    { id: 'e1m', name: 'Millionnaire', desc: 'Gagner 1 M $ au total.', check: g => g.s.totalEarned >= 1e6 },
    { id: 'e1b', name: 'Milliardaire', desc: 'Gagner 1 B $ au total.', check: g => g.s.totalEarned >= 1e9 },
    { id: 'e1t', name: 'Magnat agricole', desc: 'Gagner 1 T $ au total.', check: g => g.s.totalEarned >= 1e12 },
    { id: 'e1qa', name: 'Empire maraîcher', desc: 'Gagner 1 Qa $ au total.', check: g => g.s.totalEarned >= 1e15 },
    { id: 'e1sx', name: 'Ferme planétaire', desc: 'Gagner 1 Sx $ au total.', check: g => g.s.totalEarned >= 1e21 },
    { id: 'e1no', name: 'Ferme galactique', desc: 'Gagner 1 No $ au total.', check: g => g.s.totalEarned >= 1e30 },
    { id: 'p10', name: 'Ça s\'étend', desc: 'Posséder 10 parcelles.', check: g => g.s.plots.length >= 10 },
    { id: 'p25', name: 'Exploitation', desc: 'Posséder 25 parcelles.', check: g => g.s.plots.length >= 25 },
    { id: 'p40', name: 'Latifundium', desc: 'Posséder 40 parcelles.', check: g => g.s.plots.length >= 40 },
    { id: 'pfull', name: 'D\'un bout à l\'autre', desc: 'Remplir tout l\'écran de parcelles.', check: g => g.s.plots.length >= g.maxPlots },
    { id: 'r1', name: 'Premier robot', desc: 'Acheter un robot.', check: g => g.robotCount() >= 1 },
    { id: 'r10', name: 'Atelier', desc: 'Posséder 10 robots.', check: g => g.robotCount() >= 10 },
    { id: 'r30', name: 'Armée de fer', desc: 'Posséder 30 robots.', check: g => g.robotCount() >= 30 },
    { id: 'r80', name: 'Usine à légumes', desc: 'Posséder 80 robots.', check: g => g.robotCount() >= 80 },
    { id: 'drone', name: 'Ça vole !', desc: 'Acheter un drone agricole.', check: g => (g.s.robots.drone || 0) >= 1 },
    { id: 'quant', name: 'Singularité', desc: 'Acheter un androïde quantique.', check: g => (g.s.robots.quantique || 0) >= 1 },
    { id: 'golem', name: 'Argile vivante', desc: 'Acheter un golem de terre.', check: g => (g.s.robots.golem || 0) >= 1 },
    { id: 'ia', name: 'Skynet agricole', desc: 'Acheter une intelligence centrale.', check: g => (g.s.robots.ia || 0) >= 1 },
    { id: 's5', name: 'Collectionneur', desc: 'Débloquer 5 graines.', check: g => g.seedCount() >= 5 },
    { id: 's20', name: 'Grainetier', desc: 'Avoir débloqué 20 graines différentes.', check: g => Object.keys(g.s.everSeeds || {}).length >= 20 },
    { id: 's35', name: 'Conservatoire', desc: 'Avoir débloqué 35 graines différentes.', check: g => Object.keys(g.s.everSeeds || {}).length >= 35 },
    { id: 'sall', name: 'Botaniste', desc: 'Avoir débloqué toutes les graines.', check: g => Object.keys(g.s.everSeeds || {}).length >= SEEDS.length },
    { id: 'f_champi', name: 'Mycologue', desc: 'Avoir débloqué tous les champignons.', check: g => famUnlocked(g, 'champi') },
    { id: 'f_fleur', name: 'Fleuriste', desc: 'Avoir débloqué toutes les fleurs.', check: g => famUnlocked(g, 'fleur') },
    { id: 'f_exotique', name: 'Explorateur', desc: 'Avoir débloqué tous les exotiques.', check: g => famUnlocked(g, 'exotique') },
    { id: 'monde', name: 'Yggdrasil', desc: 'Débloquer l\'Arbre-monde.', check: g => !!(g.s.everSeeds || {}).arbre_monde },
    { id: 'c1', name: 'Ouste !', desc: 'Chasser un corbeau.', check: g => count(g, 'crows') >= 1 },
    { id: 'c25', name: 'Épouvantail humain', desc: 'Chasser 25 corbeaux.', check: g => count(g, 'crows') >= 25 },
    { id: 'c100', name: 'Fléau des corbeaux', desc: 'Chasser 100 corbeaux.', check: g => count(g, 'crows') >= 100 },
    { id: 'g1', name: 'Pépite', desc: 'Récolter un légume doré.', check: g => count(g, 'golden') >= 1 },
    { id: 'g25', name: 'Ruée vers l\'or', desc: 'Récolter 25 légumes dorés.', check: g => count(g, 'golden') >= 25 },
    { id: 'g250', name: 'Midas', desc: 'Récolter 250 légumes dorés.', check: g => count(g, 'golden') >= 250 },
    { id: 'k100', name: 'Doigts agiles', desc: 'Cliquer 100 fois sur tes plantes.', check: g => count(g, 'clicks') >= 100 },
    { id: 'k1k', name: 'Tendinite', desc: 'Cliquer 1 000 fois sur tes plantes.', check: g => count(g, 'clicks') >= 1e3 },
    { id: 'k10k', name: 'Main de fer', desc: 'Cliquer 10 000 fois sur tes plantes.', check: g => count(g, 'clicks') >= 1e4 },
    { id: 'm1', name: 'Bonne affaire', desc: 'Commercer avec le marchand ambulant.', check: g => count(g, 'merchants') >= 1 },
    { id: 'm10', name: 'Client fidèle', desc: 'Commercer 10 fois avec le marchand.', check: g => count(g, 'merchants') >= 10 },
    { id: 'storm', name: 'Chasseur d\'orage', desc: 'Vivre un orage.', check: g => count(g, 'storms') >= 1 },
    { id: 'mand', name: 'Cri dans la nuit', desc: 'Récolter une mandragore la nuit.', check: g => count(g, 'nightMandrake') >= 1 },
    { id: 'maxup', name: 'Perfectionniste', desc: 'Monter une amélioration au maximum.', check: g => g.anyUpgradeMaxed() },
    { id: 'irr', name: 'Tout coule de source', desc: 'Irriguer au moins 20 parcelles, toutes.', check: g => g.s.plots.length >= 20 && g.lvl('irrigation') >= g.s.plots.length },
    { id: 'pr1', name: 'Renaissance', desc: 'Effectuer une renaissance.', check: g => count(g, 'prestiges') >= 1 },
    { id: 'pr5', name: 'Cycle éternel', desc: 'Effectuer 5 renaissances.', check: g => count(g, 'prestiges') >= 5 },
    { id: 'pr10', name: 'Samsara', desc: 'Effectuer 10 renaissances.', check: g => count(g, 'prestiges') >= 10 },
    { id: 'pr20', name: 'Éternel retour', desc: 'Effectuer 20 renaissances.', check: g => count(g, 'prestiges') >= 20 },
    { id: 'spec', name: 'Spécialiste', desc: 'Monter 30 niveaux dans une seule branche.', check: g => D_BRANCH_MAX(g) >= 30 },
    { id: 'bio', name: 'Retour à la terre', desc: 'Obtenir la certification bio.', check: g => g.tal('certif') >= 1 },
    { id: 'pest25', name: 'Chasseur de pucerons', desc: 'Traiter 25 ravageurs.', check: g => count(g, 'pests') >= 25 },
    { id: 'ogm5', name: 'Apprenti sorcier', desc: 'Atteindre le palier OGM 5.', check: g => g.tal('ogm') >= 5 },
    { id: 'mutant', name: 'Légume géant', desc: 'Obtenir une mutation géante.', check: g => count(g, 'giants') >= 1 },
    { id: 'spec1', name: 'Spécialistes', desc: 'Posséder un robot de chaque spécialité.', check: g => ROBOTS.filter(r => r.only && r.only !== 'none').every(r => (g.s.robots[r.id] || 0) >= 1) },
    { id: 'charge100', name: 'Plein d\'énergie', desc: 'Recharger des robots 100 fois.', check: g => count(g, 'charges') >= 100 },
    { id: 'trade1', name: 'Premier deal', desc: 'Vendre une récolte au cours du marché.', check: g => count(g, 'marketSales') >= 1 },
    { id: 'demand10', name: 'À l\'écoute du marché', desc: 'Honorer 10 commandes du marché.', check: g => count(g, 'demands') >= 10 },
    { id: 'demand100', name: 'Grossiste', desc: 'Honorer 100 commandes du marché.', check: g => count(g, 'demands') >= 100 },
    { id: 'shortage', name: 'Spéculateur', desc: 'Vendre pendant une pénurie.', check: g => count(g, 'shortageSales') >= 1 },
    { id: 'rotten', name: 'Ça sent pas bon', desc: 'Laisser pourrir un lot au silo.', check: g => count(g, 'rotten') >= 1 },
    { id: 'silo8', name: 'Coopérative', desc: 'Posséder 8 silos.', check: g => g.s.trade.silos >= 8 },
    { id: 'energy1', name: 'Coup de foudre', desc: 'Récolter une plante dorée énergisée.', check: g => count(g, 'energized') >= 1 },
    { id: 'cursed1', name: 'Oiseau de malheur', desc: 'Voir un corbeau frappé par la foudre.', check: g => count(g, 'cursedCrows') >= 1 },
    { id: 'super1', name: 'Survolté', desc: 'Un robot paratonnerre foudroyé.', check: g => count(g, 'superRobots') >= 1 },
    { id: 'dense1', name: 'Serré comme des sardines', desc: 'Créer une culture serrée.', check: g => g.s.plots.some(p => p.tier >= 1) },
    { id: 'quantum1', name: 'Superposition', desc: 'Créer une culture quantique.', check: g => g.s.plots.some(p => p.tier >= 3) },
    { id: 'mini1', name: 'Chérie, j\'ai rétréci les robots', desc: 'Miniaturiser un modèle de robot.', check: g => D_ROBOTS.some(r => g.lvl('mini_' + r.id)) },
    { id: 'pet1', name: 'Ami des bêtes', desc: 'Adopter un compagnon.', check: g => Object.keys(g.s.pets.seen).length >= 1 },
    { id: 'petall', name: 'Arche de Noé', desc: 'Adopter chacun des compagnons au moins une fois.', check: g => Object.keys(g.s.pets.seen).length >= PETS.length },
    { id: 'pets3', name: 'Ménagerie', desc: 'Avoir 3 compagnons en même temps.', check: g => g.s.pets.list.length >= 3 },
    { id: 'pets6', name: 'Zoo', desc: 'Avoir 6 compagnons en même temps.', check: g => g.s.pets.list.length >= 6 },
    { id: 'path', name: 'Voie tracée', desc: 'Choisir une voie pour un compagnon.', check: g => count(g, 'paths') >= 1 },
    { id: 'evo', name: 'Métamorphose', desc: 'Faire évoluer un compagnon.', check: g => count(g, 'evolutions') >= 1 },
    { id: 'master', name: 'Grand maître', desc: 'Monter un compagnon au niveau 30.', check: g => count(g, 'masterPets') >= 1 },
    { id: 'boar1', name: 'Chasse au sanglier', desc: 'Chasser un sanglier.', check: g => count(g, 'boars') >= 1 },
    { id: 'locust1', name: 'Plaie d\'Égypte', desc: 'Disperser une nuée de sauterelles.', check: g => count(g, 'locusts') >= 1 },
    { id: 'star1', name: 'Fais un vœu', desc: 'Récolter une plante étoilée.', check: g => count(g, 'stars') >= 1 },
    { id: 'fair1', name: 'Premier prix', desc: 'Gagner la foire agricole.', check: g => count(g, 'fairs') >= 1 },
    { id: 'thief1', name: 'Au voleur !', desc: 'Arrêter un voleur nocturne.', check: g => count(g, 'thieves') >= 1 },
    { id: 'tornado1', name: 'Le magicien d\'Oz', desc: 'Survivre à une tornade.', check: g => count(g, 'tornados') >= 1 },
    { id: 'events50', name: 'Il se passe toujours quelque chose', desc: 'Vivre 50 événements aléatoires.', check: g => count(g, 'events') >= 50 },
  ];

  const SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc', 'Ud', 'Dd', 'Td', 'Qad', 'Qid', 'Sxd', 'Spd', 'Ocd', 'Nod', 'Vg', 'Uvg', 'Dvg', 'Tvg'];
  function fmt(n) {
    if (!isFinite(n)) return '∞';
    if (n < 0) return '-' + fmt(-n);
    if (n < 1000) return n < 10 && n % 1 !== 0 ? n.toFixed(1) : String(Math.floor(n));
    const raw = n;
    let i = 0;
    while (n >= 1000 && i < SUFFIXES.length - 1) { n /= 1000; i++; }
    if (n >= 1000) return raw.toExponential(2);
    const digits = n < 10 ? 2 : n < 100 ? 1 : 0;
    const txt = n.toFixed(digits);
    return (digits ? txt.replace(/\.?0+$/, '') : txt) + SUFFIXES[i]; // ne retire que les zéros après la virgule
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.round(sec));
    if (sec < 60) return sec + ' s';
    const m = Math.floor(sec / 60), s = sec % 60;
    if (m < 60) return m + ' min' + (s ? ' ' + s + ' s' : '');
    const h = Math.floor(m / 60);
    return h + ' h ' + (m % 60) + ' min';
  }

  const DATA = {
    SEEDS, FAMILIES, ECO, FARMER, ROBOTS, ACTIONS, STORM, BATTERY, UPGRADES, DENSE, MINI, MUTATIONS, MARKET, TRAITS, PLOTS,
    BRANCHES, FAST_GROW, TALENTS, SPEC_PENALTY, BIO, SCIENCE, PETS, PET_MOD_DEFAULTS, PET_LEVEL, MASTERY, PERKS, PERK_CATS,
    PRESTIGE, threshold, ACH_BONUS, WEATHER, DAY_LEN, EVENTS, EVENTS_EVERY, EVENT_FX, ACHIEVEMENTS, fmt, fmtTime,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = DATA;
  else root.FARM_DATA = DATA;
})(this);
