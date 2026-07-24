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
| `Origin` | `Initial` ou `Revision`; flux enfant traite seulement `Revision` |
| `Status` | `Queued`, `Creating`, `Pending`, `Approuvé`, `Refusé`, `Obsolete`, `ResponseConflict` |
| `DeliveryStatus` | `queued`, `creating`, `delivered`, `responded`, `canceled`, `cancel_failed`, `obsolete`, `response_conflict` |
| `Assignee` | Liste exacte destinataires utilisée, emails séparés par `;`; immuable dans historique |
| `ApprovalId` | Texte |
| `FlowRunId`, `ChildFlowId` | IDs internes, jamais exposés API |
| `ScopeHash` | Texte 64 caractères |
| `Revision` | Nombre entier |
| `RequestedUtc`, `DeliveredUtc`, `RespondedUtc`, `ObsoletedUtc`, `CanceledUtc` | Date/heure |
| `RoutingComplete` | Oui/non; porté par tâche Event initiale après routage technique |
| `WatcherStatus` | `Native`, `Queued`, `Watching`, `Completed`, `Ignored` ou `Failed` |
| `WatcherRunId` | Run du watcher historique; jamais exposé API |
| `WatcherStartedUtc`, `WatcherCompletedUtc` | Dates surveillance historique |
| `Response`, `Comment`, `Responder`, `Error` | Audit réponse/erreur |
| `ReplacesTaskKey`, `SupersededByTaskKey` | Chaîne remplacement |
| `PayloadJson` | Titre, motif, acteur; JSON brut |

`Title` indexé avec `EnforceUniqueValues=true`; `RequestId` indexé pour lectures portail/synchronisation. Une réponse compte seulement si cinq corrélations `requestId + team + revision + taskKey + scopeHash` correspondent et tâche reste `Pending`. Watcher historique vérifie aussi clé courante stockée dans résumé demande.

Mapping équipe → destinataires vient de [`approval-recipients.json`](../../src/approval-recipients.json). `approvalType=Basic` donne sémantique première réponse pour groupes Infra/IT. API conserve séparateur `;`; interface affiche adresses avec virgules.

## EventVSHistory

`DemandeId`, `RevisionAvant`, `RevisionApres`, `ActeurOid`, `ActeurNom`, `ActeurEmail`, `ActionUtc`, `AvantJson`, `ApresJson`, `ChampsModifiesJson`, `EquipesRelancees`, `Motif`, `StatutAvant`, `StatutApres`.

Acteur autoritatif : claim `oid` du jeton validé, jamais `clientContext` envoyé par navigateur.

## EventVSReservations

`DemandeId`, `Ressource`, `TypeRessource`, `Calendrier`, `OutlookEventId`, `DebutUtc`, `FinUtc`, `RevisionEventVS`, `StatutReservation`, `RemplaceReservationId`.

Statuts : `À vérifier`, `Réservé`, `Remplacé`, `Échec`, `Correspondance ambiguë`.

Chaque création Outlook écrit immédiatement `Calendrier + OutlookEventId`. Marqueur `ReservationTracking|Complete` dans `EventVS Runtime Links` confirme inventaire exhaustif. Ancienne demande sans marqueur ni ID exact bloque suppression.

## `EventVS Deletion Jobs`

`Title` et `RequestId` identifient demande. Colonnes : `RequestItemId`, `ExpectedRevision`, `Status`, `ActorEmail`, `Reason`, `RequestTitle`, `OrganizerEmail`, dates, `StepStateJson`, `ErrorJson`, `DeletedCountsJson`, `EmailStatus`, `Attempt`.

Statuts : `Prepared`, `Queued`, `Running`, `Blocked`, `Completed`, `CompletedWithWarning`. Après succès, vider titre événement, organisateur, motif, IDs externes et payloads; conserver seulement ID demande, acteur, dates, résultat et compteurs.

## `EventVS Runtime Links`

`RequestId`, `RequestItemId`, `Kind`, `FlowId`, `RunId`, `Status`, dates et erreur. Types initiaux : `InitialOrchestration` et `ReservationTracking`. Supprimer liens après annulation réussie.

## EventVSManagers

`Utilisateur` (Personne), `Actif` (Oui/non), `Role` (Gestionnaire/Lecture), `AjouteUtc`, `AjoutePar`.

Valeurs initiales : Jennifer Brady et Dylan Portmann. Toute modification exige aussi mise à jour manuelle/automatisée liste utilisateurs autorisés du déclencheur HTTP. Liste SharePoint ne remplace jamais sécurité Entra du trigger.
