# Sandbox 3D - Jeu de Construction

Un jeu vidéo sandbox de construction en 3D, inspiré de Minecraft, jouable en vue à la troisième personne.

## Lancer le jeu

### Développement local

```bash
cd sandbox-game
npm install
npm run dev
```

Puis ouvrir http://localhost:3000

### Production (Vercel)

1. Aller sur https://vercel.com/new
2. Importer le repository GitHub: https://github.com/cesarrrito/sandbox-3d-game
3. Déployer

## Contrôles

| Action | Contrôle |
|--------|----------|
| Déplacement | Flèches directionnelles ou WASD |
| Sauter | ESPACE |
| Sprint | SHIFT |
| Attaque / Casser blocs | Clic gauche |
| Poser blocs | Clic droit |
| Inventaire | Touche I |
| Sélection slot | Touches 1-5 |

## Fonctionnalités

### 🌍 Monde
- Monde ouvert avec génération procédurale
- 4 biomes: Forêt, Désert, Glace, Volcanique
- Structures générées (maisons)

### 🧱 Blocs
- Terre, Pierre, Bois, Sable, Neige
- Casser (clic gauche) et poser (clic droit)

### ⚔️ Combat
- Monstres (Zombies) qui spawn toutes les minutes
- Boss qui apparaît toutes les 5 minutes
- Épée (2 cœurs de dégâts) et Arc (1 cœur par flèche)

### 🎒 Inventaire
- 20 slots + 5 slots hotbar
- Stack max: 64 objets
- Objets: blocs, armes, potions

### 💰 Loot
- Monstres drop: potions, armes
- Boss drop: épée + potions

## Structure du projet

```
sandbox-game/
├── index.html          # Page principale
├── src/
│   ├── main.js         # Point d'entrée
│   ├── world/          # Génération du monde
│   ├── player/         # Joueur 3ème personne
│   ├── inventory/      # Système d'inventaire
│   ├── combat/         # Monstres et combat
│   └── ui/            # Interface utilisateur
├── package.json
└── vite.config.js
```

## Déploiement

Le jeu est déployé sur Vercel et accessible via:
https://sandbox-3d-game.vercel.app