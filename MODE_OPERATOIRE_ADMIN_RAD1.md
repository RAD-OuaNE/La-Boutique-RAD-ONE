# Mode Operatoire Admin RAD1

Document de prise en main pour la gestion du site `La Boutique RAD1`.

## 1. Objectif

Ce document explique a quoi sert chaque partie du site admin et comment gerer :

- les produits
- les imports
- les best sellers
- les demandes clients
- les sondages

Il est pense pour une utilisation simple, y compris sur telephone si besoin.

## 2. Avant de commencer

Points a verifier avant chaque session :

- ouvrir le site public puis cliquer sur `Acces admin`
- verifier le badge de version en bas a droite
- s'assurer d'etre sur la bonne version avant de travailler

Exemple :

- si tu vois `Version 2026.03.20.1`, tu es bien sur cette version du site
- si le numero affiche n'est pas celui attendu, recharger la page

## 3. Navigation generale dans l'admin

En haut de l'admin, tu trouves :

- `Retour boutique`
- les menus principaux :
  - `Produits`
  - `Sondages`
  - `Demandes clients`

Dans `Produits`, il y a ensuite des sous-menus :

- `Import en lot`
- `Import JSON`
- `Ajouter un produit`
- `Liste produits`

## 4. Connexion admin

Si Supabase est actif :

- entrer l'email admin
- entrer le mot de passe
- cliquer sur `Se connecter`

Une fois connecte :

- la session active s'affiche
- le bouton `Se deconnecter` reste disponible

## 5. Ajouter un produit seul

Aller dans :

- `Produits`
- `Ajouter un produit`

Renseigner les champs suivants :

- `Titre`
- `Categorie`
- `Prix`
- `Stock disponible`
- `Photo du produit`
- `Ou coller une URL d'image`
- `Description`
- `Afficher le prix`
- `Best seller`

### Explication des champs

`Titre`

- nom du produit affiche sur la boutique

`Categorie`

- choisir la categorie adaptee
- categories disponibles actuellement :
  - `parfums`
  - `maquillage`
  - `jouets`
  - `coffrets`
  - `soins_lissage`
  - `soins_botox`
  - `kits_soins`
  - `accessoires`
  - `autres`

`Prix`

- mettre une valeur si le prix doit etre affiche
- mettre `0` si le prix n'est pas affiche

`Stock disponible`

- mettre la quantite disponible
- si le stock est a `0`, le produit apparaitra comme `epuise`

`Afficher le prix`

- coche : le prix apparait
- decoche : la boutique affiche `Prix sur demande`

`Best seller`

- coche : le produit obtient un tampon `Best seller`
- il remonte aussi avant les autres produits

### Photo du produit

Deux possibilites :

- choisir un fichier depuis l'appareil
- coller une URL d'image

Le systeme permet ensuite :

- deplacer l'image avec les fleches
- zoomer avec `+` et `-`
- rotation gauche / droite
- miroir horizontal / vertical
- reinitialiser

Important :

- le site garde maintenant l'image entiere par defaut
- si un ancien produit est deja tronque, il faut le reouvrir puis le reenregistrer avec son image d'origine

### Finaliser

Cliquer sur :

- `Ajouter le produit`

Si tu modifies un produit existant :

- le bouton devient `Enregistrer les modifications`

## 6. Modifier ou masquer un produit

Aller dans :

- `Produits`
- `Liste produits`

Chaque produit propose :

- `Masquer` ou `Publier`
- `Modifier`
- `Supprimer`

### Que fait chaque bouton

`Masquer`

- le produit n'apparait plus sur la boutique
- il reste en base et peut etre republie plus tard

`Modifier`

- recharge le produit dans le formulaire
- permet de modifier texte, image, stock, prix, categorie, best seller

`Supprimer`

- supprime vraiment le produit
- action irreversible

## 7. Import en lot

Aller dans :

- `Produits`
- `Import en lot`

Utilisation :

- choisir plusieurs photos
- appliquer une categorie par defaut
- definir un stock par defaut
- choisir si le prix doit etre visible
- ajuster les brouillons si besoin
- cliquer sur `Ajouter toute la selection`

Ce mode est utile quand plusieurs produits doivent etre prepares rapidement a partir de photos.

## 8. Import JSON

Aller dans :

- `Produits`
- `Import JSON`

Deux methodes :

- importer un fichier `.json`
- coller le JSON dans la zone prevue

Puis cliquer sur :

- `Importer les produits JSON`

### Regle de fonctionnement actuelle

Pour un gros catalogue ou un import genere par un outil externe :

- le collegue prepare le catalogue
- il fait remonter le fichier au responsable
- le responsable integre le JSON tant que l'usage du logiciel n'a pas encore ete explique

