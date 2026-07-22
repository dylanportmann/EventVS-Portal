# Inscription Entra `EventVS Portal`

Configuration mono-tenant EPFL :

- Application (client) ID : `9fa9550c-921f-449e-8ef3-9228e1ff2eb1`.
- Directory (tenant) ID : `f6c2556a-c4fb-4ab1-a2c7-9e220df11c43`.
- Supported account types : comptes dans tenant EPFL seulement.
- Platform : Single-page application.
- Redirect URI production : `https://dylanportmann.github.io/EventVS-Portal/`.
- Redirect URI développement : `http://localhost:5173/EventVS-Portal/`.
- Aucun client secret : SPA utilise Authorization Code + PKCE.
- Permission déléguée disponible : Microsoft Graph `User.Read`.
- Scopes OIDC : `openid`, `profile`, `email`, `offline_access` gérés par MSAL.
- Scope Power Automate non consenti : test OAuth retourne `AADSTS65001`.

[`public/config.js`](../public/config.js) utilise client ID, endpoint pilote et `https://graph.microsoft.com/User.Read`. Client ID, tenant ID et redirect URI sont publics. Ne jamais versionner secret client, bearer, HAR, OTP, session portail, cookie ou export contenant connexion.

URI `https://app-portal.epfl.ch/auth/callback` appartient à autre callback/hébergement et ne renvoie pas vers cette SPA GitHub Pages. Elle ne remplace pas URI production ci-dessus.

Tester cinq cas avant pilote :

1. utilisateur hors allowlist demandant code → 403;
2. code incorrect/expiré → 401;
3. appel données sans session → 401;
4. Jennifer Brady + code → 200;
5. Dylan Portmann + code → 200.
