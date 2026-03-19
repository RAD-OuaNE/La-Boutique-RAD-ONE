# Boutique RED-ONE

Vitrine catalogue statique pour Netlify, avec mode demo local et mode connecte via Supabase.

## Ce que fait cette V2

- page publique `index.html`
- page admin `admin.html`
- catalogue filtre par categories
- panier simple
- demande client envoyee dans Supabase si configure
- sondage produit pour tester l'interet client
- admin avec connexion Supabase
- ajout produit simple ou import en lot
- recadrage photo 4:3 avant envoi
- repli automatique en mode local si Supabase n'est pas configure

## Structure

```text
boutique RED-ONE/
  admin.html
  index.html
  netlify.toml
  css/
    styles.css
  data/
    products.js
  js/
    admin.js
    app-config.js
    app-config.example.js
    config.js
    main.js
    remote-store.js
    store.js
  supabase/
    schema.sql
    storage.sql
```

## Mode demo

Sans configuration supplementaire, le site continue de fonctionner en local avec `localStorage`.

- les produits restent dans le navigateur
- les demandes clients restent dans le navigateur
- l'admin est ouverte en mode demo

## Activer Supabase

1. Cree un projet Supabase.
2. Execute [`supabase/schema.sql`](H:\Mon%20Drive\La%20Boutique%20RED-ONE\supabase\schema.sql) dans l'editeur SQL.
3. Execute [`supabase/storage.sql`](H:\Mon%20Drive\La%20Boutique%20RED-ONE\supabase\storage.sql).
4. Cree au moins un utilisateur admin dans Supabase Authentication.
5. Edite [`js/app-config.js`](H:\Mon%20Drive\La%20Boutique%20RED-ONE\js\app-config.js) avec l'URL du projet et la cle anon.

Exemple:

```js
window.REDONE_CONFIG = {
  supabaseUrl: "https://your-project-ref.supabase.co",
  supabaseAnonKey: "your-anon-key",
  productsTable: "products",
  ordersTable: "orders",
  storageBucket: "product-images",
  storageFolder: "products",
};
```

## Deploiement Netlify

1. Cree un nouveau site sur Netlify depuis ce dossier.
2. Laisse le champ build vide.
3. Mets le `Publish directory` sur `.`.
4. Deploie.

## Important

- `js/app-config.js` contient la configuration runtime du site
- la cle `anon` Supabase peut etre exposee cote navigateur, mais les policies SQL doivent etre en place
- les uploads d'images produits passent par le bucket public `product-images`
- si Supabase n'est pas configure, le site repasse en mode demo local
