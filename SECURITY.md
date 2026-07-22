# Sécurité

Signaler vulnérabilité directement à équipe Event VS. Ne pas ouvrir issue publique avec données personnelles, token, HAR, OTP, session portail ou export de connexion.

URL trigger pilote est publique car GitHub Pages ne peut garder secret. Elle ne constitue pas contrôle d'accès. Backend autorise seulement emails Jennifer/Dylan, vérifie OTP, puis exige session aléatoire expirant après 8 h avant toute lecture SharePoint. Liste sessions est masquée avec lecture/écriture limitée aux éléments propres; connexion flow reste propriétaire. Secure Inputs masque requêtes sensibles dans historique Power Automate.

Risque résiduel : endpoint public peut consommer quota Power Automate. Migration recommandée : trigger Entra `Specific users in my tenant` dès consentement Flow disponible, ou proxy Kubernetes/APIM validant jeton Entra.

Mode démo limité à `localhost`/`127.0.0.1`. Données démo fictives.
