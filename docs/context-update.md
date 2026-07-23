# Contexte de reprise

Dernière mise à jour : 23 juillet 2026.

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
- liste, détail et édition SharePoint actifs;
- liste `EventVS Approval Tasks` active, ID `4bcbef74-433a-4166-a02d-452c5c461994`;
- flux enfant `EventVS Team Approval` actif, ID `a120b719-5232-4cd6-9386-94913b427b05`;
- connexion `Power Automate Management` intégrée active et flux API remplacé;
- formulaire public avec brouillon local/autosave et expiration 30 jours déployé;
- recette réelle Infra validée : deux runs obsolètes annulés, nouvelle Approval approuvée, statut global `Validé`;
- migration pilote inspectée : seule ancienne Approval groupée déjà terminée/refusée, donc aucune carte ouverte à annuler ou tâche à recréer;
- CORS gateway `*`; quota endpoint reste exposé;
- tests portail couvrent routage, agrégation, corrélation, migration, aperçu et historique;

Restes à faire :

- terminer réservation transactionnelle;
- faire test manuel Jennifer et Dylan avec code reçu;
- migrer vers trigger Entra protégé ou proxy Kubernetes/APIM;

Mode démo local : `npm run dev`, puis `?demo=1#/dashboard`. Démo impossible hors localhost par code.

Ne jamais stocker bearer, HAR, OTP, session portail, cookie, client secret ou connection reference sensible dans dépôt.
