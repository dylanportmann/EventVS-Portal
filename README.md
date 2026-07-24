# Event VS — Pilotage

SPA HTML/CSS/JavaScript pour suivi des demandes d'événements EPFL Valais Wallis. Frontend public ne contient aucune donnée métier ni secret durable. Accès exige connexion Entra EPFL puis code email Event VS.

## État

Pilote déployé : Entra `User.Read`, code email, session portail 8 h, API Power Automate, lecture/édition SharePoint et orchestration Approval séparée par équipe. Tâches Approval initiales/révisions sont source autoritative; résumé task-driven et portail se synchronisent automatiquement.

Routage Approval vient de [`src/approval-recipients.json`](src/approval-recipients.json). Portail OTP reste Jennifer + Dylan. Groupes Infra/IT utilisent première réponse; historique conserve destinataires réellement utilisés.

## Développement

```bash
npm install
npm run dev -- --host 127.0.0.1
```

Démo locale : `http://127.0.0.1:5173/EventVS-Portal/?demo=1#/dashboard`.

```bash
npm run check
```

## Configuration production

1. Suivre [`docs/entra-setup.md`](docs/entra-setup.md).
2. Provisionner SharePoint selon [`docs/power-automate/sharepoint-lists.md`](docs/power-automate/sharepoint-lists.md).
3. Construire flux selon [`docs/power-automate/implementation.md`](docs/power-automate/implementation.md).
4. Remplacer placeholders [`public/config.js`](public/config.js). Valeurs SPA publiques seulement.
5. Exécuter matrice [`docs/test-matrix.md`](docs/test-matrix.md).
6. Activer GitHub Pages par GitHub Actions.

MSAL Browser utilise Authorization Code + PKCE pour SPA; aucun secret client. EPFL bloque consentement scope Power Automate et licence actuelle interdit action HTTP Premium. Pilote utilise donc `User.Read` + OTP envoyé uniquement à Jennifer/Dylan. Session aléatoire stockée SharePoint; endpoint public ne retourne aucune donnée sans session valide.

Limite connue : URL callback publique expose quota déclencheur Power Automate aux appels abusifs. Données restent protégées par OTP/session, mais solution cible reste trigger Entra `Specific users in my tenant` ou proxy Kubernetes/APIM.

Documentation Microsoft :

- [MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser)
- [OAuth pour triggers HTTP Power Automate](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)
- [Politique CORS Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/cors-policy)

## Contrat API

POST unique. Auth bootstrap : `startSession`, `verifySession`. Données : `listRequests`, `getRequest`, `updateRequest`, `cancelEvent`, `getCancellationStatus`. `updateRequest` applique concurrence optimiste et crée une tâche Approval distincte par équipe touchée. `cancelEvent` exige confirmation explicite, enfile suppression idempotente et libère ressources avant recyclage SharePoint.

`clientContext` sert uniquement affichage. Identité pilote provient adresse email OTP vérifiée. Concurrence : `expectedRevision`; conflit HTTP 409 `REVISION_CONFLICT` avant toute annulation ou création.

Définitions opérationnelles générées depuis dossier parent `Eventvs` :

- `build_approval_tasks_provisioner.py` : liste SharePoint et clé `requestId|team|revision` unique;
- `build_team_approval.py` : un run et une Approval par tâche/équipe;
- `build_approval_summary_sync.py` : agrégation tâche → demande, trois tentatives avec relecture complète et ETag;
- `build_portal_api.py` : remplacement ciblé, `CancelFlowRun`, réponse `approvalChanges`;
- `migrate_initial_approval_tasks.py` : rattachement idempotent Approvals initiales depuis historique, sans recréation;
- `build_cancellation_provisioner.py` / `build_delete_event.py` : tombstone, IDs Outlook exacts et worker suppression;
- `instrument_event_flow_cancellation.py` : enregistrement runs initiaux et réservations futures;
- `deploy_event_cancellation.py` : déploiement complet après HAR frais;
- `verify_approval_flows.py` : validation statique avant déploiement.

## Architecture future

Frontend n'utilise aucune API GitHub spécifique. Image statique `dist/` fonctionne sur GitHub Pages, serveur web Kubernetes ou CDN. En Kubernetes, servir frontend et proxy API sous même origine résout CORS sans changer contrat JSON.
