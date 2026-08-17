# Guide de soutenance — Matchia SaaS

Ce document accompagne le fichier PowerPoint `Matchia_Soutenance_PFE.pptx` (**26 slides**). Le texte complet à dire et les transitions sont intégrés dans les **notes du présentateur** de chaque slide. La version enrichie utilise la page de garde fournie, le logo BRI Technology, l’identité Matchia et plusieurs captures authentifiées du back-office SaaS.

## Fil narratif

Une marketplace bancaire développée séparément pour chaque établissement exige des échanges, du paramétrage et des interventions techniques répétées. Matchia répond à cette limite par une plateforme SaaS : un socle commun, des espaces séparés par banque et des parcours configurables pour les administrateurs, partenaires et clients finaux.

## Analyse factuelle du dépôt

| Élément | Statut | Éléments vérifiés |
|---|---|---|
| SaaS multi-tenant | Confirmé | Sous-domaine bancaire, en-tête `X-Bank-Slug`, services et contrôles de contexte bancaire. |
| Rôles | Confirmé | `ADMIN_SAAS`, `ADMIN_BANK`, `DEALER_ADMIN`, `CLIENT`. |
| Gestion SaaS | Confirmé | Banques, marketplaces, stores, modules, demandes, abonnements, utilisateurs, audits, certificats. |
| Marketplace bancaire | Confirmé | Branding, contenus, stores, modules, produits et paramètres. |
| Onboarding et provisioning | Confirmé | Demande, vérification e-mail, approbation, paiement et création de l’environnement bancaire. |
| Paiement | Confirmé | Intégration Stripe : intentions de paiement, checkout, confirmation et renouvellement. |
| Partenaires / concessionnaires | Confirmé | Partenariats, contrats, produits et demande de publication. |
| Simulateur / comparateur | Confirmé | Estimation basée sur des paramètres de module ; comparaison jusqu’à quatre produits. |
| Assistant IA | Confirmé dans le code, exécution non vérifiée | Accès administrateur SaaS, garde-fous sur requêtes `SELECT` et lecture seule. |
| Docker | Confirmé | Dockerfiles frontend/backend et Docker Compose. |
| SonarQube | Partiel | Configuration frontend présente ; exécution non vérifiée. |
| Jenkins / CI/CD | Non trouvé | Aucun pipeline Jenkins dans le dépôt. |
| Déploiement cloud | Non trouvé | Aucune configuration cloud vérifiable dans le dépôt. |
| Tests frontend | Vérifié | `npm run typecheck` terminé avec succès. |
| Tests backend | Non exécutés | Tests unitaires présents, mais le wrapper Maven est indisponible dans l’environnement d’analyse. |

## Déroulé et minutage conseillé

| Slides | Séquence | Temps |
|---|---|---:|
| 1–4 | Page de garde, introduction et entreprise d’accueil | 1 min 45 s |
| 5–9 | Contexte, existant, problématique, solution, objectifs | 4 min 10 s |
| 10–14 | Acteurs, architecture, multi-tenancy, données, technologies | 4 min 15 s |
| 15–20 | Onboarding et captures du back-office SaaS | 5 min 10 s |
| 21–23 | Sécurité, IA, qualité et DevOps | 1 min 35 s |
| 24–26 | Démonstration, bilan et conclusion | 1 min 45 s |
| **Total** | **Soutenance** | **environ 18 min 30 s** |

### Captures intégrées

- Page de garde : image fournie par l’étudiante.
- Formulaire réel « Rejoindre Matchia », avec les quatre étapes d’onboarding.
- Tableau de bord SaaS réel : banques actives, demandes, utilisateurs, stores et graphiques.
- Gestion réelle des banques : statuts, stores assignés et accès back-office.
- Gestion réelle des demandes : compteurs, statuts, configuration et montants.
- Gestion réelle des stores et modules : catalogue, prix et configuration.
- Page d’accueil publique réelle de Matchia.

Les captures du back-office SaaS ont été prises sur un environnement local avec les données disponibles dans l’application. Les écrans bancaires authentifiés n’ont pas été fabriqués ; ils doivent être capturés en complément si un compte bancaire de démonstration est disponible.

## Démonstration recommandée (2 à 3 minutes)

