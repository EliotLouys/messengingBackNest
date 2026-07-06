# Messaging API Nest

Ce projet est une API de messagerie temps réel construite avec le framework NestJS et TypeScript. Elle gère les utilisateurs, les canaux de discussion (channels), les messages temps réel avec WebSockets (Socket.io), le stockage de fichiers via encodage base64, ainsi que l'envoi de notifications push vers des appareils utilisant Expo.

L'application Frontend prévue pour l'usage de cette API est l'application [Tenropes](https://github.com/ByggL/tenropes).

## Stack

- Framework principal : NestJS
- Langage : TypeScript
- ORM : Prisma
- Base de données : PostgreSQL sous Docker
- Communication temps réel : Socket.io (via le module WebSockets de NestJS)
- Sécurité et authentification : Passport, JWT (Access Tokens et Refresh Tokens) et hachage des mots de passe avec bcrypt
- Notifications : Intégration Expo Server SDK avec délégation de relais HTTP
- Documentation : Swagger OpenAPI

## Configuration et Installation

### Prérequis

- Node.js
- Docker et Docker Compose (si vous souhaitez lancer la base de données PostgreSQL en conteneur)
- npm (installe automatiquement avec Node.js)

### Installation des dépendances

```bash
npm install
```

### Variables d'environnement

Créez votre fichier .env en copiant le fichier .env.example :

```bash
cp .env.example .env
```

Renseignez les variables suivantes en vous basant sur le fichier .env.example :
- DATABASE_URL : L'URL de connexion à la base de données pour Prisma.
- JWT_SECRET : La clé secrète pour signer les tokens d'accès JWT.
- RT_SECRET : La clé secrète pour signer les tokens de rafraîchissement (Refresh Tokens).
- REGISTRATION_CODE : (Optionnel) Un code d'invitation requis lors de la création d'un compte utilisateur. S'il est absent ou vide, l'inscription est libre.
- RELAY_URL : URL du service de relais pour l'envoi des notifications push (par défaut http://localhost:4000/push).
- RELAY_SECRET : Clé d'authentification Bearer requise pour autoriser l'envoi vers le relais de notifications push.
- POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB : Paramètres de configuration pour le conteneur Docker PostgreSQL.
- POSTGRES_DATABASE_URL : URL de connexion PostgreSQL (par défaut sur le port 5440 dans le docker-compose.yml).

### Lancement de la base de données

Pour démarrer la base de données PostgreSQL via Docker Compose :

```bash
npm run db:up
```

Cette commande démarre le conteneur de base de données en arrière-plan et applique les migrations Prisma existantes.

Pour arrêter la base de données :

```bash
npm run db:stop
```

### Initialisation de la base de données

Pour initialiser la base de données avec des données de test (seeding) :

```bash
npm run seed
```

Pour réinitialiser complètement la base de données (efface toutes les données, réexécute les migrations et insère les données initiales) :

```bash
npm run db:reset
```

Le script de peuplement (seeding) crée :
- 4 utilisateurs : Alice, Bob, Charlie et Dave (tous ont le mot de passe "123456").
- 1 canal public : "General" (contenant tous les utilisateurs).
- 2 canaux privés : "Staff Only" (membres : Alice et Bob) et "Dev Secrets" (membres : Charlie et Dave).
- Des messages d'exemple dans chaque canal.

### Exécution de l'application

Vous pouvez lancer le serveur dans différents modes :

```bash
# Mode développement (avec redémarrage automatique lors des modifications)
npm run start:dev

# Mode developpement complet (réinitialise la base de données puis lance le serveur)
npm run dev

# Compilation en production
npm run build

# Mode production
npm run start:prod
```

Par défaut, l'API écoute sur le port 3000 (ou la valeur définie par la variable d'environnement PORT).

## Documentation de l'API (Swagger)

Une interface interactive Swagger est disponible lorsque le serveur de développement fonctionne.

```
http://localhost:3000/swagger
```

Elle décrit l'ensemble des routes, les schémas des requêtes et permet de tester directement les appels d'API en configurant un token d'authentification Bearer.

## Guide d'utilisation des endpoints REST

Tous les endpoints protégés nécessitent un en-tête HTTP `Authorization: Bearer <access_token>`.

### Authentification (Préfixe : `/auth`)

