# Contexte de reprise

Dernière mise à jour : 24 juillet 2026.

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
- flux `EventVS Approval Summary Sync` actif, ID `5ff9b6f1-d404-4181-94f1-b2bda03c29e2`;
- flux `EventVS Approval Response Watcher` actif, ID `44651d66-275b-4857-843e-377399e4b826`; surveille seulement Approvals historiques `Queued`;
- routage équipe déployé le 24 juillet 2026 : Event Jennifer; Infra Lou + Oscar; Sécurité Julien; Signalétique Jennifer; IT Dylan + Jean + Cédric;
- groupes Infra/IT restent `approvalType=Basic` : première réponse termine carte équipe;
- six définitions live relues après déploiement : état `Started`, contenu identique aux JSON générés;
- run historique demande 5 contrôlé après patch : 4/4 Approval IDs, run IDs et destinataires inchangés;
- recette routage demande 9 créée sans réservation Outlook : une seule carte Event envoyée à Jennifer; suite technique attend réponse Jennifer;
- dossier 8 corrigé : IT approuvé par Dylan à 11:53, global `Étude technique`, attente Infra seule;
- connexion `Power Automate Management` intégrée active et flux API remplacé;
- formulaire public avec brouillon local/autosave et expiration 30 jours déployé;
- recette réelle Infra validée : deux runs obsolètes annulés, nouvelle Approval approuvée, statut global `Validé`;
- migration pilote inspectée : seule ancienne Approval groupée déjà terminée/refusée, donc aucune carte ouverte à annuler ou tâche à recréer;
- annulation complète déployée : bouton confirmé, job asynchrone, annulation runs, suppression Outlook par ID exact, corbeille SharePoint et tombstone minimal;
- flux `EventVS Delete Event` actif, ID `6eecfa5a-f38a-47e7-98f9-96a036c93370`; listes `EventVS Deletion Jobs` (`2bef60da-8eb4-44ea-906a-4d541bbd78a9`), `EventVSReservations` (`db8d545a-fb9c-4dd9-959b-1b6691e684ee`) et `EventVS Runtime Links` (`f40102be-60a6-484c-a304-37bea9cd8efc`) actives;
- recette réelle annulation validée deux fois : demande moderne supprimée, run initial annulé, deux liens runtime supprimés, email envoyé; triple soumission identique retourne même job HTTP 202;
- garde legacy validée : demande avec réservations non suivies retourne HTTP 409 `CANCELLATION_BLOCKED`, sans mutation;
- CORS gateway `*`; quota endpoint reste exposé;
- tests portail couvrent routage, agrégation, corrélation, migration, aperçu et historique;

Restes à faire :

- terminer réservation transactionnelle;
- faire test manuel Jennifer et Dylan avec code reçu;
- migrer vers trigger Entra protégé ou proxy Kubernetes/APIM;

Mode démo local : `npm run dev`, puis `?demo=1#/dashboard`. Démo impossible hors localhost par code.

Ne jamais stocker bearer, HAR, OTP, session portail, cookie, client secret ou connection reference sensible dans dépôt.
