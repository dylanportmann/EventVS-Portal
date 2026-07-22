# Event VS — Pilotage

SPA HTML/CSS/JavaScript pour suivi des demandes d'événements EPFL Valais Wallis. Frontend public ne contient aucune donnée métier ni secret; accès données exige jeton Microsoft Entra ID et trigger Power Automate limité aux gestionnaires autorisés.

## État

Frontend, moteur règles, client API, mode démo local, tests et documentation backend présents. Production reste volontairement bloquée par placeholders tant que client ID Entra, endpoint Power Automate protégé et test CORS preflight ne sont pas fournis.

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

MSAL Browser utilise Authorization Code + PKCE pour SPA; aucun secret client. Trigger Power Automate doit utiliser `Specific users in my tenant`, avec champ allowed users non vide. Audience cloud public attendue : `https://service.flow.microsoft.com/`.

Documentation Microsoft :

- [MSAL Browser](https://learn.microsoft.com/en-us/entra/msal/javascript/browser/about-msal-browser)
- [OAuth pour triggers HTTP Power Automate](https://learn.microsoft.com/en-us/power-automate/oauth-authentication)
- [Politique CORS Azure API Management](https://learn.microsoft.com/en-us/azure/api-management/cors-policy)

## Contrat API

POST unique. Actions : `listRequests`, `getRequest`, `updateRequest`. Schéma : [`docs/schemas/api-contract.json`](docs/schemas/api-contract.json).

`clientContext` sert uniquement affichage. Backend journalise acteur depuis claims du jeton validé. Concurrence : `expectedRevision`; conflit retourne HTTP 409 `REVISION_CONFLICT`.

## Architecture future

Frontend n'utilise aucune API GitHub spécifique. Image statique `dist/` fonctionne sur GitHub Pages, serveur web Kubernetes ou CDN. En Kubernetes, servir frontend et proxy API sous même origine résout CORS sans changer contrat JSON.
