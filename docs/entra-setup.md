# Inscription Entra `EventVS Portal`

Configuration mono-tenant EPFL :

- Application (client) ID : `9fa9550c-921f-449e-8ef3-9228e1ff2eb1`.
- Directory (tenant) ID : `f6c2556a-c4fb-4ab1-a2c7-9e220df11c43`.
- Supported account types : comptes dans tenant EPFL seulement.
- Platform : Single-page application.
- Redirect URI production : `https://dylanportmann.github.io/EventVS-Portal/`.
- Redirect URI développement : `http://localhost:5173/EventVS-Portal/`.
- Aucun client secret : SPA utilise Authorization Code + PKCE.
- API permission déléguée Power Automate permettant audience `https://service.flow.microsoft.com/`; consentement administrateur si requis.
- Token audience exact attendu par trigger : `https://service.flow.microsoft.com/`.

Après création, modifier [`public/config.js`](../public/config.js) : `clientId`, URL HTTP protégée, scope réellement exposé/consenti. Client ID, tenant ID, redirect URI et URL endpoint ne sont pas secrets. Ne jamais versionner secret, bearer, HAR, cookie ou export contenant connexion.

URI `https://app-portal.epfl.ch/auth/callback` appartient à autre callback/hébergement et ne renvoie pas vers cette SPA GitHub Pages. Elle ne remplace pas URI production ci-dessus.

Tester quatre cas avant pilote :

1. aucun jeton → 401;
2. utilisateur EPFL hors allowed users → 403;
3. Jennifer Brady → 200;
4. Dylan Portmann → 200.
