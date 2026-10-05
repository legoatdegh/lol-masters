# Hextech Masters

Jeu de cartes à collectionner sur League of Legends (projet de fan). On ouvre des coffres hextech et on collectionne des joueurs pro, équipes, coachs, tournois, champions, sorts et skins.

## Structure

```
index.html            page du jeu
css/style.css         apparence
js/app.js             logique du jeu
data/cards.json       cartes (généré, voir ci-dessous)
tools/build_cards.py  récupère les données et crée cards.json
```

## Lancer

1. `pip install requests mwparserfromhell` (une seule fois)
2. `python tools/build_cards.py` : crée `data/cards.json` (10 à 30 min la première fois, résultats gardés en cache)
3. `python -m http.server`, puis ouvrir http://localhost:8000

Les images ne sont pas stockées dans le projet : `cards.json` contient seulement leurs adresses, et le navigateur les charge chez Liquipedia et Riot.

## Sources et crédits

- Scène pro : Liquipedia (API MediaWiki, limites de requêtes respectées).
- Jeu : Riot Games, Data Dragon.
- Projet de fan, non affilié à Riot Games ni à Liquipedia.
