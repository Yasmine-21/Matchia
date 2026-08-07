package org.matchia.matchiabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.AuditCategoryEnum;
import org.matchia.matchiabackend.entity.enums.AuditStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Service
@Slf4j
public class EmailService {

    private static final String MATCHIA_LOGO_CID = "matchiaLogo";
    private static final String MATCHIA_LOGO_RESOURCE = "email/matchia-logo.b64";

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private AuditLogger auditLogger;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    @Value("${app.public.url:https://matchia.com}")
    private String publicUrl;

    public boolean sendMarketplaceRequestConfirmationEmail(Request request) {
        String requestType = request != null && request.getRequestType() != null
                ? request.getRequestType().name().toLowerCase()
                : "join";
        String recipient = "join".equals(requestType)
                ? resolveJoinRecipient(request)
                : resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer la confirmation de demande: email du destinataire manquant.");
            auditEmail(request, null, "request_confirmation_email.sent", AuditStatusEnum.failure);
            return false;
        }
        String subject = switch (requestType) {
            case "store" -> "Demande de store recue";
            case "module" -> "Demande de module recue";
            case "subscription" -> "Demande de renouvellement recue";
            default -> "Demande d'activation marketplace recue";
        };
        String message = switch (requestType) {
            case "store" -> """
                    Votre demande d'ajout de store a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.
                    """;
            case "module" -> """
                    Votre demande d'ajout de module a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.
                    """;
            case "subscription" -> """
                    Votre demande de renouvellement d'abonnement a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.
                    """;
            default -> """
                    Votre demande de creation marketplace a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.
                    """;
        };

        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Demande envoyee",
                        "Votre demande a ete enregistree avec succes",
                        message,
                        "Consulter la plateforme",
                        frontendUrl,
                        "Traitement",
                        "En cours",
                        "Prochaine etape",
                        "Votre demande est maintenant en file d'attente pour verification par notre equipe.",
                        "Merci pour votre confiance.",
                        "L'equipe Matchia"
                ),
                "confirmation demande marketplace",
                "CONFIRMATION DEMANDE MARKETPLACE",
                request,
                "request_confirmation_email.sent"
        );
    }

    public boolean sendDealerEventEmail(
            String recipient,
            String subject,
            String title,
            String message,
            String actionLabel,
            String actionUrl,
            String informationTitle,
            String informationText
    ) {
        if (!hasText(recipient)) {
            log.warn("Impossible d'envoyer l'email concessionnaire: destinataire manquant.");
            return false;
        }
        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Matchia partenaires",
                        title,
                        message,
                        actionLabel,
                        actionUrl,
                        "Statut",
                        title,
                        informationTitle,
                        informationText,
                        "Merci pour votre confiance.",
                        "L'equipe Matchia"
                ),
                "notification concessionnaire",
                "NOTIFICATION CONCESSIONNAIRE",
                null,
                "dealer_email.sent"
        );
    }

    public boolean sendDealerCredentialsEmail(String recipient, String temporaryPassword, String backOfficeUrl) {
        return sendTemplatedEmail(
                recipient,
                "Vos identifiants Matchia concessionnaire",
                buildTemplate(
                        "Compte approuve",
                        "Vos identifiants Matchia sont disponibles",
                        "Votre espace concessionnaire est pret. Utilisez ces identifiants pour votre premiere connexion.",
                        "Ouvrir le back office",
                        backOfficeUrl,
                        "Login",
                        recipient,
                        "Mot de passe temporaire",
                        temporaryPassword,
                        "Pour des raisons de securite, merci de changer votre mot de passe lors de votre premiere connexion.",
                        "L'equipe Matchia"
                ),
                "identifiants concessionnaire",
                "IDENTIFIANTS CONCESSIONNAIRE",
                null,
                "dealer_credentials_email.sent"
        );
    }

    public boolean sendJoinEmailVerificationCode(String recipient, String code) {
        return sendTemplatedEmail(
                recipient,
                "Votre code de verification Matchia",
                buildTemplate(
                        "Verification de l'adresse e-mail",
                        "Confirmez votre adresse e-mail",
                        "Utilisez le code ci-dessous pour poursuivre votre demande d'adhesion a Matchia.",
                        null,
                        null,
                        "Code de verification",
                        code,
                        "Duree de validite",
                        "Ce code est valable pendant 10 minutes et ne peut etre utilise qu'une seule fois.",
                        "Si vous n'etes pas a l'origine de cette demande, ignorez cet e-mail.",
                        "L'equipe Matchia"
                ),
                "verification adresse e-mail",
                "VERIFICATION ADRESSE E-MAIL",
                null,
                "join_email_verification.sent"
        );
    }

    public boolean sendPaymentInstructions(Request request, String paymentLink) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer les instructions de paiement: email de l'admin banque manquant.");
            auditEmail(request, null, "payment_link_email.sent", AuditStatusEnum.failure);
            return false;
        }
        if (request != null && request.getRequestType() == org.matchia.matchiabackend.entity.enums.RequestTypeEnum.subscription) {
            return sendSubscriptionRenewalPaymentInstructions(request, recipient, paymentLink);
        }
        String requestType = request != null && request.getRequestType() != null
                ? request.getRequestType().name().toLowerCase()
                : "join";
        String subject = switch (requestType) {
            case "store" -> "Felicitations ! Votre demande de store a ete approuvee";
            case "module" -> "Felicitations ! Votre demande de module a ete approuvee";
            case "subscription" -> "Felicitations ! Votre demande de renouvellement a ete approuvee";
            default -> "Felicitations ! Votre demande d'adhesion a Matchia a ete approuvee";
        };
        String subjectStoreLabel = switch (requestType) {
            case "store" -> "store";
            case "module" -> "module";
            case "subscription" -> "renouvellement d'abonnement";
            default -> "adhesion";
        };
        String message = """
                Votre demande de %s pour la banque "%s" a ete approuvee.
                %s
                """.formatted(
                subjectStoreLabel,
                request != null ? request.getBankName() : "",
                requestType.equals("store")
                        ? "Le nouveau store et ses modules seront ajoutes a votre marketplace apres paiement."
                        : "Votre espace banque et votre marketplace ont ete prepares."
        );
        String amount = request != null && request.getTotalAmount() != null ? request.getTotalAmount().toString() : "0";

        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Paiement a effectuer",
                        "Votre demande a ete approuvee",
                        message,
                        "Proceder au paiement",
                        paymentLink,
                        "Montant total a regler",
                        amount + " TND / mois",
                        "Paiement securise",
                        "Le lien ci-dessus permet de finaliser le paiement pour activer votre dossier.",
                        "Une fois le paiement confirme, votre dossier sera active.",
                        "L'equipe Matchia"
                ),
                "email paiement",
                "PAIEMENT MATCHIA",
                request,
                "payment_link_email.sent"
        );
    }

    public boolean sendSubscriptionRenewalPaymentInstructions(Request request, String paymentLink) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le lien de renouvellement: Bank Admin introuvable.");
            auditEmail(request, null, "subscription_renewal_payment_link_email.sent", AuditStatusEnum.failure);
            return false;
        }
        return sendSubscriptionRenewalPaymentInstructions(request, recipient, paymentLink);
    }

    private boolean sendSubscriptionRenewalPaymentInstructions(Request request, String recipient, String paymentLink) {
        String marketplaceName = hasText(request.getMarketplaceSlug()) ? request.getMarketplaceSlug().trim() : "votre marketplace";
        String amount = request.getTotalAmount() != null ? request.getTotalAmount().toString() : "0";
        String subscriptionDetails = buildSubscriptionDetails(request);

        return sendTemplatedEmail(
                recipient,
                "Renouvellement de votre abonnement Matchia - paiement requis",
                buildTemplate(
                        "Renouvellement d'abonnement",
                        "Votre renouvellement est en attente de paiement",
                        "L’abonnement de la marketplace « %s » sera renouvelé uniquement après confirmation réussie du paiement."
                                .formatted(marketplaceName),
                        "Proceder au paiement securise",
                        paymentLink,
                        "Montant du renouvellement",
                        amount + " TND",
                        "Details de l'abonnement",
                        subscriptionDetails,
                        "Le paiement est requis pour activer la nouvelle periode d'abonnement.",
                        "La nouvelle periode commencera a la date de confirmation du paiement."
                ),
                "email renouvellement abonnement",
                "RENOUVELLEMENT ABONNEMENT MATCHIA",
                request,
                "subscription_renewal_payment_link_email.sent"
        );
    }

    private String buildSubscriptionDetails(Request request) {
        if (request.getSelectedStoreDetails() == null || request.getSelectedStoreDetails().isEmpty()) {
            String stores = request.getStores() == null ? "" : request.getStores().stream()
                    .filter(java.util.Objects::nonNull)
                    .map(store -> hasText(store.getName()) ? store.getName() : "Store")
                    .collect(java.util.stream.Collectors.joining(", "));
            String modules = request.getModules() == null ? "" : request.getModules().stream()
                    .filter(java.util.Objects::nonNull)
                    .map(module -> hasText(module.getName()) ? module.getName() : "Module")
                    .collect(java.util.stream.Collectors.joining(", "));
            if (hasText(stores) || hasText(modules)) {
                return "Stores : " + (hasText(stores) ? stores : "-")
                        + " | Modules : " + (hasText(modules) ? modules : "-");
            }
            return "Marketplace : " + (hasText(request.getMarketplaceSlug()) ? request.getMarketplaceSlug() : "-");
        }

        return request.getSelectedStoreDetails().stream()
                .filter(java.util.Objects::nonNull)
                .map(store -> {
                    String modules = store.getModules() == null ? "Aucun module" : store.getModules().stream()
                            .filter(java.util.Objects::nonNull)
                            .map(module -> hasText(module.getModuleName()) ? module.getModuleName() : "Module")
                            .collect(java.util.stream.Collectors.joining(", "));
                    return (hasText(store.getStoreName()) ? store.getStoreName() : "Store") + " : "
                            + (hasText(modules) ? modules : "Aucun module");
                })
                .collect(java.util.stream.Collectors.joining(" | "));
    }

    public boolean sendBankCredentialsEmail(Request request, User adminUser, String temporaryPassword) {
        if (adminUser == null || !hasText(adminUser.getEmail())) {
            log.warn("Impossible d'envoyer les identifiants banque: utilisateur admin introuvable.");
            auditEmail(request, null, "credentials_email.sent", AuditStatusEnum.failure);
            return false;
        }
        if (!hasText(temporaryPassword)) {
            log.warn("Impossible d'envoyer les identifiants banque: mot de passe temporaire absent pour l'utilisateur {}.", adminUser.getEmail());
            auditEmail(request, adminUser.getEmail(), "credentials_email.sent", AuditStatusEnum.failure);
            return false;
        }

        String subject = "Vos identifiants Matchia pour le back office bancaire";
        return sendEmail(
                adminUser.getEmail(),
                subject,
                buildCredentialsEmailHtml(request, adminUser, temporaryPassword),
                buildCredentialsPlainText(request, adminUser, temporaryPassword),
                "identifiants banque",
                "IDENTIFIANTS BANQUE",
                request,
                "credentials_email.sent"
        );
    }

    public boolean sendPasswordResetEmail(User user, String resetUrl) {
        if (user == null || !hasText(user.getEmail()) || !hasText(resetUrl)) {
            return false;
        }

        String subject = "Reinitialisation de votre mot de passe Matchia";
        String recipientName = hasText(user.getFullName()) ? user.getFullName() : user.getEmail();
        return sendTemplatedEmail(
                user.getEmail(),
                subject,
                buildTemplate(
                        "Reinitialisation de mot de passe",
                        "Un lien de reinitialisation a ete genere",
                        """
                                Bonjour %s,

                                Vous avez demande la reinitialisation de votre mot de passe Matchia.
                                Cliquez sur le bouton ci-dessous pour definir un nouveau mot de passe.
                                Ce lien est personnel et expire rapidement.
                                """.formatted(recipientName),
                        "Reinitialiser le mot de passe",
                        resetUrl,
                        "Action requise",
                        "Definir un nouveau mot de passe",
                        "Conseil de securite",
                        "Si vous n'etes pas a l'origine de cette demande, ignorez cet email.",
                        "L'equipe Matchia",
                        "Support Matchia"
                ),
                "mot de passe oublie",
                "PASSWORD_RESET",
                null,
                "password_reset_email.sent"
        );
    }

    public boolean sendRequestRejectedEmail(Request request) {
        return sendJoinRequestRejectedEmail(request, null);
    }

    public boolean sendJoinRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveJoinRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande join: email du contact manquant.");
            auditEmail(request, null, "rejection_email.sent", AuditStatusEnum.failure);
            return false;
        }

        String subject = "Votre demande d'inscription a Matchia a ete rejetee";
        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Demande refusee",
                        "Votre demande a ete rejetee",
                        buildJoinRequestRejectedBody(request, rejectionReason),
                        "Consulter les details",
                        frontendUrl,
                        "Statut",
                        "Rejetee",
                        "Contact",
                        hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin",
                        "Pour plus d'informations, contactez notre equipe.",
                        "L'equipe Matchia"
                ),
                "rejet demande join",
                "REJET DEMANDE JOIN",
                request,
                "rejection_email.sent"
        );
    }

    public boolean sendStoreRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande store: email de la banque manquant.");
            auditEmail(request, null, "rejection_email.sent", AuditStatusEnum.failure);
            return false;
        }

        String subject = "Votre demande de nouveau store a ete rejetee";
        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Demande refusee",
                        "Votre demande de store a ete rejetee",
                        buildStoreRequestRejectedBody(request, rejectionReason),
                        "Consulter les details",
                        frontendUrl,
                        "Statut",
                        "Rejetee",
                        "Contact",
                        hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin",
                        "Pour plus d'informations, contactez notre equipe.",
                        "L'equipe Matchia"
                ),
                "rejet demande store",
                "REJET DEMANDE STORE",
                request,
                "rejection_email.sent"
        );
    }

    public boolean sendModuleRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande module: email de la banque manquant.");
            auditEmail(request, null, "rejection_email.sent", AuditStatusEnum.failure);
            return false;
        }

        String subject = "Votre demande de nouveau module a ete rejetee";
        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Demande refusee",
                        "Votre demande de module a ete rejetee",
                        buildModuleRequestRejectedBody(request, rejectionReason),
                        "Consulter les details",
                        frontendUrl,
                        "Statut",
                        "Rejetee",
                        "Contact",
                        hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin",
                        "Pour plus d'informations, contactez notre equipe.",
                        "L'equipe Matchia"
                ),
                "rejet demande module",
                "REJET DEMANDE MODULE",
                request,
                "rejection_email.sent"
        );
    }

    public boolean sendSubscriptionRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande abonnement: email de la banque manquant.");
            auditEmail(request, null, "rejection_email.sent", AuditStatusEnum.failure);
            return false;
        }

        String subject = "Votre demande de renouvellement d'abonnement a ete rejetee";
        return sendTemplatedEmail(
                recipient,
                subject,
                buildTemplate(
                        "Demande refusee",
                        "Votre demande de renouvellement a ete rejetee",
                        buildSubscriptionRequestRejectedBody(request, rejectionReason),
                        "Consulter les details",
                        frontendUrl,
                        "Statut",
                        "Rejetee",
                        "Contact",
                        hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin",
                        "Pour plus d'informations, contactez notre equipe.",
                        "L'equipe Matchia"
                ),
                "rejet demande abonnement",
                "REJET DEMANDE ABONNEMENT",
                request,
                "rejection_email.sent"
        );
    }

    private boolean sendTemplatedEmail(
            String recipient,
            String subject,
            EmailTemplate template,
            String logLabel,
            String simulatedLabel,
            Request relatedRequest,
            String auditAction
    ) {
        String html = buildEmailHtmlV2(template);
        String text = buildPlainText(template);
        return sendEmail(recipient, subject, html, text, logLabel, simulatedLabel, relatedRequest, auditAction);
    }

    private boolean sendEmail(
            String recipient,
            String subject,
            String html,
            String text,
            String logLabel,
            String simulatedLabel,
            Request relatedRequest,
            String auditAction
    ) {
        if (mailSender != null && hasText(mailHost)) {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
                if (hasText(mailUsername)) {
                    helper.setFrom(mailUsername);
                }
                helper.setTo(recipient);
                helper.setSubject(subject);
                helper.setText(text, html);
                addMatchiaLogo(helper);
                mailSender.send(message);
                log.info("Email {} envoye a {}", logLabel, recipient);
                auditEmail(relatedRequest, recipient, auditAction, AuditStatusEnum.success);
                return true;
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email {} : {}", logLabel, e.getMessage(), e);
                auditEmail(relatedRequest, recipient, auditAction, AuditStatusEnum.failure);
                return false;
            }
        }

        log.info("ENVOI D'EMAIL SIMULE - {}", simulatedLabel);
        log.info("Destinataire : {}", recipient);
        log.info("Sujet : {}", subject);
        log.info("Corps de l'email non journalise pour proteger les donnees sensibles.");
        auditEmail(relatedRequest, recipient, auditAction, AuditStatusEnum.failure);
        return false;
    }

    private void addMatchiaLogo(MimeMessageHelper helper) throws IOException, MessagingException {
        ClassPathResource encodedLogo = new ClassPathResource(MATCHIA_LOGO_RESOURCE);
        String base64Logo;
        try (var input = encodedLogo.getInputStream()) {
            base64Logo = new String(input.readAllBytes(), StandardCharsets.US_ASCII).trim();
        }
        helper.addInline(
                MATCHIA_LOGO_CID,
                new ByteArrayResource(Base64.getDecoder().decode(base64Logo)),
                "image/png"
        );
    }

    private void auditEmail(Request request, String recipient, String action, AuditStatusEnum status) {
        AuditLogRequest audit = new AuditLogRequest();
        audit.setTenantId("saas");
        audit.setAction(action);
        audit.setCategory(AuditCategoryEnum.core);
        audit.setResourceType("email");
        audit.setResourceId(request != null && request.getId() != null ? String.valueOf(request.getId()) : null);
        audit.setStatus(status);
        audit.setEmailRecipient(recipient);
        audit.setAffectedUserName(request != null ? request.getContactName() : null);
        audit.setBankId(request != null && request.getBank() != null && request.getBank().getId() != null
                ? String.valueOf(request.getBank().getId()) : null);
        audit.setMarketplaceId(request != null && request.getBank() != null && request.getBank().getMarketplace() != null
                && request.getBank().getMarketplace().getId() != null
                ? String.valueOf(request.getBank().getMarketplace().getId()) : null);
        audit.setCorrelationId(request != null && request.getId() != null ? "request-" + request.getId() : null);
        auditLogger.logSystemAsync(audit, "EMAIL_AUTOMATION");
    }

    private String buildCredentialsEmailHtml(Request request, User adminUser, String temporaryPassword) {
        String recipientName = hasText(adminUser.getFullName()) ? adminUser.getFullName() : "Administrateur";
        String marketplaceName = request != null && hasText(request.getMarketplaceSlug())
                ? request.getMarketplaceSlug() : "votre marketplace";
        String intro = """
                <p style="margin:0 0 10px;">Bonjour %s,</p>
                <p style="margin:0;">Votre banque, la marketplace &laquo; %s &raquo; et votre espace administrateur sont maintenant actifs.</p>
                """.formatted(
                escapeHtml(recipientName),
                escapeHtml(marketplaceName)
        );

        String bodyHtml = """
                <table role="presentation" width="100%%" cellspacing="0" cellpadding="0" border="0">
                  <tr>
                    <td style="padding:18px 20px;border:1px solid #d7e4fb;background-color:#f5f9ff;border-radius:10px;">
                      <div style="font-size:14px;line-height:20px;color:#52627a;">Login</div>
                      <div style="padding-top:5px;font-size:19px;line-height:26px;font-weight:700;color:#0758f5;word-break:break-all;">%s</div>
                    </td>
                  </tr>
                  <tr><td height="12" style="height:12px;font-size:0;line-height:0;">&nbsp;</td></tr>
                  <tr>
                    <td style="padding:15px 20px;border:1px solid #9fc1ff;background-color:#ffffff;border-radius:10px;text-align:center;">
                      <div style="font-size:14px;line-height:20px;font-weight:700;color:#14213d;">Mot de passe</div>
                      <div style="padding-top:5px;font-size:18px;line-height:25px;color:#34445f;word-break:break-all;">%s</div>
                    </td>
                  </tr>
                </table>
                """.formatted(
                escapeHtml(adminUser.getEmail()),
                escapeHtml(temporaryPassword)
        );

        return buildMatchiaEmailShell(
                "Félicitations !",
                "Vos identifiants Matchia sont disponibles",
                intro,
                bodyHtml,
                "Ouvrir le back office",
                buildBackOfficeUrl(request),
                "Merci de changer ce mot de passe lors de votre première connexion.",
                "L'équipe Matchia"
        );
    }

    private String buildCredentialsPlainText(Request request, User adminUser, String temporaryPassword) {
        String marketplaceName = request != null && hasText(request.getMarketplaceSlug())
                ? request.getMarketplaceSlug() : "votre marketplace";
        return """
                Votre compte Matchia est pret.
                Votre paiement a ete confirme avec succes.

                Marketplace : %s
                Login : %s
                Mot de passe : %s

                Important : changez ce mot de passe lors de votre premiere connexion.
                """.formatted(marketplaceName, adminUser.getEmail(), temporaryPassword);
    }

    private EmailTemplate buildTemplate(
            String eyebrow,
            String title,
            String message,
            String actionLabel,
            String actionUrl,
            String highlightLabel,
            String highlightValue,
            String infoTitle,
            String infoText,
            String footerNote,
            String secondaryNote
    ) {
        return new EmailTemplate(
                resolveHeroTitle(eyebrow, title),
                eyebrow,
                title,
                message,
                actionLabel,
                actionUrl,
                highlightLabel,
                highlightValue,
                infoTitle,
                infoText,
                footerNote,
                secondaryNote
        );
    }

    private String buildPlainText(EmailTemplate template) {
        StringBuilder builder = new StringBuilder()
                .append(template.eyebrow()).append('\n')
                .append(template.title()).append('\n')
                .append(template.message()).append('\n');
        if (hasText(template.highlightLabel()) || hasText(template.highlightValue())) {
            builder.append(template.highlightLabel()).append(" : ").append(template.highlightValue()).append('\n');
        }
        if (hasText(template.infoTitle()) || hasText(template.infoText())) {
            builder.append(template.infoTitle()).append(" : ").append(template.infoText()).append('\n');
        }
        if (hasText(template.actionLabel())) {
            builder.append("Action : ").append(template.actionLabel()).append('\n');
        }
        if (hasText(template.footerNote())) {
            builder.append(template.footerNote()).append('\n');
        }
        if (hasText(template.secondaryNote())) {
            builder.append(template.secondaryNote()).append('\n');
        }
        builder.append("Email : matchia@gmail.com\n")
               .append("Téléphone : +216 71 200 300\n");
        return builder.toString();
    }

    private String buildEmailHtmlV2(EmailTemplate template) {
        String actionUrl = sanitizeEmailActionUrl(template.actionUrl());
        String introHtml = buildMessageHtml(template.message());
        String bodyHtml = buildDynamicInformationCards(template);

        return buildMatchiaEmailShell(
                template.heroTitle(),
                template.title(),
                introHtml,
                bodyHtml,
                template.actionLabel(),
                actionUrl,
                template.footerNote(),
                template.secondaryNote()
        );
    }

    private String buildDynamicInformationCards(EmailTemplate template) {
        StringBuilder cards = new StringBuilder();
        boolean hasHighlight = hasText(template.highlightLabel()) || hasText(template.highlightValue());
        boolean hasInfo = hasText(template.infoTitle()) || hasText(template.infoText());

        if (hasHighlight) {
            cards.append("""
                    <tr>
                      <td style="padding:18px 20px;border:1px solid #d7e4fb;background-color:#f5f9ff;border-radius:10px;">
                        <div style="font-size:13px;line-height:19px;color:#52627a;">%s</div>
                        <div style="padding-top:6px;font-size:25px;line-height:32px;font-weight:700;color:#0758f5;">%s</div>
                      </td>
                    </tr>
                    """.formatted(escapeHtml(template.highlightLabel()), escapeHtml(template.highlightValue())));
        }
        if (hasHighlight && hasInfo) {
            cards.append("<tr><td height=\"12\" style=\"height:12px;font-size:0;line-height:0;\">&nbsp;</td></tr>");
        }
        if (hasInfo) {
            cards.append("""
                    <tr>
                      <td style="padding:16px 20px;border:1px solid #d7e4fb;background-color:#ffffff;border-radius:10px;">
                        <div style="font-size:14px;line-height:20px;font-weight:700;color:#14213d;">%s</div>
                        <div style="padding-top:6px;font-size:14px;line-height:22px;color:#52627a;">%s</div>
                      </td>
                    </tr>
                    """.formatted(escapeHtml(template.infoTitle()), escapeHtml(template.infoText())));
        }
        return cards.isEmpty()
                ? ""
                : "<table role=\"presentation\" width=\"100%\" cellspacing=\"0\" cellpadding=\"0\" border=\"0\">"
                + cards + "</table>";
    }

    private String buildMatchiaEmailShell(
            String heroTitle,
            String heroSubtitle,
            String bodyIntroHtml,
            String bodyHtml,
            String actionLabel,
            String actionUrl,
            String footerNote,
            String secondaryNote
    ) {
        String safeHeroTitle = hasText(heroTitle) ? escapeHtml(heroTitle) : "Matchia";
        String safeHeroSubtitle = hasText(heroSubtitle) ? escapeHtml(heroSubtitle) : "";
        String icon = buildEmailIcon(heroTitle, heroSubtitle);
        String actionButton = buildEmailActionButton(actionLabel, sanitizeEmailActionUrl(actionUrl));
        String notes = buildEmailNotes(footerNote, secondaryNote);
        String introSection = hasText(bodyIntroHtml)
                ? "<tr><td style=\"padding:0 42px 4px 42px;font-size:15px;line-height:24px;color:#34445f;text-align:center;\">"
                + bodyIntroHtml + "</td></tr>"
                : "";
        String bodySection = hasText(bodyHtml)
                ? "<tr><td style=\"padding:16px 42px 0 42px;\">" + bodyHtml + "</td></tr>"
                : "";
        String actionSection = hasText(actionButton)
                ? "<tr><td align=\"center\" style=\"padding:18px 42px 0 42px;\">" + actionButton + "</td></tr>"
                : "";
        String notesSection = hasText(notes)
                ? "<tr><td align=\"center\" style=\"padding:18px 42px 22px 42px;\">" + notes + "</td></tr>"
                : "";

        String html = """
                <!doctype html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <meta name="x-apple-disable-message-reformatting" />
                  <title>{{TITLE}}</title>
                </head>
                <body style="margin:0;padding:0;background-color:#f4f7fc;font-family:Arial,Helvetica,sans-serif;color:#10203b;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#f4f7fc">
                    <tr>
                      <td align="center" style="padding:20px 10px;">
                        <!--[if mso]><table role="presentation" width="640" cellspacing="0" cellpadding="0" border="0"><tr><td><![endif]-->
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:640px;background-color:#ffffff;border:1px solid #d9e4f7;border-radius:14px;overflow:hidden;">
                          <tr><td height="12" bgcolor="#0648c9" style="height:12px;background-color:#0648c9;font-size:0;line-height:0;">&nbsp;</td></tr>
                          <tr>
                            <td align="left" style="padding:20px 40px 18px 40px;border-bottom:2px solid #0758f5;">
                              <img src="cid:matchiaLogo" width="205" alt="Matchia" style="display:block;width:205px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
                            </td>
                          </tr>
                          <tr>
                            <td align="center" style="padding:26px 42px 18px 42px;">
                              {{ICON}}
                              <div style="padding-top:15px;font-size:32px;line-height:39px;font-weight:700;color:#0d172a;text-align:center;">{{HERO_TITLE}}</div>
                              <div style="padding-top:5px;font-size:18px;line-height:25px;font-weight:700;color:#0758f5;text-align:center;">{{HERO_SUBTITLE}}</div>
                              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:14px auto 0 auto;"><tr><td width="42" height="3" bgcolor="#0758f5" style="width:42px;height:3px;background-color:#0758f5;font-size:0;line-height:0;">&nbsp;</td></tr></table>
                            </td>
                          </tr>
                          {{INTRO_SECTION}}
                          {{BODY_SECTION}}
                          {{ACTION_SECTION}}
                          {{NOTES_SECTION}}
                          <tr><td height="2" bgcolor="#0758f5" style="height:2px;background-color:#0758f5;font-size:0;line-height:0;">&nbsp;</td></tr>
                          <tr>
                            <td bgcolor="#f3f7ff" style="padding:18px 30px;background-color:#f3f7ff;">
                              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                  <td width="50%" align="center" style="padding:5px 8px;font-size:14px;line-height:20px;color:#34445f;border-right:1px solid #cddcf5;">&#9993;&nbsp;&nbsp; matchia@gmail.com</td>
                                  <td width="50%" align="center" style="padding:5px 8px;font-size:14px;line-height:20px;color:#34445f;">&#9742;&nbsp;&nbsp; +216 71 200 300</td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                        <!--[if mso]></td></tr></table><![endif]-->
                      </td>
                    </tr>
                  </table>
                </body>
                </html>
                """;

        return html
                .replace("{{TITLE}}", safeHeroTitle)
                .replace("{{ICON}}", icon)
                .replace("{{HERO_TITLE}}", safeHeroTitle)
                .replace("{{HERO_SUBTITLE}}", safeHeroSubtitle)
                .replace("{{INTRO_SECTION}}", introSection)
                .replace("{{BODY_SECTION}}", bodySection)
                .replace("{{ACTION_SECTION}}", actionSection)
                .replace("{{NOTES_SECTION}}", notesSection);
    }

    private String buildEmailIcon(String title, String subtitle) {
        String context = ((title == null ? "" : title) + " " + (subtitle == null ? "" : subtitle)).toLowerCase();
        String symbol = "&#9993;";
        String foreground = "#0758f5";
        String background = "#eef4ff";
        if (context.contains("refus") || context.contains("rejet")) {
            symbol = "&#10005;";
            foreground = "#dc2626";
            background = "#fff1f2";
        } else if (context.contains("mot de passe") || context.contains("réinitial") || context.contains("reinitial")) {
            symbol = "&#128273;";
            foreground = "#f97316";
            background = "#fff7ed";
        } else if (context.contains("paiement") || context.contains("renouvellement")) {
            symbol = "&#128179;";
        }
        return """
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td width="76" height="76" align="center" valign="middle" style="width:76px;height:76px;border-radius:38px;background-color:%s;color:%s;font-size:34px;line-height:76px;text-align:center;">%s</td>
                  </tr>
                </table>
                """.formatted(background, foreground, symbol);
    }

    private String buildEmailActionButton(String label, String url) {
        if (!hasText(label) || !hasText(url)) {
            return "";
        }
        return """
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center">
                  <tr>
                    <td align="center" bgcolor="#0758f5" style="background-color:#0758f5;border-radius:10px;">
                      <a href="%s" target="_blank" style="display:inline-block;min-width:220px;padding:13px 28px;color:#ffffff;text-decoration:none;font-size:16px;line-height:22px;font-weight:700;text-align:center;">%s&nbsp;&nbsp;&#8594;</a>
                    </td>
                  </tr>
                </table>
                """.formatted(escapeHtml(url), escapeHtml(label));
    }

    private String buildEmailNotes(String footerNote, String secondaryNote) {
        if (!hasText(footerNote) && !hasText(secondaryNote)) {
            return "";
        }
        StringBuilder notes = new StringBuilder();
        if (hasText(footerNote)) {
            notes.append("<div style=\"font-size:14px;line-height:22px;color:#52627a;text-align:center;\">")
                    .append(escapeHtml(footerNote)).append("</div>");
        }
        if (hasText(secondaryNote)) {
            notes.append("<div style=\"padding-top:7px;font-size:15px;line-height:22px;font-weight:700;color:#0758f5;text-align:center;\">")
                    .append(escapeHtml(secondaryNote)).append("</div>");
        }
        return notes.toString();
    }

    private String resolveHeroTitle(String eyebrow, String title) {
        String context = ((eyebrow == null ? "" : eyebrow) + " " + (title == null ? "" : title)).toLowerCase();
        if (context.contains("refus") || context.contains("rejet")) {
            return "Demande refusée";
        }
        if (context.contains("réinitial") || context.contains("reinitial")) {
            return "Réinitialisation";
        }
        if (context.contains("demande envoy") || context.contains("enregistr")) {
            return "Demande reçue";
        }
        if (context.contains("renouvellement")) {
            return "Renouvellement";
        }
        return "Félicitations !";
    }

    private String buildBackOfficeUrl(Request request) {
        String base = safePublicUrl();
        String slug = request != null ? request.getMarketplaceSlug() : null;
        if (!hasText(slug) || !slug.matches("[A-Za-z0-9-]+")) {
            return base + "/connexion";
        }
        try {
            URI publicUri = URI.create(base);
            String host = publicUri.getHost();
            if (!hasText(host)) {
                return base + "/connexion";
            }
            host = host.replaceFirst("^www\\.", "");
            return new URI("https", null, slug.toLowerCase() + "." + host, -1, "/connexion", null, null).toString();
        } catch (Exception exception) {
            return base + "/connexion";
        }
    }

    private String sanitizeEmailActionUrl(String candidate) {
        if (!hasText(candidate)) {
            return null;
        }
        try {
            URI uri = URI.create(candidate.trim());
            String host = uri.getHost();
            boolean securePublicUrl = "https".equalsIgnoreCase(uri.getScheme())
                    && hasText(host)
                    && uri.getPort() == -1
                    && !isDevelopmentHost(host);
            return securePublicUrl || isTrustedFrontendPaymentUrl(uri) ? uri.toString() : safePublicUrl();
        } catch (Exception exception) {
            return safePublicUrl();
        }
    }

    private boolean isTrustedFrontendPaymentUrl(URI candidate) {
        if (!hasText(frontendUrl) || candidate == null) {
            return false;
        }
        try {
            URI configuredFrontend = URI.create(frontendUrl.trim().replaceAll("/+$", ""));
            String path = candidate.getPath();
            return hasText(candidate.getHost())
                    && candidate.getHost().equalsIgnoreCase(configuredFrontend.getHost())
                    && java.util.Objects.equals(candidate.getScheme(), configuredFrontend.getScheme())
                    && candidate.getPort() == configuredFrontend.getPort()
                    && ("/paiement".equals(path) || "/payment/demo".equals(path));
        } catch (Exception exception) {
            return false;
        }
    }

    private String safePublicUrl() {
        if (hasText(publicUrl)) {
            try {
                URI uri = URI.create(publicUrl.trim().replaceAll("/+$", ""));
                if ("https".equalsIgnoreCase(uri.getScheme()) && hasText(uri.getHost())
                        && uri.getPort() == -1 && !isDevelopmentHost(uri.getHost())) {
                    return uri.toString();
                }
            } catch (Exception ignored) {
                // The public fallback below deliberately contains no development host or port.
            }
        }
        return "https://matchia.com";
    }

    private boolean isDevelopmentHost(String host) {
        String normalized = host.toLowerCase();
        return normalized.equals("localhost")
                || normalized.equals("127.0.0.1")
                || normalized.equals("::1")
                || normalized.equals("lvh.me")
                || normalized.endsWith(".lvh.me");
    }
    private String buildMessageHtml(String message) {
        String[] paragraphs = message == null ? new String[0] : message.trim().split("\\R+");
        StringBuilder builder = new StringBuilder();
        for (String paragraph : paragraphs) {
            if (!hasText(paragraph)) {
                continue;
            }
            if (builder.length() > 0) {
                builder.append("<div style=\"height:12px;\"></div>");
            }
            builder.append("<p style=\"margin:0;font-size:16px;line-height:1.8;color:#334155;\">")
                    .append(escapeHtml(paragraph.trim()))
                    .append("</p>");
        }
        return builder.toString();
    }

    private String escapeHtml(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    private String extractHeroSubtitle(String message) {
        if (!hasText(message)) {
            return "Votre demande a bien ete enregistree";
        }
        String[] paragraphs = message.trim().split("\\R+");
        for (String paragraph : paragraphs) {
            if (hasText(paragraph)) {
                String cleaned = paragraph.trim();
                return cleaned.length() > 110 ? cleaned.substring(0, 107) + "..." : cleaned;
            }
        }
        return "Votre demande a bien ete enregistree";
    }

    private String buildJoinRequestRejectedBody(Request request, String rejectionReason) {
        String contactName = hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin";
        String bankName = hasText(request != null ? request.getBankName() : null) ? request.getBankName() : "votre organisation";
        return buildRejectedBody(
                contactName,
                "Votre demande d'inscription pour la banque \"%s\" a ete rejetee par l'equipe SaaS.".formatted(bankName),
                rejectionReason
        );
    }

    private String buildStoreRequestRejectedBody(Request request, String rejectionReason) {
        String contactName = hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin";
        String bankName = hasText(request != null ? request.getBankName() : null) ? request.getBankName() : "votre banque";
        return buildRejectedBody(
                contactName,
                "Votre demande d'ajout de store pour la banque \"%s\" a ete rejetee par l'equipe SaaS.".formatted(bankName),
                rejectionReason
        );
    }

    private String buildModuleRequestRejectedBody(Request request, String rejectionReason) {
        String contactName = hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin";
        String bankName = hasText(request != null ? request.getBankName() : null) ? request.getBankName() : "votre banque";
        return buildRejectedBody(
                contactName,
                "Votre demande d'ajout de module pour la banque \"%s\" a ete rejetee par l'equipe SaaS.".formatted(bankName),
                rejectionReason
        );
    }

    private String buildSubscriptionRequestRejectedBody(Request request, String rejectionReason) {
        String contactName = hasText(request != null ? request.getContactName() : null) ? request.getContactName() : "Admin";
        String bankName = hasText(request != null ? request.getBankName() : null) ? request.getBankName() : "votre banque";
        return buildRejectedBody(
                contactName,
                "Votre demande de renouvellement d'abonnement pour la banque \"%s\" a ete rejetee par l'equipe SaaS.".formatted(bankName),
                rejectionReason
        );
    }

    private String buildRejectedBody(String recipientName, String baseSentence, String rejectionReason) {
        StringBuilder body = new StringBuilder()
                .append("Bonjour ").append(recipientName).append(",\n\n")
                .append(baseSentence).append('\n');

        if (hasText(rejectionReason)) {
            body.append("\nMotif du rejet : ").append(rejectionReason.trim()).append('\n');
        }

        body.append("\nMerci,\nL'equipe Matchia\n");
        return body.toString();
    }

    private String resolveJoinRecipient(Request request) {
        return hasText(request != null ? request.getContactEmail() : null)
                ? request.getContactEmail()
                : null;
    }

    private String resolveBankRecipient(Request request) {
        if (request == null) {
            return null;
        }
        if (request.getBank() != null && request.getBank().getId() != null) {
            User adminUser = userRepository.findByBank_IdOrderByCreatedAtAsc(request.getBank().getId()).stream()
                    .filter(user -> user.getRole() == RoleEnum.ADMIN_BANK)
                    .findFirst()
                    .orElse(null);
            if (adminUser != null && hasText(adminUser.getEmail())) {
                return adminUser.getEmail();
            }
            if (hasText(request.getBank().getEmail())) {
                return request.getBank().getEmail();
            }
        }
        return hasText(request.getBankEmail()) ? request.getBankEmail() : null;
    }

    private User resolveBankAdminUser(Request request) {
        if (request == null || request.getBank() == null || request.getBank().getId() == null) {
            return null;
        }

        return userRepository.findByBank_IdOrderByCreatedAtAsc(request.getBank().getId()).stream()
                .filter(user -> user.getRole() == RoleEnum.ADMIN_BANK)
                .findFirst()
                .orElse(null);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private record EmailTemplate(
            String heroTitle,
            String eyebrow,
            String title,
            String message,
            String actionLabel,
            String actionUrl,
            String highlightLabel,
            String highlightValue,
            String infoTitle,
            String infoText,
            String footerNote,
            String secondaryNote
    ) {
    }
}

