# Flux `EventVS Portal API`

## Déclencheur et sécurité

### Pilote déployé — contrainte EPFL

Flux séparé `EventVS Portal API`, ID `eb6857a7-3a07-4163-bcd9-6a6bb30baa5a` :

1. Trigger HTTP `All`; URL nécessairement publique dans SPA.
2. `startSession` accepte seulement `dylan.portmann@epfl.ch` et `jennifer.brady@epfl.ch`.
3. Code 6 chiffres envoyé depuis `event-vs@epfl.ch`, valide 10 minutes; renvoi limité à une fois/minute.
4. Sessions aléatoires 72 caractères, valides 8 h, stockées liste SharePoint masquée `EventVS Portal Sessions`; `ReadSecurity=2` et `WriteSecurity=2` empêchent membres site de lire/modifier éléments créés par connexion flow.
5. `listRequests`/`getRequest` vérifient session avant lecture liste métier.
6. Requêtes navigateur utilisent `text/plain` pour éviter preflight Authorization; aucun cookie.
7. Entrées sensibles du trigger/actions marquées Secure Inputs.
8. `updateRequest` actif avec `expectedRevision`, lock ETag et tâches Approval séparées.

Licence constatée : `Flow for Office 365`, `accessPremiumApis=false`. Action HTTP Premium ne peut donc pas appeler Graph `/me` pour valider jeton utilisateur. Test consentement Flow renvoie `AADSTS65001`.

Risque résiduel : gateway renvoie `Access-Control-Allow-Origin: *`; OTP/session protège données, mais quota trigger reste exposé. Architecture cible ci-dessous reste recommandée.

### Cible dès autorisation EPFL

1. Créer `When an HTTP request is received` avec schéma [`api-contract.json`](../schemas/api-contract.json).
2. Authentication : `Specific users in my tenant`.
3. Allowed users : comptes confirmés Jennifer Brady et Dylan Portmann. Ne pas laisser champ vide : vide autorise tout tenant.
4. Audience attendue cloud public : `https://service.flow.microsoft.com/`.
5. Secure Inputs + Secure Outputs sur déclencheur et actions contenant données personnelles.
6. Refuser origine autre que `https://dylanportmann.github.io` et origines localhost de test.
7. Ne jamais faire confiance à `clientContext`. Extraire `oid`, `tid`, nom/email depuis jeton/trigger authentifié.

### Gate CORS cible

App navigateur envoie `Authorization`, donc navigateur exécute requête `OPTIONS` avant `POST`. Déploiement GitHub Pages interdit tant que test réel ne confirme réponse preflight avec :

```http
Access-Control-Allow-Origin: https://dylanportmann.github.io
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: authorization, content-type
Vary: Origin
```

Power Automate documente authentification OAuth du trigger, mais pas politique CORS/preflight granulaire. Si endpoint ne traite pas `OPTIONS`, placer Azure API Management devant flux avec politique CORS + validation Entra, ou attendre proxy Kubernetes même origine. Ajouter en-têtes seulement réponse `POST` ne suffit pas.

## Switch API

Valider `action`; valeur inconnue → HTTP 400. Chaque branche termine par action Response JSON uniforme :

```json
{"ok":true,"data":{}}
```

Erreur :

```json
{"ok":false,"error":{"code":"REVISION_CONFLICT","message":"Demande modifiée.","details":{}}}
```

## `listRequests`

- Borner `pageSize` à 100.
- Filtrer côté SharePoint avec colonnes indexées; échapper apostrophes OData.
- Recherche texte large : récupérer page candidate indexée, puis filtrer titre/référence/organisateur; retourner pagination stable par `DerniereActionUtc desc, ID desc`.
- Réponse : `items`, `page`, `pageSize`, `total`, `counts` (`total`, `active`, `waiting`, `late`).
- Item liste ne contient ni commentaires, ni téléphones, ni données JSON complètes.

## `getRequest`

Lire demande + quatre listes liées en parallèle. Retourner :

- demande normalisée;
- cinq validations, dont `Non requis`;
- chronologie étapes;
- historique modifications;
- réservations;
- `allowedActions`, calculé côté flux depuis gestionnaire actif.

Demande importée sans traces : `EtapeActuelle = Historique non disponible`, tableaux vides. Ne pas inventer approvers/dates.

