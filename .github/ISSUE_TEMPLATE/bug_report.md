---
name: Bug report / Signalement d'anomalie
about: Consignation d'une anomalie technique ou fonctionnelle du serveur backend.
title: '[BUG] '
labels: 'bug, backend'
assignees: ''
---

## Description de l'anomalie
Une description claire et concise de l'anomalie observée.

## Environnement
- **Version du serveur (SemVer)** : ex: v1.1.0
- **Environnement** : [ex: Production, Staging, Docker Auto-hébergé, Local]
- **Version Node.js / Docker** : ex: Node v22.x / Docker v27.x
- **Base de données** : PostgreSQL 16 / Prisma ORM

## Étapes de reproduction
Étapes permettant de reproduire l'anomalie :
1. Envoyer une requête HTTP `POST /api/auth/login` avec ...
2. Observer la réponse du serveur ...
3. Consulter les logs de l'API ...

## Comportement attendu
Ce qui aurait dû se passer.

## Stacktrace & Logs d'erreur
```text
Insérer ici les logs structurés ou la stacktrace d'erreur.
```

## Niveau de sévérité & impact
- [ ] **Bloquant (Critique)** : Arrêt total du service / indisponibilité.
- [ ] **Majeur** : Fonctionnalité clé dégradée sans solution de contournement.
- [ ] **Mineur** : Dysfonctionnement léger avec solution de contournement.
