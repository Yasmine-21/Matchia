# Tables de la base Matchia et leurs rôles

L'application mappe **42 tables métier**. La table technique `flyway_schema_history`, créée par Flyway, porte normalement le total à **43 tables**.

> `certificate` n'est pas une table : c'est un type de document de financement.

| Table | Rôle |
|---|---|
| `audit_logs` | Historique des actions réalisées dans l'application. |
| `bank` | Informations et configuration des banques. |
| `client_registration_verifications` | Codes e-mail temporaires lors de la création d'un compte client. |
| `content` | Contenu global lié à un store, créé côté SaaS. |
| `content_visibility` | Visibilité d'un contenu global dans chaque nnmarketplace. |
| `dealer` | Profil et informations du concessionnaire. |
| `dealer_account_request` | Demandes de création de comptes concessionnaires. |
| `dealer_bank_partnership` | Partenariats entre banques et concessionnaires. |
| `dealer_product` | Produits ajoutés par les concessionnaires. |
| `dealer_product_catalog_image` | Galerie d'images des produits concessionnaires. |
| `dealer_product_document` | Documents associés aux produits concessionnaires. |
| `dealer_product_parameter_value` | Valeurs des caractéristiques des produits concessionnaires. |
| `dealer_request_document` | Pièces jointes d'une demande de compte concessionnaire. |
| `financing_request` | Demandes de financement envoyées par les clients. |
| `financing_request_document` | Documents déposés pour une demande de financement. |
| `join_email_verifications` | Vérification e-mail lors de l'inscription d'une banque ou marketplace. |
| `marketplace` | Configuration et identité visuelle de chaque marketplace. |
| `marketplace_content` | Contenu propre à une marketplace. |
| `marketplace_store` | Stores affectés à une marketplace. |
| `marketplace_store_banner` | Images multiples des bannières par store et marketplace. |
| `marketplace_store_module` | Modules réellement activés et visibles pour un store d'une marketplace. |
| `module` | Catalogue global des modules. |
| `module_store` | Modules compatibles avec un store, avec prix et statut. |
| `module_store_parameter` | Paramètres configurables d'un module pour un store. |
| `notifications` | Notifications SaaS, banque, client et concessionnaire. |
| `password_reset_tokens` | Jetons temporaires de réinitialisation des mots de passe. |
| `partnership_contract` | Contrats PDF des partenariats banque–concessionnaire. |
| `payment` | Paiements initiaux et de renouvellement. |
| `product` | Ancien catalogue de produits créés par une banque. |
| `product_parameter_definition` | Définitions des caractéristiques d'un produit par store ; également utilisées par les produits concessionnaires. |
| `product_parameter_value` | Valeurs des caractéristiques des anciens produits banque. |
| `product_publication_request` | Demande de publication d'un produit concessionnaire. |
| `refresh_tokens` | Sessions sécurisées des utilisateurs. |
| `request` | Demandes d'inscription, de store, module, abonnement ou renouvellement. |
| `request_module` | Modules sélectionnés dans une demande. |
| `request_module_selection` | Détails et prix des modules sélectionnés par store dans une demande. |
| `request_store` | Stores sélectionnés dans une demande. |
| `request_store_selection` | Détails et prix des stores sélectionnés dans une demande. |
| `required_financing_document` | Documents exigés selon la banque et le store pour un financement. |
| `store` | Catalogue global des stores : mobile, véhicule, médical, etc. |
| `subscription` | Cycle de vie des abonnements annuels. |
| `users` | Comptes SaaS, banques, clients et concessionnaires. |
| `flyway_schema_history` | Historique technique des migrations SQL Flyway. |

## Tables anciennes candidates à vérification

Ces tables sont obsolètes uniquement si elles existent encore dans la base et si leurs données ont été migrées :

| Ancienne table | Remplacée par |
|---|---|
| `bank_store` | `marketplace_store` |
| `bank_store_module` | `marketplace_store_module` |
| `bank_branding` | Données réparties entre `marketplace` et `marketplace_store` |

## Ancien catalogue produits banque

Si la décision métier est que les produits sont créés uniquement par les concessionnaires, `product` et `product_parameter_value` pourront être retirées **après** retrait du flux backend historique. La table `product_parameter_definition` doit être conservée, car elle sert également aux produits concessionnaires.