## `updateRequest` et flux enfant

Trois composants :

1. `EventVS Portal API` modifie demande et enfile tâches.
2. Liste `EventVS Approval Tasks` porte état/audit de chaque équipe.
3. `EventVS Team Approval`, déclenché sur création item, crée exactement une Approval puis attend réponse dans run isolé.

Ordre transactionnel :

1. Charger demande et vérifier révision; sinon HTTP 409 avant toute écriture.
2. Refuser toute clé hors allowlist. Refuser champs organisateur initiaux/courants.
3. Calculer objet avant/après, champs modifiés, équipes touchées et scope hashes.
4. Si ressources/créneau changent : vérifier nouvelles ressources, créer nouvelles réservations provisoires. Échec → supprimer provisoires créées pendant tentative, répondre 409 `RESOURCE_UNAVAILABLE`; garder anciennes réservations.
5. Écrire historique complet révision N→N+1.
6. Écrire demande avec ETag et révision N+1. Échec ETag → HTTP 409; aucune tâche touchée.
7. Pour chaque équipe touchée, marquer ancienne tâche ouverte `Obsolete`; validation terminée reste historique inchangé.
8. Tenter `CancelFlowRun` sur run enfant. Échec → `cancel_failed`, email obsolescence; garde réponse neutralise ancienne carte.
9. Créer item `Queued` unique `requestId|team|revision`; trigger enfant crée nouvelle Approval assignée à `dylan.portmann@epfl.ch`.
10. Confirmer nouvelles réservations, puis supprimer/annuler anciennes et marquer `Remplacé`.
11. Envoyer email demandeur immédiat : différences + équipes relancées.
12. Répondre détail actualisé avec `approvalChanges.created`, `canceled`, `kept`, `errors`. API ne bloque jamais en attente réponse Approval.

Validation Event initiale ne repart jamais après modification. `title` relance Signalétique uniquement si écrans actifs. `remarks` relance toutes équipes techniques actuellement requises.

## Garde réponse Approval

Flux enfant stocke `ApprovalId`, `FlowRunId`, `ChildFlowId`, `taskKey`, révision et scope. Avant application réponse :

```text
task.Status == "Pending"
AND task.requestId == demande.Id
AND task.team == validation.team
AND task.revision == demande.revision
AND task.taskKey == demande.approvalState[team].taskKey
AND task.scopeHash == demande.approvalState[team].scopeHash
```

Sinon : tâche `Obsolete`, journal `Réponse tardive ignorée`, demande inchangée. Mise à jour demande utilise ETag et maximum trois essais; conflit final devient `response_conflict` pour traitement manuel.

## Résultat final

Après chaque réponse valide, recalculer :

- au moins une équipe actuelle refusée → `Refusé`;
- au moins une équipe actuelle en attente → `Modification en cours`;
- toutes équipes actuelles requises approuvées/reportées → `Validé`.

Validation Event initiale reste dans `approvalState.Event`; révision technique ne la recrée jamais.

## Génération et préflight

```bash
python3 build_approval_tasks_provisioner.py
python3 build_team_approval.py --task-list-id <GUID_LISTE>
EVENTVS_TEAM_APPROVAL_FLOW_ID=<GUID_FLUX> \
EVENTVS_FLOW_MANAGEMENT_CONNECTION=<CONNEXION> \
  python3 build_portal_api.py
python3 verify_approval_flows.py --deployment
```

`Power Automate Management` est connecteur Standard. `CancelFlowRun` prend environnement, flow ID et run ID. Annulation reste best-effort; corrélation SharePoint reste garantie autoritative.

Déploiement intégré auto-détecte unique connexion `Power Automate Management` connectée avant toute mutation :

```bash
python3 ../deploy_approval_revision.py --har <HAR_FRAIS>
python3 ../deploy_approval_revision.py --har <HAR_FRAIS> --apply
```

Si plusieurs connexions existent, préciser `--flow-management-connection <NOM>`.

## Backfill

Exporter listes + calendriers avant import. Pour chaque ancienne demande :

- conserver ID source et statut global;
- `ImportHistorique = Oui`;
- absence trace → `Historique non disponible`;
- match calendrier seulement si ressource + sujet + créneau concordent;
- plusieurs matches → réservation `Correspondance ambiguë`, jamais choix automatique.
