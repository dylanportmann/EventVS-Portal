# Matrice de recette

## Automatisé

- `npm test` : règles routage unitaires et combinées, scope hash, brouillons, API, échappement XSS.
- `npm run build` : bundle production GitHub Pages.

## Auth et transport

- Sans `Authorization` → 401, aucune exécution métier.
- Jeton autre tenant → 401/403.
- Utilisateur EPFL hors allowed users → 403.
- Jennifer Brady → 200.
- Dylan Portmann → 200.
- `OPTIONS` depuis GitHub Pages → origine exacte, `POST`, `authorization, content-type`.
- Origine non autorisée → preflight refusée.
- Jeton expiré → MSAL silent refresh puis nouvel appel.

## Liste/détail

- Pagination stable, taille 12 puis 100 max côté API.
- Recherche référence/titre/organisateur.
- Filtres statut, date début/fin, équipe, retard, combinés.
- Détail : 5 équipes, commentaires, répondants, heures livraison/réponse, réservations, chronologie, historique.
- Destinataires Infra/IT multiples affichés avec virgules; répondant réel distinct reste visible.
- Avant routage équipe sans tâche → `À venir`; après `RoutingComplete` → `Non requis`.
- Import historique incomplet → `Suivi partiel`, jamais `Non requis` inventé.
- Poll réussi sans changement actualise `Synchronisé à HH:mm:ss`.
- Poll échoué affiche avertissement discret; focus/retour onglet visible relance lecture immédiate.

## Modification

- Champs organisateur absents allowlist backend et désactivés UI.
- Acronyme, remarques, besoins modifiables.
- Chaque règle [`routing-rules.json`](power-automate/routing-rules.json) isolée.
- Date + salle + IT combinés : équipes dédupliquées.
- Validation Event jamais relancée.
- Approval non touchée garde scope/status.
- Approval touchée devient `Obsolète`; nouvelle rév./scope créés.
- Réponse ancienne Approval ignorée.
- Deux navigateurs même révision : premier 200, second 409 puis rechargement.
- Infra seule : ancienne Infra ouverte annulée/neutralisée, nouvelle Infra créée, autres inchangées.
- Date ou remarques : quatre tâches, quatre Approval IDs, quatre runs.
- Deux équipes touchées : deux `taskKey`, Approval IDs et runs distincts.
- Révision rapide : ancien run annulé ou réponse neutralisée par cinq clés.
- `CancelFlowRun` échoue : `cancel_failed`, email obsolescence, nouvelle tâche active.
- Réponses équipes simultanées : trois relectures complètes + écritures ETag séquentielles, aucune équipe écrasée.
- Un refus actuel : global `Refusé`; toutes réponses positives : `Validé`.
- Conflit révision HTTP 409 : zéro annulation et zéro tâche créée.
- Validation Event historique jamais recréée.
- Event → Jennifer; Infra → Lou + Oscar; Sécurité → Julien; Signalétique → Jennifer; IT → Dylan + Jean + Cédric.
- Infra/IT : une seule réponse termine carte équipe; commentaire, date et répondant réel synchronisés sous 15 secondes.
- Approval déjà ouverte avant déploiement garde destinataires et Approval ID; zéro annulation/recréation.

## Réservations

- Nouvelle disponibilité OK : créer nouvelle, écrire demande, retirer ancienne.
- Nouvelle indisponible : 409, ancienne intacte.
- Échec après réservation provisoire : compensation supprime provisoire, ancienne intacte.
- Correspondance calendrier backfill multiple : `Correspondance ambiguë`.

## Notifications/audit

- Email immédiat demandeur : avant/après + équipes relancées.
- Email final après toutes réponses valides.
- Ancien approver averti carte obsolète.
- Historique contient acteur `oid`, dates UTC, avant/après, motif, statut, équipes.

## Générateurs/migration

- `python3 verify_approval_flows.py` : mapping exact cinq équipes, cinq Approvals initiales séparées, parent sans Approval groupée, quatre routes tâches, enfant une Approval/run depuis `Assignee`, `approvalType=Basic`, résumé task-driven avec trois tentatives ETag.
- `python3 migrate_initial_approval_tasks.py --har <frais> --apply` : tâches initiales manquantes créées depuis IDs/réponses/destinataires exacts historique; deuxième exécution crée zéro ligne.
- `EventVS Approval Response Watcher` : tâche historique `Queued` utilise Approval ID existant, zéro `CreateAnApproval`, réponse écrite sous une minute puis visible sous 15 secondes.
- Watcher historique : clé non courante ignorée; Approval et statut historique restent inchangés.
- `npm run migration:plan -- export.json` : audit uniquement; ne pas appliquer au changement routage. Approvals ouvertes existantes restent inchangées.
- Cycle réel pilote : Outlook → Approval → liste tâches → demande → portail sous 15 secondes.

## Brouillon formulaire public

- Autosave même navigateur/appareil, expiration et suppression après 30 jours.
- Boutons Enregistrer/Reprendre/Supprimer.
- Reprise ne restaure jamais salles/espaces traiteur.
- Soumission échouée garde brouillon.
- Soumission réussie efface brouillon.

## Annulation et suppression

- Bouton visible seulement si backend renvoie `allowedActions: ['cancel']`; Jennifer et Dylan autorisés.
- Modal échappe titre/ID, motif facultatif, case obligatoire; double clic ne crée pas second job.
- Révision périmée → HTTP 409 et zéro job/annulation/réservation supprimée.
- Ressource ancienne sans ID Outlook exact → `CANCELLATION_BLOCKED`, demande intacte.
- Plusieurs runs ouverts → tous neutralisés puis annulés; réponse tardive ignorée.
- Trois réservations → trois IDs exacts supprimés; aucun match titre/date heuristique.
- Échec intermédiaire → `Blocked`, reprise ne rejoue pas étapes terminées, demande non recyclée.
- Succès → tâches, réservations, runtime links supprimés; demande dans corbeille 30 jours; tombstone minimal.
- Email organisateur + acteur dédupliqués; échec après trois essais → `CompletedWithWarning`.
- Cycle réel : portail → Power Automate → Approvals → Outlook → SharePoint → email → tableau de bord.

Recette du 23 juillet 2026 : demandes modernes 6 et 7 supprimées avec statut `Completed`, deux liens runtime supprimés chacune, email `sent`, item absent du portail. Demande 7 appelée trois fois avec même révision : trois réponses HTTP 202 et un seul job. Demande legacy 5 : HTTP 409 `CANCELLATION_BLOCKED`, révision 4 et statut `Refusé` conservés.
