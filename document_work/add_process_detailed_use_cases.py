from pathlib import Path
from docx import Document
import sys

ROOT = Path(r"D:\PFE M2\Platforme SaaS")
sys.path.insert(0, str(ROOT / "document_work"))
import add_all_detailed_use_cases as uml

SOURCE = ROOT / "document_work" / "Rapport_PFE_Complet_Matchia_UseCases_Complets.docx"
OUT = ROOT / "document_work" / "Rapport_PFE_Complet_Matchia_Processus_UseCases_Complets.docx"
DIAG = ROOT / "document_work" / "process_detailed_use_cases_uml"
DIAG.mkdir(parents=True, exist_ok=True)

def make_diagram(filename, title, left, right, uses):
    original = uml.DIAG
    uml.DIAG = DIAG
    try:
        uml.usecase_diagram(filename, title, left, right, uses)
    finally:
        uml.DIAG = original

def spec(number, short, left, right, uses, primary, secondary, objective, pre, post, nominal, alternatives, exceptions):
    return {
        'file': f'uc_process_{number:02d}.png',
        'caption': f'Figure 3.{number + 4} — Diagramme de cas d’utilisation détaillé : {short}.',
        'title': f'Processus : {short}', 'left': left, 'right': right, 'uses': uses,
        'name': f'UC-{number:02d} — {short}', 'primary': primary, 'secondary': secondary,
        'objective': objective, 'pre': pre, 'post': post, 'nominal': nominal,
        'alternatives': alternatives, 'exceptions': exceptions
    }

