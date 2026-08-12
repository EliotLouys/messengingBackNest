# Guide de Support et Procédure de Dépannage (MCO) - Backend Tenropes

Ce document définit les démarches de support technique, la gestion des incidents en production et la procédure de résolution de pannes complexes pour le serveur backend **Tenropes** (`messengingBackNest`).

---

## 1. Niveaux de Support et Processus d'Escalade

| Niveau | Acteur | Rôle & Périmètre | Outils d'investigation |
| :--- | :--- | :--- | :--- |
| **Niveau 1** | Support Utilisateur / Auto-hébergeur | Prise en compte du ticket, vérification des accès et de la connectivité réseau de base. | Client Mobile / GitHub Issues |
| **Niveau 2** | Exploitation / SysAdmin | Inspection des métriques de santé (`/health`), contrôle des conteneurs Docker et des logs. | Docker CLI / Docker Compose / Logs NestJS |
| **Niveau 3** | Équipe de Développement | Analyse approfondie des stacktraces, correction de bugs de code, migrations de base de données. | NestJS / Prisma ORM / Git Hotfix |

---

## 2. Procédure de Diagnostic de Santé (Supervision)

L'API intègre une sonde de santé accessible sur la route publique HTTP GET `/health`.

### Interprétation de la réponse de santé :
```json
{
  "status": "ok",
  "timestamp": "2026-08-12T10:45:00.000Z",
  "uptime": 14205.4,
  "responseTimeMs": 4,
  "checks": {
    "database": "up",
    "memory": {
      "rss": 84500000,
      "heapTotal": 45000000,
      "heapUsed": 32000000
    }
  }
}
```

- Si `status` vaut `"ok"` (HTTP 200) : L'API et la base de données PostgreSQL répondent normalement.
- Si `status` vaut `"error"` (HTTP 503) : Un composant critique est en panne (par exemple `database: "down"`).

---

## 3. Matrice de Résolution des Incidents Complexes

### Incident 1 : Perte de Connexion à la Base de Données (`P1001` / `database: down`)
* **Symptômes** : `/health` renvoie HTTP 503, l'API renvoie des erreurs 500 sur l'authentification et les messages.
* **Procédure d'escalade N2/N3** :
  1. Vérifier le statut du conteneur PostgreSQL : `docker compose ps`
  2. Inspecter les logs PostgreSQL : `docker compose logs postgres --tail=100`
  3. Relancer le conteneur DB : `docker compose restart postgres`
  4. Si la base est corrompue ou inacessible, vérifier les droits du volume `postgres_data` et réappliquer les migrations :
     ```bash
     npx prisma migrate deploy
     ```

### Incident 2 : Échec d'envoi des Notifications Push Expo (`expo-server-sdk`)
* **Symptômes** : Les utilisateurs ne reçoivent pas de notifications push lors de la réception d'un message en arrière-plan.
* **Procédure d'escalade N2/N3** :
  1. Inspecter les logs NestJS filtrés sur `NotificationsService` :
     ```bash
     docker compose logs messaging-api | grep "NotificationsService"
     ```
  2. Vérifier la présence de la variable d'environnement `RELAY_SECRET` dans le fichier `.env`.
  3. Si des jetons `DevicePushToken` expirés sont détectés (`DeviceNotRegistered`), nettoyer les jetons invalides via la table utilisateur en base de données.

### Incident 3 : Déconnexions massives des Sockets WebSockets (Socket.io)
* **Symptômes** : Les clients mobiles se déconnectent en boucle et basculent en reconnexion automatique.
* **Procédure d'escalade N2/N3** :
  1. Vérifier si la limite d'invalidation du rate-limiter (`ThrottlerModule`) n'a pas été atteinte (`THROTTLE_LIMIT`).
  2. Vérifier si le reverse proxy (Nginx / Traefik / Caddy) transmet correctement les en-têtes Upgrade pour les WebSockets :
     ```nginx
     proxy_set_header Upgrade $http_upgrade;
     proxy_set_header Connection "Upgrade";
     ```

---

## 4. Contact et Escalade d'Urgence

En cas d'incident critique non résolu par la procédure ci-dessus :
- **Dépôt d'incident** : [Créer un ticket d'anomalie sur GitHub](https://github.com/EliotLouys/messengingBackNest/issues/new?template=bug_report.md)
- **Équipe de développement** : Eliot Louys & Samuel Léobon