1. Ouvrir la page publique et présenter l’objectif d’une marketplace bancaire.
2. Montrer le formulaire « Rejoindre Matchia » et ses quatre étapes.
3. Expliquer le traitement côté SaaS : validation de la demande, paiement puis provisioning.
4. Présenter le résultat attendu : une banque disposant de son espace de configuration et d’une marketplace publique dédiée.

## Questions probables du jury et réponses courtes

1. **Pourquoi une architecture SaaS ?**  
   Elle mutualise le socle technique tout en permettant à chaque banque de configurer son environnement et d’accélérer son lancement.

2. **Comment les banques sont-elles séparées ?**  
   Le tenant est identifié par le sous-domaine et transmis par `X-Bank-Slug` ; les accès sont ensuite filtrés par le contexte bancaire et les rôles.

3. **Est-ce une base de données par banque ?**  
   Non. Le dépôt met en œuvre une séparation logique dans une base mutualisée. Une isolation par schéma ou par base serait une évolution possible selon les exigences réglementaires.

4. **Pourquoi React et TypeScript ?**  
   React structure l’interface en composants et TypeScript réduit les erreurs grâce au typage ; la vérification de types a été exécutée avec succès.

5. **Pourquoi Spring Boot ?**  
   Il apporte un cadre mature pour l’API REST, la sécurité, les règles métier, JPA et les intégrations externes.

6. **Comment l’authentification est-elle assurée ?**  
   Par JWT, avec un mécanisme de renouvellement de jeton et des autorisations fondées sur les rôles.

7. **Quel est le rôle de Stripe ?**  
   Stripe gère l’initiation et la confirmation des paiements ; une confirmation déclenche le provisioning de l’environnement bancaire.

8. **Le simulateur accorde-t-il réellement un crédit ?**  
   Non. Il fournit une estimation fondée sur les paramètres configurés. La décision de crédit reste un processus bancaire distinct.

9. **Quelle est la valeur du comparateur ?**  
   Il permet à un client de comparer jusqu’à quatre produits selon leurs caractéristiques, pour faciliter la compréhension de l’offre.

10. **Comment sont gérés les concessionnaires ?**  
    Le flux comprend partenariat, contrat, produits et soumission à publication, avec validation côté banque.

11. **Pourquoi ajouter un assistant IA ?**  
    Pour assister le pilotage SaaS sur les données. Son périmètre est restreint : requêtes en lecture seule, validation et filtrage des données sensibles.

12. **Quels sont les contrôles de sécurité principaux ?**  
    JWT, autorisations par rôle, contrôle du tenant, audit, validation des données et restrictions de l’assistant IA.

13. **Que faut-il renforcer avant une mise en production ?**  
    Externaliser les secrets, renforcer les tests automatisés, gérer les migrations, ajouter l’observabilité et une CI/CD.

14. **Docker est-il utilisé ?**  
    Oui, le frontend et le backend disposent de Dockerfiles et sont orchestrés par Docker Compose. La base PostgreSQL reste externe dans la configuration analysée.

15. **Y a-t-il un pipeline Jenkins ?**  
    Aucun pipeline Jenkins n’a été trouvé dans le dépôt ; il s’agit d’une perspective, pas d’un élément réalisé.

16. **SonarQube est-il opérationnel ?**  
    Une configuration frontend est présente, mais son exécution dans une chaîne CI n’a pas été vérifiée.

17. **Comment la qualité a-t-elle été vérifiée ?**  
    La vérification TypeScript du frontend a réussi. Des tests backend existent, mais ils n’ont pas pu être lancés dans cet environnement faute de wrapper Maven fonctionnel.

18. **Quels sont les risques du multi-tenant logique ?**  
    Une erreur de filtrage peut exposer des données d’un autre tenant. Les contrôles de contexte doivent donc être systématiques, testés et audités.

19. **Comment faire évoluer la plateforme ?**  
    En ajoutant des modules et stores réutilisables, en industrialisant les déploiements et, si nécessaire, en renforçant le modèle d’isolation des données.

20. **Quelle est la contribution principale du projet ?**  
    Transformer un processus de création spécifique à chaque banque en un parcours configurable, traçable et réutilisable sur une plateforme commune.

## À compléter avant l’oral

- Informations institutionnelles officielles de BRI : activité, pays, effectif, services et encadrement.
- Nom de l’étudiant, encadrants, établissement et année universitaire sur la slide de couverture.
- Une capture authentifiée SaaS/bancaire, uniquement si un environnement de démonstration complet est disponible.