def main():
    specs = [
        spec(1, 'demande de création d’une marketplace bancaire', ['Représentant Banque'], ['SMTP'],
             ['Accéder au formulaire d’adhésion', 'Saisir informations banque', 'Saisir administrateur banque', 'Vérifier adresse e-mail', 'Sélectionner stores', 'Sélectionner modules', 'Soumettre la demande'],
             'Représentant de la banque', 'SMTP', 'Déposer une demande de marketplace complète.',
             'Formulaire public disponible ; adresse e-mail non utilisée.', 'Demande au statut pending avec ses sélections enregistrées.',
             'Le représentant accède au formulaire, renseigne les informations de la banque et de son administrateur, vérifie son e-mail par code, choisit les stores et modules, contrôle le récapitulatif puis soumet.',
             'Le représentant retourne à une étape précédente pour corriger une information ou modifie sa sélection avant la soumission.',
             'E-mail déjà utilisé, code invalide ou expiré, données obligatoires manquantes, erreur de téléversement du logo.'),
        spec(2, 'traitement SaaS, paiement et activation', ['Administrateur SaaS'], ['Stripe', 'SMTP'],
             ['Consulter demande pending', 'Analyser stores et modules', 'Approuver ou rejeter', 'Générer lien de paiement', 'Confirmer paiement', 'Activer banque et marketplace', 'Envoyer identifiants'],
             'Administrateur SaaS', 'Stripe et SMTP', 'Transformer une demande validée et payée en tenant actif.',
             'Demande banque complète au statut pending.', 'Banque, marketplace, abonnement et administrateur Banque actifs uniquement après confirmation de paiement.',
             'Le SaaS consulte le dossier, approuve la demande, crée l’opération de paiement et notifie le contact. Stripe confirme le règlement ; le backend met à jour l’état, active les ressources et envoie les identifiants.',
             'Le SaaS rejette la demande avec un motif ; le paiement est annulé et l’activation reste en attente.',
             'Paiement refusé ou non confirmé, ressource introuvable, indisponibilité Stripe ou SMTP.'),
        spec(3, 'configuration de la marketplace, des stores et modules', ['Administrateur Banque'], [],
             ['Consulter marketplace active', 'Configurer branding et contenu', 'Consulter stores souscrits', 'Configurer bannière de store', 'Activer paramètres autorisés', 'Configurer simulateur ou comparateur', 'Publier la configuration'],
             'Administrateur Banque', '—', 'Personnaliser l’expérience publique dans le périmètre de la banque.',
             'Marketplace active et abonnement valide ; utilisateur ADMIN_BANK authentifié.', 'Configuration persistée et appliquée seulement au tenant concerné.',
             'L’administrateur ouvre son back-office, modifie le branding et le contenu, consulte les stores souscrits, paramètre les modules autorisés et enregistre les changements.',
             'Un module non souscrit reste en lecture seule ou indisponible ; l’administrateur peut annuler une modification avant l’enregistrement.',
             'Tenant inactif, module non autorisé, fichier image invalide ou tentative d’accès à la configuration d’une autre banque.'),
        spec(4, 'inscription et approbation d’un concessionnaire', ['Concessionnaire'], ['Administrateur SaaS', 'SMTP'],
             ['Saisir données société', 'Téléverser logo et justificatifs', 'Soumettre demande concessionnaire', 'Consulter dossier', 'Approuver ou rejeter dossier', 'Créer compte DEALER_ADMIN', 'Envoyer informations de connexion'],
             'Représentant du concessionnaire', 'Administrateur SaaS et SMTP', 'Obtenir un compte concessionnaire après validation du dossier.',
             'Formulaire public accessible ; documents requis disponibles.', 'Dossier rejeté avec motif ou concessionnaire approuvé avec compte créé.',
             'Le concessionnaire saisit les données de sa société, joint le logo et les justificatifs puis soumet. Le SaaS examine le dossier ; en cas d’approbation, le compte administrateur est créé et les informations de connexion sont envoyées.',
             'Le SaaS demande une correction ou rejette la demande avec un motif ; le concessionnaire peut déposer un nouveau dossier.',
             'Justificatif absent, format de fichier non valide, e-mail existant ou erreur d’envoi d’e-mail.'),
        spec(5, 'partenariat banque–concessionnaire et contrat', ['Concessionnaire'], ['Administrateur Banque', 'SMTP'],
             ['Consulter banques accessibles', 'Demander partenariat', 'Accepter ou rejeter partenariat', 'Créer contrat brouillon', 'Envoyer contrat à acceptation', 'Accepter contrat', 'Activer relation commerciale'],
             'Concessionnaire', 'Administrateur Banque et SMTP', 'Établir une relation commerciale active pour un store.',
             'Concessionnaire approuvé ; banque accessible ; store compatible.', 'Partenariat ACTIVE et contrat ACTIVE, ou décision de rejet/suspension persistée.',
             'Le concessionnaire identifie une banque compatible et crée une demande. La banque l’approuve. Un contrat est créé, envoyé, puis accepté ; la relation devient active.',
             'La banque rejette, suspend ou termine le partenariat ; le contrat peut rester DRAFT, être rejeté, expirer ou être résilié.',
             'Doublon banque–concessionnaire–store, contrat incomplet, rôle insuffisant ou relation inactive.'),
        spec(6, 'gestion, publication et visibilité d’un produit concessionnaire', ['Concessionnaire'], ['Administrateur Banque'],
             ['Créer ou modifier produit', 'Gérer images, documents et stock', 'Définir paramètres du store', 'Soumettre publication', 'Examiner publication', 'Approuver ou rejeter publication', 'Rendre produit public'],
             'Concessionnaire', 'Administrateur Banque', 'Publier un produit dans une marketplace partenaire.',
             'Produit actif ; partenariat et contrat actifs ; store actif ; stock disponible.', 'Publication approuvée et produit visible dans la marketplace concernée, ou rejet motivé.',
             'Le concessionnaire maintient son catalogue et son stock, renseigne les paramètres requis puis soumet le produit à la banque. La banque examine et approuve la publication ; le produit devient consultable dans le tenant.',
             'La banque rejette ou inactive la publication ; le concessionnaire corrige et soumet une nouvelle demande.',
             'Produit incomplet, contrat expiré, partenariat suspendu, stock indisponible ou publication non autorisée.'),
        spec(7, 'inscription et activation d’un compte client', ['Internaute'], ['SMTP'],
             ['Accéder à la marketplace bancaire', 'Saisir profil client', 'Ajouter photo facultative', 'Créer inscription en attente', 'Recevoir code à six chiffres', 'Vérifier e-mail', 'Créer compte CLIENT actif'],
             'Internaute', 'SMTP', 'Créer un compte client rattaché à la marketplace bancaire consultée.',
             'Marketplace active ; e-mail non déjà enregistré.', 'Compte CLIENT actif relié à la banque ; code de vérification consommé.',
             'Depuis la marketplace, l’internaute renseigne son profil, son adresse et son mot de passe. Le système crée une inscription en attente et envoie un code. Après validation du code, le compte est créé et le client peut se connecter.',
             'Le client demande un nouveau code après le délai de renvoi ; il peut modifier son adresse e-mail avant validation.',
             'Code incorrect ou expiré, mot de passe invalide, e-mail déjà utilisé, marketplace introuvable ou service e-mail indisponible.'),
        spec(8, 'simulation, dossier et décision de financement', ['Client'], ['Administrateur Banque', 'SMTP'],
             ['Simuler financement', 'Créer brouillon', 'Téléverser ou supprimer documents', 'Soumettre dossier PENDING', 'Consulter dossier bancaire', 'Accepter ou rejeter avec motif', 'Notifier décision'],
             'Client', 'Administrateur Banque et SMTP', 'Constituer un dossier complet puis obtenir une décision bancaire.',
             'Client authentifié dans le tenant ; produit et store éligibles ; exigences documentaires définies.', 'Demande ACCEPTED ou REJECTED, avec notification et e-mail au client.',
             'Le client utilise le simulateur, crée un brouillon et téléverse les pièces requises. Le dossier est soumis à PENDING. La banque consulte les informations, les pièces et la simulation, puis accepte ou rejette avec un motif si nécessaire.',
             'Le client complète les documents manquants avant soumission ; la banque rejette le dossier en précisant le motif.',
             'Pièce obligatoire absente, demande hors statut DRAFT/PENDING, motif de rejet absent, accès hors tenant ou document non autorisé.'),
        spec(9, 'suivi concessionnaire des demandes de financement', ['Concessionnaire'], ['Administrateur Banque'],
             ['Consulter indicateurs de dossiers', 'Filtrer par banque et statut', 'Rechercher client ou référence', 'Ouvrir détail de la demande', 'Constater décision bancaire', 'Consulter impact stock'],
             'Concessionnaire', 'Administrateur Banque', 'Suivre les dossiers liés exclusivement aux produits du concessionnaire.',
             'Concessionnaire actif ; demande associée à un de ses produits.', 'Le concessionnaire visualise le statut et les informations de suivi ; aucune décision bancaire n’est modifiée.',
             'Le concessionnaire consulte son espace de suivi, filtre les demandes par banque ou statut, recherche une référence et ouvre le détail. Après acceptation bancaire, il constate la réservation du stock de son produit.',
             'Aucun dossier ne correspond au filtre ; un dossier rejeté conserve le produit disponible.',
             'Tentative de consultation d’un dossier d’un autre concessionnaire ou absence du produit associé.'),
        spec(10, 'renouvellement et upgrade de l’abonnement', ['Administrateur Banque'], ['Administrateur SaaS', 'Stripe', 'SMTP'],
             ['Consulter abonnement courant', 'Choisir renouvellement ou upgrade', 'Sélectionner services additionnels', 'Soumettre demande SaaS', 'Valider demande', 'Payer supplément ou renouvellement', 'Activer nouveaux services'],
             'Administrateur Banque', 'Administrateur SaaS, Stripe et SMTP', 'Maintenir ou étendre les services de la marketplace.',
             'Banque authentifiée ; abonnement existant ; services et offres disponibles.', 'Abonnement mis à jour et nouveaux stores/modules activés après validation et paiement.',
             'La banque consulte son abonnement, choisit un renouvellement ou des services complémentaires et envoie la demande. Le SaaS l’analyse, génère le paiement ; après confirmation, l’abonnement et les configurations autorisées sont mis à jour.',
             'La demande est refusée ou le paiement est annulé ; les services existants ne sont pas étendus.',
             'Offre inexistante, tentative de sélectionner un service incompatible, paiement non confirmé ou abonnement expiré.'),
        spec(11, 'interrogation analytique via l’assistant IA sécurisé', ['Administrateur SaaS'], ['Gemini'],
             ['Formuler question analytique', 'Construire contexte autorisé', 'Générer proposition SQL', 'Valider allowlist', 'Exécuter SELECT borné', 'Reformuler réponse', 'Journaliser exécution'],
             'Administrateur SaaS', 'Gemini', 'Obtenir une réponse analytique sans exposer les données ou modifier la base.',
             'Utilisateur ADMIN_SAAS authentifié ; service Gemini configuré ; politique de lecture active.', 'Réponse analytique renvoyée ou demande refusée de façon sécurisée.',
             'L’administrateur pose une question. Le backend transmet au modèle un schéma filtré. Le SQL proposé est validé, limité et exécuté en lecture seule ; les résultats sont reformulés puis retournés.',
             'La requête ne satisfait pas les règles : elle est refusée sans accès à la base ; l’administrateur reformule sa question.',
             'Instruction DML/DDL, SELECT *, colonne sensible, jointure non autorisée, dépassement de limite ou erreur du service IA.')
    ]
    for item in specs:
        make_diagram(item['file'], item['title'], item['left'], item['right'], item['uses'])
    doc = Document(SOURCE)
    start = uml.find_heading(doc, '3.6.2'); end = uml.find_heading(doc, '3.6.3')
    uml.remove_between(start, end)
    for p in doc.paragraphs:
        if p.text.startswith('Figure 3.12 — Diagramme de classes'):
            p.text = p.text.replace('Figure 3.12', 'Figure 3.16'); p.style = 'Caption'
    current = uml.paragraph_after(start, 'Cette sous-section présente les cas d’utilisation détaillés organisés par processus fonctionnel. Chaque diagramme UML délimite Matchia par une frontière système ; les acteurs restent à l’extérieur et les objectifs sont représentés par des ellipses. Chaque figure est complétée par un tableau de scénario décrivant les conditions, le déroulement nominal, les alternatives et les exceptions réelles du projet.')
    for item in specs:
        current = uml.figure_after(current, DIAG / item['file'], item['caption'])
        current = uml.paragraph_after(current, 'Le tableau suivant précise le scénario opérationnel correspondant et sert de référence pour l’implémentation et la recette.')
        rows = uml.scenario(item['name'], item['primary'], item['secondary'], item['objective'], item['pre'], item['post'], item['nominal'], item['alternatives'], item['exceptions'])
        current = uml.table_after(doc, current, rows)
        current = uml.paragraph_after(current, '')
    doc.core_properties.title = 'Rapport PFE — Matchia : cas d’utilisation détaillés par processus'
    doc.save(OUT); print(OUT)

if __name__ == '__main__':
    main()