Ensuite, une fois forme, le collegue pourra faire cet import lui-meme.

### Structure attendue pour un produit JSON

```json
{
  "id": "prod-exemple",
  "title": "Nom du produit",
  "category": "soins_lissage",
  "description": "Description du produit",
  "price": 0,
  "quantity": 1,
  "showPrice": false,
  "bestSeller": true,
  "active": true,
  "image": "https://..."
}
```

### Regles importantes

- le fichier doit contenir un tableau JSON
- `title` obligatoire
- `image` obligatoire
- `quantity` obligatoire
- `showPrice` :
  - `true` = prix affiche
  - `false` = prix sur demande
- `bestSeller` :
  - `true` = produit phare
  - `false` = produit normal

## 9. Best seller

Le mode `Best seller` sert a mettre en avant les produits phares.

Effets visibles :

- tampon rouge sur la photo produit
- remontee du produit dans l'ordre d'affichage

Quand l'utiliser :

- produit le plus demande
- produit qui se vend bien
- produit prioritaire a mettre en avant

## 10. Gestion du stock

Chaque produit dispose d'un stock.

Fonctionnement :

- le stock est defini dans le produit
- lorsqu'un client envoie une demande, le stock diminue
- si le stock arrive a `0`, la boutique affiche `Produit epuise`

Bonnes pratiques :

- mettre a jour le stock apres reception de marchandises
- verifier les produits en rupture et les corriger si besoin

## 11. Demandes clients

Aller dans :

- `Demandes clients`

Tu peux :

- voir toutes les demandes recues
- filtrer par statut
- faire evoluer l'etat d'une demande

Statuts disponibles :

- `Nouvelle`
- `En preparation`
- `Prete`
- `Livree`
- `En attente de paiement`
- `Payee`

Exemple de workflow simple :

1. `Nouvelle`
2. `En preparation`
3. `Prete`
4. `Livree`
5. `Payee`

## 12. Sondages

Aller dans :

- `Sondages`

Tu peux :

- creer un sondage produit
- publier ou masquer un sondage
- supprimer un sondage
- suivre les votes

Utilite :

- tester l'interet des clients avant d'acheter certains produits
- mesurer les attentes sur un futur arrivage

## 13. Verifier que la bonne version du site est chargee

Le badge de version est visible en bas a droite sur :

- la boutique
- l'admin

Utilisation :

- si une modification vient d'etre faite, verifier que le numero a change
- si le numero ne change pas, recharger la page

Ce badge permet de savoir rapidement si les dernieres modifications sont bien en ligne.

## 14. Cas particuliers et depannage

### Le produit n'apparait pas sur la boutique

Verifier :

- qu'il est `Publie`
- que le stock n'est pas a `0`
- que l'image est correcte
- que le produit existe bien dans la base via l'admin

### L'image est tronquee

Verifier :

- si le produit est ancien
- si l'image enregistree est deja recadree dans Supabase

Solution :

- reouvrir le produit
- remettre l'image d'origine
- enregistrer a nouveau

### Le prix ne s'affiche pas

Verifier :

- case `Afficher le prix`

Si elle est decochee :

- la boutique affiche `Prix sur demande`

### Le produit n'est pas mis en avant

Verifier :

- case `Best seller`

## 15. Regles de bonne utilisation

- toujours verifier la version du site avant de commencer
- preferer des titres clairs et courts
- garder des descriptions lisibles
- mettre le bon stock
- n'utiliser `Best seller` que pour les vrais produits phares
- pour les imports massifs, faire valider le JSON si besoin

## 16. Captures a ajouter dans la version illustree

Pour une version avec images, ajouter idealement :

1. la page d'accueil avec le bouton `Acces admin` et le badge de version
2. l'ecran de connexion admin
3. les menus `Produits / Sondages / Demandes clients`
4. les sous-menus `Import en lot / Import JSON / Ajouter un produit / Liste produits`
5. le formulaire produit avec l'image et les controles
6. la liste produits avec `Masquer / Modifier / Supprimer`
7. la case `Best seller`
8. l'ecran `Demandes clients`
9. l'ecran `Sondages`

## 17. Resume express

Pour ajouter un produit :

1. ouvrir `Produits`
2. aller dans `Ajouter un produit`
3. remplir les champs
4. ajouter l'image
5. regler stock / prix / best seller
6. enregistrer

Pour modifier un produit :

1. ouvrir `Liste produits`
2. cliquer sur `Modifier`
3. corriger
4. enregistrer

Pour importer un catalogue :

1. preparer le JSON
2. aller dans `Import JSON`
3. importer le fichier
4. verifier le resultat dans `Liste produits`