- Inscription d'un utilisateur
  - Méthode : `POST`
  - URL : `/auth/register`
  - Corps de la requête :
    ```json
    {
      "username": "PseudoUnique",
      "password": "MotDePasseDe6CaracteresMinimum",
      "registrationCode": "CodeOptionnelSiDefiniDansLeEnv"
    }
    ```
  - Réponse : Objet de l'utilisateur créé (sans le mot de passe).

- Connexion d'un utilisateur
  - Méthode : `POST`
  - URL : `/auth/login`
  - Corps de la requête :
    ```json
    {
      "username": "PseudoUnique",
      "password": "MotDePasse"
    }
    ```
  - Réponse : Contient l'access_token (JWT) et le refresh_token.

- Déconnexion
  - Méthode : `POST`
  - URL : `/auth/logout`
  - Sécurité : JWT requis.
  - Réponse : Code de statut 200 OK. Supprime le token de rafraîchissement de la base de données.

- Rafraîchissement des tokens
  - Méthode : `POST`
  - URL : `/auth/refresh`
  - Sécurité : JWT Refresh Token requis (envoyé dans l'en-tête Authorization).
  - Réponse : Nouveaux access_token et refresh_token.

### Gestion des Utilisateurs (Préfixe : `/user`)

- Récupérer son propre profil
  - Méthode : `GET`
  - URL : `/user/meta`
  - Sécurité : JWT requis.
  - Réponse : Données de l'utilisateur connecté (id, username, display_name, img, status, notificationsEnabled, createdAt).

- Mettre à jour son profil
  - Méthode : `PATCH`
  - URL : `/user/meta`
  - Sécurité : JWT requis.
  - Corps de la requête :
    ```json
    {
      "username": "NouveauPseudo"
    }
    ```
  - Réponse : Profil mis à jour.

- Récupérer plusieurs profils en lot (Batch)
  - Méthode : `POST`
  - URL : `/user/batch`
  - Sécurité : JWT requis.
  - Corps de la requête :
    ```json
    {
      "usernames": ["Alice", "Bob"]
    }
    ```
  - Réponse : Liste des profils correspondants avec leurs pseudos, display_names, images et statuts.

- Enregistrer un token de notification push Expo
  - Méthode : `POST`
  - URL : `/user/push-token`
  - Sécurité : JWT requis.
  - Corps de la requête :
    ```json
    {
      "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    }
    ```
  - Réponse : Enregistrement de l'appareil dans la base de données.

- Supprimer un token de notification push Expo
  - Méthode : `DELETE`
  - URL : `/user/push-token`
  - Sécurité : JWT requis.
  - Corps de la requête :
    ```json
    {
      "token": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
    }
    ```
  - Réponse : Statut de suppression.

### Gestion des Canaux (Préfixe : `/protected/channels`)

Toutes ces routes nécessitent d'être authentifié via JWT.

- Lister les canaux de l'utilisateur connecté
  - Méthode : `GET`
  - URL : `/protected/channels`
  - Réponse : Liste des canaux dont l'utilisateur fait partie, comprenant les membres associés et leurs rôles.

- Obtenir les détails d'un canal
  - Méthode : `GET`
  - URL : `/protected/channels/:channel_id`
  - Réponse : Détails du canal et liste complète de ses membres.

- Créer un canal
  - Méthode : `POST`
  - URL : `/protected/channels`
  - Corps de la requête :
    ```json
    {
      "name": "NomDuCanal",
      "img": "http://lien-image.com/image.png",
      "theme": {
        "primary_color": "#Hex",
        "primary_color_dark": "#Hex",
        "accent_color": "#Hex",
        "text_color": "#Hex",
        "accent_text_color": "#Hex"
      }
    }
    ```
  - Réponse : Objet du canal créé. L'utilisateur créateur est automatiquement désigné comme administrateur du canal (role admin).

- Supprimer un canal
  - Méthode : `DELETE`
  - URL : `/protected/channels/:channel_id`

- Mettre à jour les métadonnées d'un canal
  - Méthode : `PUT`
  - URL : `/protected/channels/:channel_id/update_metadata`
  - Corps de la requête :
    ```json
    {
      "name": "NouveauNom",
      "img": "NouveauLienImage",
      "theme": {
        "primary_color": "#Hex",
        "primary_color_dark": "#Hex",
        "accent_color": "#Hex",
        "text_color": "#Hex",
        "accent_text_color": "#Hex"
      }
    }
    ```

- Ajouter un utilisateur à un canal
  - Méthode : `PUT`
  - URL : `/protected/channels/:channel_id/user/:user_id`

- Retirer un utilisateur d'un canal (quitter ou exclure)
  - Méthode : `DELETE`
  - URL : `/protected/channels/:channel_id/user/:user_id`

- Envoyer un message dans un canal
  - Méthode : `POST`
  - URL : `/protected/channels/:channel_id/messages`
  - Corps de la requête :
    ```json
    {
      "content": "Contenu du message",
      "type": "Text"
    }
    ```
  - Comportement : Enregistre le message, le diffuse en temps reel a tous les clients connectes au salon de discussion via WebSockets, et decline l'envoi de notifications push aux autres membres du canal disposant d'un appareil enregistre.

- Consulter l'historique des messages d'un canal
  - Méthode : `GET`
  - URL : `/protected/channels/:channel_id/messages`
  - Paramètres de requête (Query) :
    - `skip` : Nombre de messages a ignorer (pour la pagination).
    - `take` : Nombre de messages a recuperer (par defaut 40).
  - Réponse : Liste des messages ordonnés par date de création décroissante.

### Envoi de Fichiers / Médias (Préfixe : `/protected/uploads`)

- Téléverser une image (Format Base64)
  - Méthode : `POST`
  - URL : `/protected/uploads/image`
  - Sécurité : JWT requis.
  - Corps de la requête :
    ```json
    {
      "file": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA..."
    }
    ```
  - Comportement : Décode la chaine de caracteres base64, applique une restriction de taille limitée à 10 Mo, écrit le fichier sur le disque dans le dossier `./files` sous un nom unique au format UUID et retourne son URL d'accès.
  - Réponse :
    ```json
    {
      "url": "http://localhost:3000/uploads/nom_du_fichier.jpg"
    }
    ```

## Guide d'utilisation des WebSockets (Temps réel)

L'API intègre un serveur Socket.io pour la communication bidirectionnelle en temps réel.

### Connexion et Authentification

Lors de l'établissement de la connexion WebSocket, le client doit s'authentifier à l'aide du jeton JWT d'accès de l'une des deux manières suivantes :
1. En le transmettant dans l'option `auth` de Socket.io sous la clé `token`.
2. En le transmettant dans l'en-tête HTTP `Authorization` sous la forme `Bearer <token>`.

Si aucun token n'est fourni ou s'il est invalide, la connexion est automatiquement rejetée par le serveur.

### Événements émis par le client (Client vers Serveur)

- Rejoindre la diffusion d'un canal
  - Nom de l'évenement : `joinChannel`
  - Corps de l'évenement (Payload) : Identifiant numerique du canal (`channelId`).
  - Effet : Le client rejoint la salle (room) Socket.io identifiee par `channel_<channelId>` pour recevoir les nouveaux messages de ce canal.

- Quitter la diffusion d'un canal
  - Nom de l'évenement : `leaveChannel`
  - Corps de l'évenement (Payload) : Identifiant numerique du canal (`channelId`).
  - Effet : Le client est retire de la salle Socket.io correspondante.

### Événements reçus par le client (Serveur vers Client)

- Réception d'un nouveau message
  - Nom de l'évenement : `message`
  - Reçu dans : La salle `channel_<channelId>` à laquelle le client a souscrit.
  - Payload reçu : Objet complet du message (contenant l'auteur, la date de creation, le type et le contenu).

## Relais de Notifications Push

Lorsqu'un message est posté dans un canal :
1. L'API identifie tous les membres du canal (sauf l'auteur du message).
2. Pour chaque membre, elle récupère les jetons push Expo enregistrés via le modèle Device.
3. Si l'utilisateur a activé ses notifications, l'API envoie une requête contenant les payloads des notifications push vers un serveur de relais délégué défini par `RELAY_URL`.
4. La requête HTTP est sécurisée par l'en-tête d'autorisation Bearer contenant le secret défini dans `RELAY_SECRET`.

## Suite de Tests

Le projet inclut une configuration de test avec Jest.

```bash
# Exécution des tests unitaires
npm run test

# Execution des tests de bout en bout (e2e)
npm run test:e2e

# Generation du rapport de couverture de code
npm run test:cov
```
