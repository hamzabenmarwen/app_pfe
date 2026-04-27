# 🌱 Guide des Données de Test (Seed Data)

Ce dossier contient des données de test complètes pour comprendre et démontrer toutes les fonctionnalités de l'application Assiette Gala.

---

## 📁 Fichiers Disponibles

| Fichier | Description |
|---------|-------------|
| `seed-data.sql` | Script SQL brut pour insertion directe en base |
| `prisma-seed.ts` | Script TypeScript utilisant Prisma Client (recommandé) |
| `README.md` | Ce guide |

---

## 🚀 Méthode 1: Prisma Seed (Recommandée)

### Prérequis
```bash
# Dans un service Node.js avec Prisma (ex: order-service)
cd backend/order-service
npm install
npx prisma migrate dev  # Créer les tables
```

### Configuration
Ajoutez dans le `package.json` du service:
```json
{
  "prisma": {
    "seed": "ts-node prisma/seed.ts"
  }
}
```

### Exécution
```bash
# Copier le fichier dans le bon dossier
cp backend/seed/prisma-seed.ts backend/order-service/prisma/seed.ts

# Lancer le seed
cd backend/order-service
npx prisma db seed
```

---

## 🔧 Méthode 2: SQL Direct

### Pour PostgreSQL via psql
```bash
# Connexion à la base
psql -U postgres -d traiteurpro_orders

# Exécution du script
\i backend/seed/seed-data.sql
```

### Pour pgAdmin
1. Ouvrez pgAdmin
2. Connectez-vous au serveur PostgreSQL
3. Créez les bases: `traiteurpro_auth`, `traiteurpro_catalog`, `traiteurpro_orders`, `traiteurpro_events`
4. Ouvrez l'outil Query Tool
5. Copiez-collez le contenu de `seed-data.sql`
6. Exécutez (F5)

---

## 👥 Données de Test Disponibles

### Utilisateurs

| Email | Rôle | Mot de passe | Usage |
|-------|------|--------------|-------|
| `omar.daoud@assiettegala.tn` | **ADMIN** | `password123` | Connexion au tableau de bord admin |
| `client1@email.tn` | CLIENT | `password123` | Test du tunnel de commande |
| `client2@email.tn` | CLIENT | `password123` | Test des événements/devis |
| `client3@email.tn` | CLIENT | `password123` | Test du chatbot |
| `societe@sfaxtech.tn` | CLIENT | `password123` | Test commandes entreprise |

### Plats (19 plats répartis en 6 catégories)

**Entrées:**
- Salade Mechouia (8.50 TND)
- Brik à lœuf (5.00 TND) - contient Œufs, Poisson
- Salade Niçoise (12.00 TND)

**Plats Principaux:**
- Gratin de crevettes (25.00 TND) - contient Crustacés, Lait
- Filet de daurade (22.00 TND)
- Ojja crevettes (18.00 TND)
- Cordon bleu de poulet (16.00 TND)

**Grillades:**
- Mixed Grill (35.00 TND)
- Brochettes de crevettes x6 (28.00 TND)
- Entrecôte 300g (42.00 TND)

**Couscous:**
- Couscous Royal (28.00 TND) - **BEST SELLER**
- Couscous aux crevettes (32.00 TND)
- Couscous végétarien (18.00 TND) - sans gluten

**Desserts:**
- Assiette pâtisseries orientales (15.00 TND)
- Crème caramel maison (6.00 TND)
- Salade de fruits frais (10.00 TND)

**Boissons:**
- Jus dorange frais (5.00 TND)
- Citronnade à la menthe (4.50 TND)
- Eau minérale 1L (2.50 TND)

### Commandes (10 commandes)

| N° | Statut | Client | Total | Usage Dashboard |
|----|--------|--------|-------|-----------------|
| ORD-250115-A1B2 | ✅ DELIVERED | client1 | 52.50 | Statistiques historiques |
| ORD-250120-C3D4 | ✅ DELIVERED | client2 | 85.00 | Top plats vendus |
| ORD-250128-E5F6 | ✅ DELIVERED | client1 | 33.00 | Client récurrent |
| ORD-250205-G7H8 | ✅ DELIVERED | client3 | 127.00 | Commande entreprise |
| ORD-250212-I9J0 | ✅ DELIVERED | client4 | 245.00 | Grosse commande |
| **ORD-260420-K1L2** | ⏳ **PENDING** | client1 | 48.50 | **À traiter maintenant** |
| **ORD-260420-M3N4** | ⏳ **CONFIRMED** | client2 | 72.00 | **En préparation** |
| **ORD-260420-O5P6** | ⏳ **PREPARING** | client3 | 94.00 | **Préparation en cours** |
| ORD-250130-Q7R8 | ❌ CANCELLED | client2 | 45.00 | Taux d'annulation |
| ORD-250218-S9T0 | ❌ CANCELLED | client3 | 62.00 | Statistiques |

### Événements (6 événements)

- 3 confirmés (mariage, corporatif, anniversaire)
- 2 devis en attente
- 1 refusé (pour taux de conversion)

### Stock (20 matières premières)

Inclut:
- Légumes (tomates, pommes de terre, carottes)
- Viandes (poulet, agneau, bœuf)
- Poissons (crevettes, daurade)
- Produits secs (semoule, épices)
- Seuils d'alerte configurés
- Fournisseurs associés

### Chat History (10 messages)

Conversations réalistes:
- Questions sur allergènes (gluten)
- Demandes de devis événementiel
- Questions sur plats populaires

---

## 🎯 Comment Tester les Fonctionnalités

### 1. Tableau de Bord Admin (/admin)

**Connexion:**
- Email: `omar.daoud@assiettegala.tn`
- Password: `password123`

