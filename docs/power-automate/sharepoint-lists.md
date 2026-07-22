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

## EventVSApprovals

| Colonne | Type |
|---|---|
| `Title` | `EVS-ID · équipe · rév. N` |
| `DemandeId` | Recherche vers Demandes |
| `Equipe` | Choix Event/Infra/Sécurité/Signalétique/IT |
| `StatutEquipe` | Choix contrat |
| `Destinataire` | Personne/groupe |
| `ApprovalId` | Texte |
| `ScopeHash` | Texte 64 caractères |
| `RevisionEventVS` | Nombre entier |
| `DemandeeUtc`, `RepondueUtc` | Date/heure |
| `Reponse`, `Commentaire` | Texte multiligne |

Index unique logique : `DemandeId + Equipe + RevisionEventVS`. Une réponse compte seulement si `StatutEquipe = En attente`, révision courante égale et `ScopeHash` courant égal.

## EventVSHistory

`DemandeId`, `RevisionAvant`, `RevisionApres`, `ActeurOid`, `ActeurNom`, `ActeurEmail`, `ActionUtc`, `AvantJson`, `ApresJson`, `ChampsModifiesJson`, `EquipesRelancees`, `Motif`, `StatutAvant`, `StatutApres`.

Acteur autoritatif : claim `oid` du jeton validé, jamais `clientContext` envoyé par navigateur.

## EventVSReservations

`DemandeId`, `Ressource`, `TypeRessource`, `Calendrier`, `OutlookEventId`, `DebutUtc`, `FinUtc`, `RevisionEventVS`, `StatutReservation`, `RemplaceReservationId`.

Statuts : `À vérifier`, `Réservé`, `Remplacé`, `Échec`, `Correspondance ambiguë`.

## EventVSManagers

`Utilisateur` (Personne), `Actif` (Oui/non), `Role` (Gestionnaire/Lecture), `AjouteUtc`, `AjoutePar`.

Valeurs initiales : Jennifer Brady et Dylan Portmann. Toute modification exige aussi mise à jour manuelle/automatisée liste utilisateurs autorisés du déclencheur HTTP. Liste SharePoint ne remplace jamais sécurité Entra du trigger.
