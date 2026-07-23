# Modèle SharePoint Event VS

Site cible : `VPO-DC-Test-Workflow-EPFLValais`. Conserver liste actuelle des demandes; ajouter colonnes ci-dessous. Noms internes ASCII recommandés.

## Demandes

| Colonne | Type | Règle |
|---|---|---|
| `RevisionEventVS` | Nombre entier, défaut `1` | Concurrence optimiste; incrément atomique par modification |
| `StatutGlobal` | Choix | Valeurs contrat frontend |
| `EtapeActuelle` | Texte | Étape ou `Historique non disponible` |
| `PersonnesEnAttente` | Texte multiligne | Emails/noms séparés par `;` |
| `DerniereActionUtc` | Date/heure UTC | Chaque début/fin d'étape |
| `OrganisateurNomInitial` | Texte | Immuable après création |
| `OrganisateurEmailInitial` | Texte | Immuable après création |
| `OrganisateurTelephoneInitial` | Texte | Immuable après création |
| `DonneesCompletes` | Texte multiligne brut | JSON courant, jamais HTML |
| `ImportHistorique` | Oui/non | Vrai pour backfill |

Activer index SharePoint sur `StatutGlobal`, `DateEvent`, `DerniereActionUtc`, `RevisionEventVS`. Ne jamais filtrer plus de 5 000 lignes sans index/pagination.

## `EventVS Approval Tasks`

| Colonne | Type |
|---|---|
| `Title` | Clé unique `requestId\|team\|revision` |
| `RequestId` | ID demande texte |
| `RequestItemId` | ID item Demandes numérique |
| `Team` | Event/Infra/Sécurité/Signalétique/IT |
| `Status` | `Queued`, `Creating`, `Pending`, `Approuvé`, `Refusé`, `Obsolete`, `ResponseConflict` |
| `DeliveryStatus` | `queued`, `creating`, `delivered`, `responded`, `canceled`, `cancel_failed`, `obsolete`, `response_conflict` |
| `Assignee` | Email; pilote `dylan.portmann@epfl.ch` |
| `ApprovalId` | Texte |
| `FlowRunId`, `ChildFlowId` | IDs internes, jamais exposés API |
| `ScopeHash` | Texte 64 caractères |
| `Revision` | Nombre entier |
| `RequestedUtc`, `RespondedUtc`, `ObsoletedUtc`, `CanceledUtc` | Date/heure |
| `Response`, `Comment`, `Responder`, `Error` | Audit réponse/erreur |
| `ReplacesTaskKey`, `SupersededByTaskKey` | Chaîne remplacement |
| `PayloadJson` | Titre, motif, acteur; JSON brut |

`Title` indexé avec `EnforceUniqueValues=true`. Une réponse compte seulement si cinq corrélations `requestId + team + revision + taskKey + scopeHash` correspondent et tâche reste `Pending`.

## EventVSHistory

`DemandeId`, `RevisionAvant`, `RevisionApres`, `ActeurOid`, `ActeurNom`, `ActeurEmail`, `ActionUtc`, `AvantJson`, `ApresJson`, `ChampsModifiesJson`, `EquipesRelancees`, `Motif`, `StatutAvant`, `StatutApres`.

Acteur autoritatif : claim `oid` du jeton validé, jamais `clientContext` envoyé par navigateur.

## EventVSReservations

`DemandeId`, `Ressource`, `TypeRessource`, `Calendrier`, `OutlookEventId`, `DebutUtc`, `FinUtc`, `RevisionEventVS`, `StatutReservation`, `RemplaceReservationId`.

Statuts : `À vérifier`, `Réservé`, `Remplacé`, `Échec`, `Correspondance ambiguë`.

## EventVSManagers

`Utilisateur` (Personne), `Actif` (Oui/non), `Role` (Gestionnaire/Lecture), `AjouteUtc`, `AjoutePar`.

Valeurs initiales : Jennifer Brady et Dylan Portmann. Toute modification exige aussi mise à jour manuelle/automatisée liste utilisateurs autorisés du déclencheur HTTP. Liste SharePoint ne remplace jamais sécurité Entra du trigger.
