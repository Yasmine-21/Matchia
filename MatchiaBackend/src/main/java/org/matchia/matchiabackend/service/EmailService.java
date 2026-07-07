package org.matchia.matchiabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import java.nio.charset.StandardCharsets;
import java.util.List;

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

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

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
                "CONFIRMATION DEMANDE MARKETPLACE"
        );
    }

    public boolean sendPaymentInstructions(Request request, String paymentLink) {
        String recipient = resolvePaymentRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer les instructions de paiement: email de contact manquant.");
            return false;
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
                "PAIEMENT MATCHIA"
        );
    }

    public boolean sendBankCredentialsEmail(Request request) {
        User adminUser = resolveBankAdminUser(request);
        if (adminUser == null || !hasText(adminUser.getEmail())) {
            log.warn("Impossible d'envoyer les identifiants banque: utilisateur admin introuvable.");
            return false;
        }
        if (!hasText(adminUser.getPassword())) {
            log.warn("Impossible d'envoyer les identifiants banque: mot de passe manquant pour l'utilisateur {}.", adminUser.getEmail());
            return false;
        }

        String subject = "Vos identifiants Matchia pour le back office bancaire";
        String message = "Votre paiement a ete confirme avec succes. Voici vos identifiants de connexion au back office bancaire.";
        return sendTemplatedEmail(
                adminUser.getEmail(),
                subject,
                buildTemplate(
                        "Acces back office",
                        "Vos identifiants Matchia sont disponibles",
                        message,
                        "Ouvrir le back office",
                        frontendUrl + "/bank/login",
                        "Login",
                        adminUser.getEmail(),
                        "Mot de passe",
                        adminUser.getPassword(),
                        "Merci de changer ce mot de passe lors de votre premiere connexion.",
                        "L'equipe Matchia"
                ),
                "identifiants banque",
                "IDENTIFIANTS BANQUE"
        );
    }

    public boolean sendRequestRejectedEmail(Request request) {
        return sendJoinRequestRejectedEmail(request, null);
    }

    public boolean sendJoinRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            recipient = resolveJoinRecipient(request);
        }
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande join: email du contact manquant.");
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
                "REJET DEMANDE JOIN"
        );
    }

    public boolean sendStoreRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande store: email de la banque manquant.");
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
                "REJET DEMANDE STORE"
        );
    }

    public boolean sendModuleRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande module: email de la banque manquant.");
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
                "REJET DEMANDE MODULE"
        );
    }

    public boolean sendSubscriptionRequestRejectedEmail(Request request, String rejectionReason) {
        String recipient = resolveBankRecipient(request);
        if (recipient == null) {
            log.warn("Impossible d'envoyer le rejet de demande abonnement: email de la banque manquant.");
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
                "REJET DEMANDE ABONNEMENT"
        );
    }

    private boolean sendTemplatedEmail(String recipient, String subject, EmailTemplate template, String logLabel, String simulatedLabel) {
        String html = buildEmailHtmlV2(template);
        String text = buildPlainText(template);
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
        log.info("Body : {}", text);
        return false;
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

    private String buildEmailHtml(EmailTemplate template) {
        String actionUrl = hasText(template.actionUrl()) ? template.actionUrl() : frontendUrl;
        String highlightLabel = hasText(template.highlightLabel()) ? template.highlightLabel() : "Information";
        String highlightValue = hasText(template.highlightValue()) ? template.highlightValue() : "-";
        String infoTitle = hasText(template.infoTitle()) ? template.infoTitle() : "Information";
        String infoText = hasText(template.infoText()) ? template.infoText() : "Aucun complement disponible.";
        String footerNote = hasText(template.footerNote()) ? template.footerNote() : "Merci pour votre confiance.";
        String secondaryNote = hasText(template.secondaryNote()) ? template.secondaryNote() : "L'equipe Matchia";

        String html = """
                <!doctype html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>{{TITLE}}</title>
                </head>
                <body style="margin:0;padding:0;background:#f5f7fb;font-family:Arial,Helvetica,sans-serif;color:#0f172a;">
                  <div style="max-width:760px;margin:0 auto;padding:24px;">
                    <div style="border-radius:24px;overflow:hidden;background:#ffffff;box-shadow:0 20px 60px rgba(15,23,42,.08);border:1px solid #e5e7eb;">
                      <div style="background:linear-gradient(135deg,#0f172a 0%%,#1d4ed8 55%%,#f97316 100%%);padding:28px 32px;color:#fff;">
                        <div style="font-size:13px;letter-spacing:.22em;text-transform:uppercase;opacity:.8;">Matchia</div>
                        <div style="font-size:28px;font-weight:700;margin-top:10px;">Banking Marketplaces</div>
                        <div style="font-size:15px;opacity:.92;margin-top:8px;">{{EYEBROW}}</div>
                      </div>
                      <div style="padding:32px;">
                        <div style="text-align:center;margin-bottom:24px;">
                          <div style="display:inline-flex;align-items:center;justify-content:center;width:74px;height:74px;border-radius:999px;background:#dcfce7;color:#16a34a;font-size:34px;font-weight:700;">ÃƒÂ¢Ã…â€œÃ¢â‚¬Å“</div>
                          <div style="margin-top:18px;font-size:30px;line-height:1.2;font-weight:800;color:#0f172a;">{{TITLE}}</div>
                          <div style="margin-top:8px;font-size:18px;line-height:1.5;font-weight:700;color:#1d4ed8;">{{SUBTITLE}}</div>
                        </div>

                        <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:20px;padding:24px;">
                          {{MESSAGE}}
                        </div>

                        <div style="margin-top:22px;border-radius:18px;border:1px solid #dbeafe;background:#eff6ff;padding:18px 20px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#2563eb;">{{HIGHLIGHT_LABEL}}</div>
                          <div style="margin-top:8px;font-size:18px;font-weight:800;color:#0f172a;">{{HIGHLIGHT_VALUE}}</div>
                        </div>

                        <div style="margin-top:20px;border-radius:18px;border:1px solid #e5e7eb;background:#fffaf0;padding:18px 20px;">
                          <div style="font-size:12px;font-weight:700;letter-spacing:.2em;text-transform:uppercase;color:#d97706;">{{INFO_TITLE}}</div>
                          <div style="margin-top:8px;font-size:15px;line-height:1.7;color:#334155;">{{INFO_TEXT}}</div>
                        </div>

                        <div style="text-align:center;margin-top:24px;">
                          <a href="{{ACTION_URL}}" style="display:inline-block;background:linear-gradient(135deg,#1d4ed8 0%%,#2563eb 100%%);color:#fff;text-decoration:none;padding:14px 28px;border-radius:999px;font-size:16px;font-weight:700;box-shadow:0 10px 30px rgba(37,99,235,.25);">{{ACTION_LABEL}}</a>
                        </div>

                        <div style="margin-top:26px;padding-top:20px;border-top:1px solid #e5e7eb;font-size:14px;line-height:1.7;color:#475569;">
                          <div style="font-weight:700;color:#0f172a;">{{FOOTER_NOTE}}</div>
                          <div style="margin-top:6px;">{{SECONDARY_NOTE}}</div>
                        </div>

                        <div style="margin-top:26px;text-align:center;font-size:14px;line-height:1.7;color:#64748b;">
                          <div>{{SUPPORT_LINE}}</div>
                          <div style="margin-top:6px;font-weight:700;color:#1d4ed8;">{{BRAND_LINE}}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """;

        return html
                .replace("{{TITLE}}", escapeHtml(template.title()))
                .replace("{{EYEBROW}}", escapeHtml(template.eyebrow()))
                .replace("{{SUBTITLE}}", escapeHtml(template.title()))
                .replace("{{MESSAGE}}", buildMessageHtml(template.message()))
                .replace("{{HIGHLIGHT_LABEL}}", escapeHtml(highlightLabel))
                .replace("{{HIGHLIGHT_VALUE}}", escapeHtml(highlightValue))
                .replace("{{INFO_TITLE}}", escapeHtml(infoTitle))
                .replace("{{INFO_TEXT}}", escapeHtml(infoText))
                .replace("{{ACTION_URL}}", escapeHtml(actionUrl))
                .replace("{{ACTION_LABEL}}", escapeHtml(hasText(template.actionLabel()) ? template.actionLabel() : "Ouvrir"))
                .replace("{{FOOTER_NOTE}}", escapeHtml(footerNote))
                .replace("{{SECONDARY_NOTE}}", escapeHtml(secondaryNote))
                .replace("{{SUPPORT_LINE}}", escapeHtml(footerNote))
                .replace("{{BRAND_LINE}}", escapeHtml(secondaryNote));
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
        if (hasText(template.actionUrl())) {
            builder.append(template.actionUrl()).append('\n');
        }
        if (hasText(template.footerNote())) {
            builder.append(template.footerNote()).append('\n');
        }
        if (hasText(template.secondaryNote())) {
            builder.append(template.secondaryNote()).append('\n');
        }
        return builder.toString();
    }

    private String buildEmailHtmlV2(EmailTemplate template) {
        String actionUrl = hasText(template.actionUrl()) ? template.actionUrl() : frontendUrl;
        String highlightLabel = hasText(template.highlightLabel()) ? template.highlightLabel() : "Montant total a regler";
        String highlightValue = hasText(template.highlightValue()) ? template.highlightValue() : "-";
        String infoTitle = hasText(template.infoTitle()) ? template.infoTitle() : "Apres le paiement";
        String infoText = hasText(template.infoText()) ? template.infoText() : "Une fois le paiement effectue avec succes, vous recevrez un second email contenant les identifiants de connexion au back office bancaire.";
        String footerNote = hasText(template.footerNote()) ? template.footerNote() : "Paiement securise via Stripe.";
        String secondaryNote = hasText(template.secondaryNote()) ? template.secondaryNote() : "L'equipe Matchia";
        String brandWebsite = resolveBrandWebsite();
        String brandEmail = hasText(mailUsername) ? mailUsername : "contact@matchia.com";
        String brandPhone = "+216 70 123 456";
        String actionLabel = hasText(template.actionLabel()) ? template.actionLabel() : "Proceder au paiement";

        String html = """
                <!doctype html>
                <html lang="fr">
                <head>
                  <meta charset="UTF-8" />
                  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                  <title>{{TITLE}}</title>
                </head>
                <body style="margin:0;padding:0;background:#f4f7ff;font-family:Arial,Helvetica,sans-serif;color:#1e293b;">
                  <div style="max-width:560px;margin:0 auto;padding:14px;">
                    <div style="overflow:hidden;border-radius:16px;background:#ffffff;border:1px solid #e5eaf6;box-shadow:0 20px 48px rgba(15,23,42,.10);">
                      <div style="background:linear-gradient(180deg,#123b89 0%,#173f92 100%);padding:16px 18px;color:#ffffff;display:flex;justify-content:space-between;align-items:center;">
                        <div style="font-size:22px;font-weight:900;letter-spacing:.10em;">MATCHIA</div>
                        <div style="font-size:12px;font-weight:600;opacity:.95;">Banking Marketplaces</div>
                      </div>

                      <div style="padding:28px 26px 22px;text-align:center;position:relative;">
                        <div style="display:inline-flex;align-items:center;justify-content:center;width:74px;height:74px;border-radius:999px;background:#ecf2ff;border:8px solid #c9d8ff;box-sizing:border-box;">
                          <div style="width:42px;height:42px;border-radius:999px;background:#2563eb;color:#ffffff;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;line-height:1;">&#10003;</div>
                        </div>
                        <div style="margin-top:16px;width:62px;height:16px;border-radius:999px;background:#2563eb;display:inline-block;"></div>

                        <div style="margin-top:10px;font-size:30px;line-height:1.1;font-weight:800;color:#111827;">Félicitations !</div>
                        <div style="margin-top:8px;font-size:17px;line-height:1.45;font-weight:700;color:#2563eb;">{{TITLE}}</div>
                      </div>

                      <div style="padding:0 26px 8px;font-size:15px;line-height:1.8;color:#475569;">
                        {{MESSAGE}}
                      </div>

                      <div style="padding:10px 24px 0;">
                        <div style="border-radius:16px;border:1px solid #e4ebff;background:linear-gradient(180deg,#f7fbff 0%,#ffffff 100%);padding:16px 16px 14px;box-shadow:0 10px 26px rgba(37,99,235,.05);">
                          <div style="font-size:13px;font-weight:700;color:#64748b;margin-bottom:4px;">{{HIGHLIGHT_LABEL}}</div>
                          <div style="font-size:26px;line-height:1.1;font-weight:900;color:#2563eb;">{{HIGHLIGHT_VALUE}}</div>
                          <div style="margin-top:4px;font-size:12px;color:#94a3b8;">Paiement securise via Stripe</div>
                        </div>
                      </div>

                      <div style="padding:18px 24px 0;text-align:center;">
                        <a href="{{ACTION_URL}}" style="display:inline-block;min-width:180px;background:linear-gradient(180deg,#2563eb 0%,#1d4ed8 100%);color:#ffffff;text-decoration:none;padding:12px 26px;border-radius:999px;font-size:15px;font-weight:800;box-shadow:0 10px 20px rgba(37,99,235,.24);">
                          {{ACTION_LABEL}}
                        </a>
                      </div>

                      <div style="padding:14px 24px 0;text-align:center;">
                        <div style="display:inline-block;padding:10px 16px;border-radius:12px;border:1px solid #bfd0ff;background:#f8fbff;color:#1e3a8a;font-size:14px;line-height:1.6;text-align:left;max-width:100%;">
                          <div style="font-weight:800;color:#1e293b;margin-bottom:4px;">{{INFO_TITLE}}</div>
                          <div style="color:#475569;">{{INFO_TEXT}}</div>
                        </div>
                      </div>

                      <div style="padding:24px 24px 10px;text-align:center;color:#475569;font-size:14px;line-height:1.7;">
                        <div>{{FOOTER_NOTE}}</div>
                        <div style="margin-top:4px;font-weight:700;color:#2563eb;">{{SECONDARY_NOTE}}</div>
                      </div>

                      <div style="padding:0 18px 18px;">
                        <div style="border-top:1px solid #edf2ff;padding-top:14px;display:flex;gap:8px;justify-content:space-between;font-size:12px;color:#64748b;text-align:center;">
                          <div style="flex:1;">{{BRAND_WEBSITE}}</div>
                          <div style="flex:1;">{{BRAND_EMAIL}}</div>
                          <div style="flex:1;">{{BRAND_PHONE}}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
                """;

        return html
                .replace("{{TITLE}}", escapeHtml(template.title()))
                .replace("{{MESSAGE}}", buildMessageHtml(template.message()))
                .replace("{{HIGHLIGHT_LABEL}}", escapeHtml(highlightLabel))
                .replace("{{HIGHLIGHT_VALUE}}", escapeHtml(highlightValue))
                .replace("{{ACTION_URL}}", escapeHtml(actionUrl))
                .replace("{{ACTION_LABEL}}", escapeHtml(actionLabel))
                .replace("{{INFO_TITLE}}", escapeHtml(infoTitle))
                .replace("{{INFO_TEXT}}", escapeHtml(infoText))
                .replace("{{FOOTER_NOTE}}", escapeHtml(footerNote))
                .replace("{{SECONDARY_NOTE}}", escapeHtml(secondaryNote))
                .replace("{{BRAND_WEBSITE}}", escapeHtml(brandWebsite))
                .replace("{{BRAND_EMAIL}}", escapeHtml(brandEmail))
                .replace("{{BRAND_PHONE}}", escapeHtml(brandPhone));
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

    private String resolveBrandWebsite() {
        if (hasText(frontendUrl)) {
            return frontendUrl
                    .replaceFirst("^https?://", "")
                    .replaceFirst("/+$", "");
        }
        return "www.matchia.com";
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

    private String resolvePaymentRecipient(Request request) {
        if (request != null && request.getRequestType() == org.matchia.matchiabackend.entity.enums.RequestTypeEnum.store) {
            String bankRecipient = resolveBankRecipient(request);
            if (hasText(bankRecipient)) {
                return bankRecipient;
            }
        }
        return resolveContactRecipient(request);
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

