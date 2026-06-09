package org.matchia.matchiabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Request;
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

    @Value("${spring.mail.host:}")
    private String mailHost;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    public boolean sendMarketplaceRequestConfirmationEmail(Request request) {
        String recipient = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
        String subject = "Demande d'activation marketplace recue";
        String body = """
                Bonjour,

                Votre demande de creation marketplace a bien ete envoyee.
                Elle sera examinee par notre equipe dans un delai maximum de 2 jours.

                Merci,
                L'equipe Matchia
                """;

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
        String recipient = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
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
        log.info("Destinataire (Admin Banque) : {}", recipient);
        log.info("Destinataire Institution (Banque) : {}", request.getBankEmail());
        log.info("Sujet : {}", subject);
        log.info("-------------------------------------------------------------------------");
        log.info("{}", body);
        log.info("-------------------------------------------------------------------------");
        log.info("=========================================================================");
        return false;
    }

    public boolean sendRequestRejectedEmail(Request request) {
        String recipient = hasText(request.getContactEmail()) ? request.getContactEmail() : request.getBankEmail();
        String subject = "Votre demande d'adhesion a Matchia a ete rejetee";
        String body = """
                Bonjour %s,

                Nous vous informons que votre demande d'adhesion pour la banque "%s" a ete rejetee par l'equipe SaaS.

                Vous pouvez contacter l'equipe Matchia pour plus d'informations.

                Merci,
                L'equipe Matchia
                """.formatted(
                hasText(request.getContactName()) ? request.getContactName() : "Admin",
                request.getBankName()
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
                log.info("Email rejet demande envoye a {}", recipient);
                return true;
            } catch (Exception e) {
                log.error("Erreur lors de l'envoi de l'email rejet : {}", e.getMessage(), e);
                return false;
            }
        }

        log.info("ENVOI D'EMAIL SIMULE - REJET DEMANDE MATCHIA");
        log.info("Destinataire : {}", recipient);
        log.info("Sujet : {}", subject);
        log.info("Body : {}", body);
        return false;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
