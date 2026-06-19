package org.matchia.matchiabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Autowired
    private UserRepository userRepository;

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public boolean sendMarketplaceRequestConfirmationEmail(Request request) {
        String recipient = resolveContactRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer la confirmation de demande: email de contact manquant.");
            return false;
        }
        String requestType = request != null && request.getRequestType() != null
                ? request.getRequestType().name().toLowerCase()
                : "join";
        String subject = switch (requestType) {
            case "store" -> "Demande de store recue";
            case "module" -> "Demande de module recue";
            case "subscription" -> "Demande de renouvellement recue";
            default -> "Demande d'activation marketplace recue";
        };
        String body = switch (requestType) {
            case "store" -> """
                    Bonjour,

                    Votre demande d'ajout de store a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.

                    Merci,
                    L'equipe Matchia
                    """;
            case "module" -> """
                    Bonjour,

                    Votre demande d'ajout de module a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.

                    Merci,
                    L'equipe Matchia
                    """;
            case "subscription" -> """
                    Bonjour,

                    Votre demande de renouvellement d'abonnement a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.

                    Merci,
                    L'equipe Matchia
                    """;
            default -> """
                    Bonjour,

                    Votre demande de creation marketplace a bien ete envoyee.
                    Elle sera examinee par notre equipe dans un delai maximum de 2 jours.

                    Merci,
                    L'equipe Matchia
                    """;
        };

        if (mailSender == null || !hasText(mailHost)) {
            log.info("ENVOI D'EMAIL SIMULE - Confirmation demande marketplace");
            log.info("Destinataire : {}", recipient);
            log.info("Sujet : {}", subject);
            log.info("Body : {}", body);
            return false;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            if (hasText(mailUsername)) {
                message.setFrom(mailUsername);
            }
            message.setTo(recipient);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email de confirmation marketplace envoye a {}", recipient);
            return true;
        } catch (Exception e) {
            log.error("Erreur lors de l'envoi de l'email de confirmation marketplace : {}", e.getMessage(), e);
            return false;
        }
    }

    public boolean sendPaymentInstructions(Request request, String paymentLink) {
        String recipient = resolveContactRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer les instructions de paiement: email de contact manquant.");
            return false;
        }
        String subject = "Felicitations ! Votre demande d'adhesion a Matchia a ete approuvee";
        String body = """
                Bonjour %s,

                Votre demande d'adhesion pour la banque "%s" a ete approuvee.
                Votre espace banque et votre marketplace ont ete prepares.

                Montant total a regler : %s TND / mois
                Lien de paiement Stripe : %s

                Merci,
                L'equipe Matchia
                """.formatted(
                hasText(request.getContactName()) ? request.getContactName() : "Admin",
                request.getBankName(),
                request.getTotalAmount(),
                paymentLink
        );

        if (mailSender != null && hasText(mailHost)) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                if (hasText(mailUsername)) {
                    message.setFrom(mailUsername);
                }
                message.setTo(recipient);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                log.info("Email paiement envoye a {}", recipient);
                return true;
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email paiement : {}", e.getMessage(), e);
                return false;
            }
        }

        log.info("=========================================================================");
        log.info("ENVOI D'EMAIL SIMULE - ADHESION MATCHIA");
        log.info("=========================================================================");
        log.info("Destinataire (Coordonnees) : {}", recipient);
        log.info("Sujet : {}", subject);
        log.info("-------------------------------------------------------------------------");
        log.info("{}", body);
        log.info("-------------------------------------------------------------------------");
        log.info("=========================================================================");
        return false;
    }

    public boolean sendRequestRejectedEmail(Request request) {
        return sendJoinRequestRejectedEmail(request, null);
    }

    public boolean sendJoinRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveJoinRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande join: email du contact manquant.");
            return false;
        }

        String subject = "Votre demande d'inscription a Matchia a ete rejetee";
        String body = buildJoinRequestRejectedBody(request, rejectionReason);
        return sendMail(recipient, subject, body, "rejet demande join", "REJET DEMANDE JOIN");
    }

    public boolean sendStoreRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande store: email de la banque manquant.");
            return false;
        }

        String subject = "Votre demande de nouveau store a ete rejetee";
        String body = buildStoreRequestRejectedBody(request, rejectionReason);
        return sendMail(recipient, subject, body, "rejet demande store", "REJET DEMANDE STORE");
    }

    public boolean sendModuleRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande module: email de la banque manquant.");
            return false;
        }

        String subject = "Votre demande de nouveau module a ete rejetee";
        String body = buildModuleRequestRejectedBody(request, rejectionReason);
        return sendMail(recipient, subject, body, "rejet demande module", "REJET DEMANDE MODULE");
    }

    public boolean sendSubscriptionRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande abonnement: email de la banque manquant.");
            return false;
        }

        String subject = "Votre demande de renouvellement d'abonnement a ete rejetee";
        String body = buildSubscriptionRequestRejectedBody(request, rejectionReason);
        return sendMail(recipient, subject, body, "rejet demande abonnement", "REJET DEMANDE ABONNEMENT");
    }

    private boolean sendMail(String recipient, String subject, String body, String logLabel, String simulatedLabel) {
        if (mailSender != null && hasText(mailHost)) {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                if (hasText(mailUsername)) {
                    message.setFrom(mailUsername);
                }
                message.setTo(recipient);
                message.setSubject(subject);
                message.setText(body);
                mailSender.send(message);
                log.info("Email {} envoye a {}", logLabel, recipient);
                return true;
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email {} : {}", logLabel, e.getMessage(), e);
                return false;
            }
        }

        log.info("ENVOI D'EMAIL SIMULE - {}", simulatedLabel);
        log.info("Destinataire : {}", recipient);
        log.info("Sujet : {}", subject);
        log.info("Body : {}", body);
        return false;
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

    private String resolveContactRecipient(Request request) {
        return resolveJoinRecipient(request);
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

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