**Ce que vous verrez:**
- 6 cartes KPI avec données réelles
- Commandes en attente: **3** (PENDING, CONFIRMED, PREPARING)
- Revenu total: 619.50 TND
- Top plats: Gratin de crevettes, Mixed Grill, Couscous Royal
- Taux de complétion: 70% (7 livrées / 10 total)

### 2. Page Statistiques (/admin/stats)

**Filtres à tester:**
- 7 jours: Voir les commandes récentes
- 30 jours: Plus de données
- 12 mois: Vue annuelle

**Graphiques:**
- AreaChart: Évolution revenus/commandes
- PieChart: Répartition par statut
- BarChart: Top plats
- LineChart: Heures de pointe
- RadialBar: Jauge conversion devis

### 3. Gestion des Commandes (/admin/orders)

**Actions possibles:**
- Voir les 10 commandes avec filtres par statut
- Changer statut: PENDING → CONFIRMED → PREPARING → READY → DELIVERED
- Télécharger les factures PDF
- Voir détails avec items

### 4. Chatbot (Widget flottant)

**Questions à tester:**
```
"Avez-vous des plats sans gluten?"
→ Réponse attendue: Couscous végétarien

"Quel est votre plat le plus populaire?"
→ Réponse attendue: Couscous Royal

"Je veux organiser un mariage"
→ Réponse attendue: Proposition de devis
```

### 5. Tunnel de Commande Client

**Connexion:**
- Email: `client1@email.tn`
- Password: `password123`

**Parcours:**
1. Parcourir le catalogue (/catalogue)
2. Ajouter au panier
3. Voir panier avec calcul auto (total + TVA 19% + livraison 7 TND)
4. Choisir adresse de livraison
5. Confirmer commande
6. Recevoir numéro de commande (format: ORD-YYMMDD-XXXX)

### 6. Demande d'Événement

**Connexion:** client2@email.tn

**Parcours:**
1. Remplir formulaire événement
2. Type: WEDDING / CORPORATE / BIRTHDAY
3. Nombre d'invités: 40-200
4. Date: Future
5. Soumettre → Recevoir devis auto-calculé

### 7. Gestion de Stock (/admin/stock)

**Ce que vous verrez:**
- 20 matières premières
- Quantités en stock
- Alertes si sous seuil
- Historique des mouvements

### 8. Historique Chat (/admin si authentifié)

Si connecté en tant que client1, l'historique des conversations apparaît dans le widget.

---

## 📊 Scénarios de Démonstration

### Scénario 1: "Journée Type du Traiteur"

```
1. Admin se connecte → Voir 3 commandes en attente sur dashboard
2. Cliquer sur commandes → Changer ORD-260420-K1L2 de PENDING à CONFIRMED
3. Passer en cuisine (PREPARING) → Noter allergie "cacahuètes"
4. Prêt (READY) → Livreur prend en charge (DELIVERING)
5. Livré (DELIVERED) → Facture générée automatiquement
6. Dashboard se met à jour: +48.50 TND revenu aujourd'hui
```

### Scénario 2: "Nouveau Client"

```
1. Visiteur arrive sur site → Voir catalogue avec 19 plats
2. Question au chatbot: "Avez-vous des plats sans porc?"
3. Chatbot répond avec alternatives (vérifier pipeline RAG)
4. Créer compte → Recevoir email (si SMTP configuré)
5. Passer commande → Paiement à la livraison choisi
6. Admin voit nouvelle commande sur dashboard en temps réel
```

### Scénario 3: "Événement Corporate"

```
1. Client entreprise (client4) demande devis pour 150 personnes
2. Système calcule automatiquement: ~5500 TND
3. Admin reçoit notification devis en attente
4. Visite technique programmée
5. Devis confirmé → Événement créé dans calendrier
```

---

## 🔄 Rafraîchir les Données

### Réinitialiser complètement
```bash
# Prisma
npx prisma migrate reset  # Supprime et recrée toutes les tables

# Ou SQL
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
-- Puis réexécuter le seed
```

### Ajouter plus de données
Modifiez `prisma-seed.ts`:
- Augmentez le nombre de clients dans le tableau `clients`
- Ajoutez plus de plats dans `platsData`
- Créez des commandes avec dates aléatoires pour des graphiques riches

---

## 🐛 Dépannage

### "Cannot find module '@prisma/client'"
```bash
cd backend/order-service  # ou le service concerné
npm install @prisma/client
npx prisma generate
```

### "Unique constraint failed"
Les données existent déjà. Pour réinitialiser:
```bash
npx prisma migrate reset --force
```

### Images ne s'affichent pas
Les URLs sont des placeholders (`https://res.cloudinary.com/demo/...`).
Pour des vraies images:
1. Upload des images sur Cloudinary
2. Mettre à jour les URLs dans le seed

---

## 📈 Metriques Attendues après Seed

| Métrique | Valeur |
|----------|--------|
| Utilisateurs | 5 (1 admin + 4 clients) |
| Plats | 19 |
| Commandes | 10 (7 livrées, 3 en cours) |
| Revenu total | 619.50 TND |
| Panier moyen | ~62 TND |
| Événements | 6 (3 confirmés) |
| Stock items | 20 |
| Messages chat | 10 |

---

## 🎓 Pour le Rapport PFE

Ces données permettent de:
1. **Captures d'écran** des interfaces avec données réalistes
2. **Démonstration live** des fonctionnalités
3. **Tests** des calculs automatiques (devis, factures)
4. **Validation** du pipeline RAG avec questions réelles
5. **Présentation** des KPI et analytics

---

**Version**: 1.0  
**Créé**: Avril 2026  
**Par**: Ben Marouen Hamza
