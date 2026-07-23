# Sauvegarde et rollback production

Avant pilote :

1. Exporter listes SharePoint complètes avec pièces jointes et schémas.
2. Exporter packages ZIP flux existant, `PageReservation`, flux aval et nouvelle API.
3. Exporter définitions JSON relues depuis Power Platform.
4. Exporter correspondance réservations/calendriers.
5. Taguer commit frontend déployé : `pilot-YYYY-MM-DD`.
6. Stocker archives hors dépôt Git; aucun bearer/HAR/cookie.

Rollback :

1. Désactiver `EventVS Team Approval`, puis `EventVS Portal API` ou retirer allowed users.
2. Restaurer GitHub Pages vers tag précédent.
3. Réactiver ancien flux aval exporté si modification instrumentée cause incident.
4. Ne pas supprimer `EventVS Approval Tasks`. La passer lecture seule pour préserver audit.
5. Restaurer réservations seulement depuis table de correspondance; ne jamais supprimer événement Outlook ambigu.
6. Contrôler demandes créées pendant fenêtre et traiter manuellement.

Runs enfant déjà annulés ne sont pas restaurables. Anciennes Approvals terminées restent historiques. Anciennes Approvals groupées actives exigent annulation manuelle depuis onglet Envoyées.

Frontend rollback ne modifie pas SharePoint. Flow rollback doit préserver révisions/historique déjà écrits.
