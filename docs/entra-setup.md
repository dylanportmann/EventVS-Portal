# Inscription Entra `EventVS Portal`

Configuration mono-tenant EPFL :

- Supported account types : comptes dans tenant EPFL seulement.
- Platform : Single-page application.
- Redirect URI production : `https://dylanportmann.github.io/EventVS-Portal/`.
- Redirect URI développement : `http://localhost:5173/EventVS-Portal/`.
- Aucun client secret : SPA utilise Authorization Code + PKCE.
- API permission déléguée Power Automate permettant audience `https://service.flow.microsoft.com/`; consentement administrateur si requis.
- Token audience exact attendu par trigger : `https://service.flow.microsoft.com/`.

Après création, modifier [`public/config.js`](../public/config.js) : `clientId`, URL HTTP protégée, scope réellement exposé/consenti. Client ID, tenant ID, redirect URI et URL endpoint ne sont pas secrets. Ne jamais versionner secret, bearer, HAR, cookie ou export contenant connexion.

Tester quatre cas avant pilote :

1. aucun jeton → 401;
2. utilisateur EPFL hors allowed users → 403;
3. Jennifer Brady → 200;
4. Dylan Portmann → 200.
