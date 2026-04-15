# Assiette Gala - Plateforme de Traiteur Intelligente

## 🍽️ Description

Assiette Gala est une plateforme de gestion pour traiteurs avec des fonctionnalités d'intelligence artificielle, développée avec une architecture microservices.

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Frontend (React + PWA)                    │
│                         Port: 3000                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
                                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                      API Gateway (Express)                       │
│                         Port: 4000                               │
└─────────────────────────────────────────────────────────────────┘
                                  │
        ┌─────────────┬───────────┴───────────┬─────────────┐
        ▼             ▼                       ▼             ▼
┌─────────────┐ ┌─────────────┐     ┌─────────────┐ ┌─────────────┐
│ Auth Service│ │Catalog Svc  │     │ Order Svc   │ │ Event Svc   │
│  Port: 3001 │ │  Port: 3002 │     │  Port: 3003 │ │  Port: 3004 │
└─────────────┘ └─────────────┘     └─────────────┘ └─────────────┘
      │               │                   │               │
      ▼               ▼                   ▼               ▼
┌─────────────┐ ┌─────────────┐     ┌─────────────┐ ┌─────────────┐
│  PostgreSQL │ │  PostgreSQL │     │  PostgreSQL │ │  PostgreSQL │
│ traiteur_   │ │ traiteur_   │     │ traiteur_   │ │ traiteur_   │
│    auth     │ │   catalog   │     │   orders    │ │   events    │
└─────────────┘ └─────────────┘     └─────────────┘ └─────────────┘
```

## 🛠️ Technologies

- **Backend**: Node.js + Express + TypeScript
- **IA**: Python + FastAPI + LangChain + Google Gemini
- **Base de données**: PostgreSQL avec Prisma ORM
- **Frontend**: React + TypeScript + Vite (PWA)
- **Authentification**: JWT (Access + Refresh tokens)
- **Validation**: Zod
- **Paiements**: Flouci (Tunisie) + Espèces
- **Chatbot**: RAG avec ChromaDB + embeddings HuggingFace
- **Recommandation**: Filtrage hybride (contenu + collaboratif)

## 📁 Structure du Projet

```
traiteurpro/
├── backend/
│   ├── api-gateway/        # Gateway API (routage des requêtes)
│   ├── auth-service/       # Authentification et utilisateurs
│   ├── catalog-service/    # Catalogue des plats et catégories
│   ├── order-service/      # Commandes, factures et paiements
│   ├── event-service/      # Événements et devis
│   ├── ai-service/         # Chatbot IA et recommandations
│   └── shared/             # Code partagé (types, utils)
├── frontend/               # Application React + PWA
├── docs/                   # Documentation
├── rapport/                # Rapport PFE (LaTeX)
└── package.json            # Scripts racine
```

## 🚀 Installation

### Prérequis

- Node.js 18+
- PostgreSQL 14+
- npm ou yarn

### 1. Cloner le projet et installer les dépendances

```bash
# Installer toutes les dépendances
npm run install:all
```

### 2. Configurer les bases de données

Créer 4 bases de données PostgreSQL:
- `traiteurpro_auth`
- `traiteurpro_catalog`
- `traiteurpro_orders`
- `traiteurpro_events`

### 3. Configurer les variables d'environnement

Copier `.env.example` vers `.env` dans chaque service et configurer:

```bash
# Auth Service (.env)
PORT=3001
DATABASE_URL="postgresql://postgres:password@localhost:5432/traiteurpro_auth"
JWT_SECRET="votre-secret-jwt-super-securise"
JWT_REFRESH_SECRET="votre-refresh-secret"

# Catalog Service (.env)
PORT=3002
DATABASE_URL="postgresql://postgres:password@localhost:5432/traiteurpro_catalog"
JWT_SECRET="votre-secret-jwt-super-securise"

# Order Service (.env)
PORT=3003
DATABASE_URL="postgresql://postgres:password@localhost:5432/traiteurpro_orders"
JWT_SECRET="votre-secret-jwt-super-securise"
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Event Service (.env)
PORT=3004
DATABASE_URL="postgresql://postgres:password@localhost:5432/traiteurpro_events"
JWT_SECRET="votre-secret-jwt-super-securise"

# API Gateway (.env)
PORT=4000
```

### 4. Initialiser les bases de données

```bash
# Générer les clients Prisma
npm run prisma:generate:all

# Pousser les schémas vers les bases
npm run prisma:push:all

# (Optionnel) Peupler le catalogue
npm run seed:catalog
```

### 5. Démarrer les services

Ouvrir 5 terminaux:

```bash
# Terminal 1 - API Gateway
npm run dev:gateway

# Terminal 2 - Auth Service
npm run dev:auth

# Terminal 3 - Catalog Service
npm run dev:catalog

# Terminal 4 - Order Service
npm run dev:order

# Terminal 5 - Event Service
npm run dev:event
```

## 📡 API Endpoints

### Auth Service (via Gateway: /api/auth, /api/users)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/auth/register | Inscription |
| POST | /api/auth/login | Connexion |
| POST | /api/auth/refresh | Rafraîchir le token |
| POST | /api/auth/logout | Déconnexion |
| GET | /api/users/me | Profil utilisateur |
| PUT | /api/users/me | Mettre à jour le profil |

### Catalog Service (via Gateway: /api/categories, /api/plats)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/categories | Liste des catégories |
| GET | /api/plats | Liste des plats (avec filtres) |
| GET | /api/plats/:id | Détails d'un plat |
| POST | /api/plats | Créer un plat (Admin) |
| PUT | /api/plats/:id | Modifier un plat (Admin) |

### Order Service (via Gateway: /api/orders, /api/payments)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/orders | Créer une commande |
| GET | /api/orders/my-orders | Mes commandes |
| GET | /api/orders/:id | Détails d'une commande |
| POST | /api/orders/:id/cancel | Annuler une commande |
| POST | /api/payments/create-intent | Créer un paiement |

### Event Service (via Gateway: /api/events, /api/quotes)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/events | Créer un événement |
| GET | /api/events/my-events | Mes événements |
| POST | /api/events/:id/request-quote | Demander un devis |
| POST | /api/quotes/:id/accept | Accepter un devis |

## 🔒 Authentification

Toutes les requêtes protégées nécessitent un header:

```
Authorization: Bearer <access_token>
```

## 📝 Exemples d'utilisation

### Inscription
```bash
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "Password123!",
    "firstName": "John",
    "lastName": "Doe",
    "phone": "+33612345678"
  }'
```

### Créer une commande
```bash
curl -X POST http://localhost:4000/api/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "items": [
      { "platId": "uuid", "platName": "Couscous Royal", "quantity": 2, "unitPrice": 18.00 }
    ],
    "deliveryAddress": {
      "street": "123 Rue Example",
      "city": "Paris",
      "zipCode": "75001",
      "country": "France"
    },
    "deliveryDate": "2024-12-25T12:00:00Z"
  }'
```

## 📄 License

MIT
