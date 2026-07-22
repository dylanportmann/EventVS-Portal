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
- Détail : 5 équipes, commentaires, réservations, chronologie, historique.
- Import historique incomplet → `Historique non disponible`, jamais données inventées.

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

## Brouillon formulaire public

- Autosave même navigateur/appareil.
- Boutons Enregistrer/Reprendre/Supprimer.
- Reprise ne restaure jamais salles/espaces traiteur.
- Soumission échouée garde brouillon.
- Soumission réussie efface brouillon.
