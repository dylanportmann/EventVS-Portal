# Contexte de reprise

Dernière mise à jour : 22 juillet 2026.

Sources portail : `/Users/dportman/Desktop/Eventvs/EventVS-Portal`.

Tenant EPFL : `f6c2556a-c4fb-4ab1-a2c7-9e220df11c43`.

Production cible : `https://dylanportmann.github.io/EventVS-Portal/`.

État pilote :

- application Entra identifiée : client ID `9fa9550c-921f-449e-8ef3-9228e1ff2eb1`;
- plateforme SPA et URI GitHub Pages/localhost enregistrées;
- scope Graph `User.Read` disponible; scope Flow bloqué (`AADSTS65001`);
- licence Power Automate sans Premium;
- flux `EventVS Portal API` créé et actif, ID `eb6857a7-3a07-4163-bcd9-6a6bb30baa5a`;
- OTP autorisé pour Jennifer Brady et Dylan Portmann; session 8 h en SharePoint;
- liste et détail SharePoint actifs; édition masquée;
- CORS gateway `*`; quota endpoint reste exposé;
- 29 tests frontend et build Vite passent;

Restes à faire :

- colonnes/listes SharePoint de suivi à provisionner;
- activer `updateRequest`, historique, Approvals obsolètes et réservation transactionnelle;
- faire test manuel Jennifer et Dylan avec code reçu;
- migrer vers trigger Entra protégé ou proxy Kubernetes/APIM;
- formulaire public source modifié localement, redéploiement Power Automate requis.

Mode démo local : `npm run dev`, puis `?demo=1#/dashboard`. Démo impossible hors localhost par code.

Ne jamais stocker bearer, HAR, OTP, session portail, cookie, client secret ou connection reference sensible dans dépôt.
