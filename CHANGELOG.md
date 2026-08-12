# Journal des modifications (Changelog) - Messenging API Nest

Toutes les modifications notables apportées à ce projet sont documentées dans ce fichier.

Le format est basé sur [Keep a Changelog](https://keepachangelog.com/fr/1.0.0/),
et ce projet adhère au [Gestion des versions sémantique (SemVer)](https://semver.org/lang/fr/).

---

## [1.1.0] - 2026-08-12

### Ajouté (Added)
- **Sonde de santé (`/health`)** : Implémentation d'un endpoint de supervision publique vérifiant l'état de la base de données PostgreSQL (Prisma), la mémoire consommée (RSS, Heap) et le temps d'up-time du processus (`735c5ae`, `eaa01a5`).
- **Supervision Conteneurisée** : Ajout de sondes `HEALTHCHECK` dans le `Dockerfile` et le fichier `docker-compose.yml` (`ed0110a`).
- **Documentation MCO & Support** : Ajout du guide de support N1/N2/N3 et de la procédure d'escalade d'incidents (`SUPPORT.md`).
- **Templates d'Anomalies** : Intégration des modèles d'issues GitHub pour le signalement des bogues et demandes d'évolution (`.github/ISSUE_TEMPLATE/`).

### Modifié (Changed)
- **Rate-Limiting (Throttler)** : Ajustement des règles du `ThrottlerModule` sur les routes d'authentification et de téléchargement de médias.
- **Docker Compose** : Configuration de la variable `POSTGRES_DATABASE_URL` pour pointer vers le service `postgres:5432` du réseau inter-conteneurs.

---

## [1.0.0] - 2026-07-22

### Ajouté (Added)
- **Harnais de Tests Unitaires & E2E** : Couverture complète des contrôleurs, services et passerelles WebSockets sous Jest (`3180037`).
- **Pipeline CI/CD GitHub Actions** : Validation statique (ESLint/Prettier), exécution automatisée des tests unitaires et publication de l'image Docker multi-architecture sur Docker Hub (`412f788`).
- **Limitation de Débit (Rate Limiting)** : Protection de l'API contre les attaques par déni de service et force brute (`fc6215b`).

### Corrigé (Fixed)
- Correction des erreurs de synchronisation du client Prisma lors du démarrage à froid (`b68147e`).
- Résolution des erreurs de linter ESLint et mise à jour de la configuration de formatage (`50876a0`).

---

## [0.2.0] - 2026-07-07

### Ajouté (Added)
- **Nettoyage et Refactoring Prisma** : Optimisation des modèles de données (Canaux, Messages, Utilisateurs) et mise à jour du script de seed (`63d63b1`).
- **Documentation OpenAPI (Swagger)** : Exposition de la documentation interactive des routes REST sur `/swagger` (`a37bd10`).
- **Module d'Authentification Sécurisé** : Gestion des jetons JWT (Access Token & Refresh Token) avec hachage Bcrypt et stratégies Passport (`5f0d50c`).

---

## [0.1.0] - 2026-03-20

### Ajouté (Added)
- **Notifications Push Relais** : Intégration du service de notification push délégué via le SDK Expo (`4345cf3`).
- **Module d'Upload de Médias** : Gestion du stockage sécurisé des pièces jointes et images (`ff72089`, `3e9cd33`).
- **Gestion des Sockets Real-Time** : Gateway Socket.io pour la transmission instantanée des messages et de la présence des utilisateurs (`6628181`).
- **Configuration Initiale** : Initialisation du framework NestJS avec TypeScript, Prisma ORM et Docker Compose (`3d3dd38`).
