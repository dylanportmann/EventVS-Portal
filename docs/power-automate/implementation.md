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
8. `updateRequest` désactivé (`501 UPDATE_NOT_READY`) jusqu'au suivi historique/révisions.

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

## `updateRequest`

Ordre transactionnel :

1. Charger demande et vérifier `RevisionEventVS == expectedRevision`; sinon HTTP 409 avant toute écriture.
2. Refuser toute clé hors allowlist. Refuser champs organisateur initiaux/courants.
3. Calculer objet avant/après, champs modifiés, équipes touchées et scope hashes.
4. Si ressources/créneau changent : vérifier nouvelles ressources, créer nouvelles réservations provisoires. Échec → supprimer provisoires créées pendant tentative, répondre 409 `RESOURCE_UNAVAILABLE`; garder anciennes réservations.
5. Écrire historique complet révision N→N+1.
6. Mettre à jour demande et `RevisionEventVS = N+1`.
7. Marquer approvals touchées `Obsolète`; garder autres `En attente`, `Approuvé` ou convertir `Approuvé reporté` selon logique métier.
8. Envoyer email ancien approver : carte rév. N ne doit plus être traitée.
9. Créer nouvelles Approvals avec `ScopeHash`, révision N+1 et destinataire.
10. Confirmer nouvelles réservations, puis supprimer/annuler anciennes et marquer `Remplacé`.
11. Envoyer email demandeur immédiat : différences + équipes relancées.
12. Répondre détail actualisé.

Validation Event initiale ne repart jamais après modification. `title` relance Signalétique uniquement si écrans actifs. `remarks` relance toutes équipes techniques actuellement requises.

## Garde réponse Approval

Avant application réponse :

```text
approval.StatutEquipe == "En attente"
AND approval.RevisionEventVS == demande.RevisionEventVS
AND approval.ScopeHash == hashScopeCourant(demande, approval.Equipe)
```

Sinon : journaliser `Réponse tardive ignorée`, conserver demande, terminer branche. Ancienne carte Microsoft Approvals peut rester visible.

## Résultat final

Après chaque réponse valide, recalculer :

- tout requis approuvé/reporté → `Validé`, email final demandeur;
- au moins un requis refusé → `Refusé`, email final demandeur;
- sinon → `Étude technique`, `PersonnesEnAttente` mis à jour.

## Backfill

Exporter listes + calendriers avant import. Pour chaque ancienne demande :

- conserver ID source et statut global;
- `ImportHistorique = Oui`;
- absence trace → `Historique non disponible`;
- match calendrier seulement si ressource + sujet + créneau concordent;
- plusieurs matches → réservation `Correspondance ambiguë`, jamais choix automatique.
