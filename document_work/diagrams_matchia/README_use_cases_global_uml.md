# Diagramme de cas d'utilisation global — Matchia

`use_cases_global_uml.svg` est la version vectorielle à insérer dans le rapport. `use_cases_global_uml.png` est sa version raster, prête à être insérée dans Word.

La lecture est organisée par domaines : accès public et identité, espace client, pilotage SaaS, back-office banque, puis espace concessionnaire. Chaque acteur humain est relié à ses objectifs métier. Toute fonctionnalité privée est reliée à **S'authentifier** par `« include »`. Les systèmes Stripe, Gemini et SMTP sont explicitement distingués par le stéréotype `« système externe »` et une apparence grisée.

Notation utilisée :

- acteur hors de la frontière du système ;
- ellipse pour un cas d'utilisation ;
- ligne pleine pour une association ;
- flèche pointillée `<<include>>` pour une sous-fonction obligatoire.

Légende à utiliser dans le mémoire : **Figure X — Diagramme de cas d'utilisation global de la plateforme Matchia.**
