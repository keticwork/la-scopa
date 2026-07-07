# La Scopa

Mini-app Expo Go pour jouer a la Scopa en solo contre un bot local.

## Lancer sur telephone

```sh
npm install
npm run assets
npm run mobile
```

Le mode mobile utilise un tunnel par defaut, comme la mini-app Azar. Le LAN reste disponible :

```sh
npm run mobile:lan
```

## V1

- Jeu local 1 contre 1.
- Jeu italien de 40 cartes : denari, coppe, spade, bastoni.
- Captures simples ou par somme, avec priorite aux cartes de meme valeur.
- Scopa, settebello, denari, cartes et primiera.
- Score de match a 11 points.
- Aucun compte, aucune publicite, aucune analytics, aucune collecte.

## Suite prevue

- Remplacer les cartes stylisees par un deck sous licence claire.
- Ajouter un mode multijoueur temps reel.
- Ajouter les builds EAS preview puis production iOS/Android.
