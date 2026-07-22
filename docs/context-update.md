# Contexte de reprise

Dernière mise à jour : 22 juillet 2026.

Sources portail : `/Users/dportman/Desktop/Eventvs/EventVS-Portal`.

Tenant EPFL : `f6c2556a-c4fb-4ab1-a2c7-9e220df11c43`.

Production cible : `https://dylanportmann.github.io/EventVS-Portal/`.

Bloquants externes actuels :

- application Entra `EventVS Portal` pas encore créée; client ID absent;
- endpoint flow `EventVS Portal API` absent;
- utilisateurs/IDs Jennifer Brady et Dylan Portmann à confirmer dans trigger;
- support CORS preflight Power Automate à prouver ou APIM/proxy même origine à ajouter;
- colonnes/listes SharePoint de suivi à provisionner;
- formulaire public source modifié localement, redéploiement Power Automate requis.

Mode démo local : `npm run dev`, puis `?demo=1#/dashboard`. Démo impossible hors localhost par code.

Ne jamais stocker bearer, HAR, cookie, client secret ou connection reference sensible dans dépôt.
