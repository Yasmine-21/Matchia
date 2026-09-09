package org.matchia.matchiabackend.service;

import org.matchia.matchiabackend.entity.PartnershipContract;
import org.springframework.stereotype.Component;

import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/** The only source for the standard legal structure and its dynamic placeholders. */
@Component
public class PartnershipContractTemplate {
    public static final String VERSION = "PARTNERSHIP-V1";
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    public record Rendered(String html, String text) {}

    public Rendered render(PartnershipContract contract) {
        Map<String, String> values = placeholders(contract);
        String template = """
                <!doctype html><html lang=\"fr\"><head><meta charset=\"utf-8\"><style>
                @page{size:A4;margin:20mm}body{font-family:Arial,sans-serif;color:#172033;font-size:11pt;line-height:1.55}
                .brand{color:#0b5cab;font-weight:700;letter-spacing:2px}.header{border-bottom:3px solid #0b5cab;padding-bottom:14px;margin-bottom:24px}
                h1{font-size:22pt;text-align:center;margin:8px 0;color:#0b3b70}h2{font-size:13pt;color:#0b3b70;border-bottom:1px solid #dce7f3;padding-bottom:5px;margin-top:23px}
                .meta{display:flex;justify-content:space-between;color:#536174;font-size:9.5pt}.parties{display:flex;gap:18px}.party{width:50%;background:#f5f8fc;border-left:4px solid #0b5cab;padding:12px}
                .label{font-size:8.5pt;color:#536174;text-transform:uppercase;letter-spacing:1px}.signature{display:flex;gap:26px;margin-top:28px}.signature>div{width:50%;border-top:1px solid #8ba2ba;padding-top:10px;min-height:80px}
                ul{padding-left:22px} .footer{margin-top:30px;color:#667085;font-size:9pt;text-align:center} strong{color:#0b3b70}</style></head><body>
                <div class=\"header\"><div class=\"brand\">MATCHIA</div><h1>CONTRAT DE PARTENARIAT</h1><div class=\"meta\"><span>Référence : <strong>{{contractReference}}</strong></span><span>Date : {{contractDate}}</span></div></div>
                <div class=\"parties\"><section class=\"party\"><div class=\"label\">La Banque</div><strong>{{bankName}}</strong><br/>Représentée par : {{bankRepresentativeName}}<br/>Marketplace : {{marketplaceName}}</section>
                <section class=\"party\"><div class=\"label\">Le Concessionnaire</div><strong>{{dealerName}}</strong><br/>Représenté par : {{dealerRepresentativeName}}<br/>Store : {{storeName}}</section></div>
                <p>Ci-après dénommés ensemble <strong>« les Parties »</strong>.</p>
                <h2>Article 1 — Objet de l'accord</h2><p>Le présent accord définit les conditions du partenariat entre <strong>{{bankName}}</strong> et <strong>{{dealerName}}</strong> au sein de la marketplace <strong>{{marketplaceName}}</strong>. Le Concessionnaire est autorisé à publier les produits éligibles selon les présentes conditions.</p>
                <h2>Article 2 — Périmètre du partenariat</h2><p>Le partenariat concerne le Store <strong>{{storeName}}</strong>. Le Concessionnaire peut y publier et gérer les produits éligibles conformément aux règles Matchia et aux conditions de la Banque.</p><p><strong>Détails du partenariat :</strong><br/>{{partnershipDetails}}</p>
                <h2>Article 3 — Prise d'effet et durée</h2><p>Le partenariat commence le <strong>{{startDate}}</strong>. Durée : <strong>{{contractDuration}}</strong>. Échéance : <strong>{{endDate}}</strong>.</p>
                <h2>Article 4 — Obligations du Concessionnaire</h2><ul><li>Fournir des informations, prix et stocks exacts.</li><li>Maintenir les documents produit requis à jour.</li><li>Respecter les règles de publication de la marketplace et les exigences applicables.</li></ul>
                <h2>Article 5 — Obligations de la Banque</h2><ul><li>Fournir l'accès à la marketplace selon le partenariat.</li><li>Rendre visibles les produits approuvés aux utilisateurs éligibles.</li><li>Traiter les demandes de financement selon ses règles internes et préserver la confidentialité.</li></ul>
                <h2>Article 6 — Publication des produits</h2><p>Les produits créés par le Concessionnaire peuvent être publiés selon le workflow Matchia existant. Seuls les produits autorisés dans ce périmètre peuvent être publiés. Le Concessionnaire reste responsable de leurs informations, images, documents, disponibilité et stocks.</p>
                <h2>Article 7 — Demandes de financement</h2><p>Chaque demande est traitée par la Banque concernée, qui reste responsable de son acceptation ou de son refus. Le Concessionnaire dispose d'une visibilité en lecture seule conformément aux permissions Matchia. Les règles de stock existantes s'appliquent après acceptation.</p>
                <h2>Article 8 — Conditions financières</h2><p>Commission : <strong>2 %</strong>.</p>
                <h2>Article 9 — Confidentialité</h2><p>Chaque Partie protège les informations confidentielles obtenues dans le cadre du partenariat et ne les divulgue pas à des tiers non autorisés.</p>
                <h2>Article 10 — Résiliation</h2><p>Le partenariat peut être résilié conformément aux conditions convenues entre les Parties.</p><p><strong>Conditions de résiliation :</strong><br/>{{terminationConditions}}</p>
                <div class=\"signature\"><div><strong>Banque — {{bankName}}</strong><br/>Représentant : {{bankRepresentativeName}}<br/>Date : {{bankSignatureDate}}<br/>Signature : {{bankSignature}}</div><div><strong>Concessionnaire — {{dealerName}}</strong><br/>Représentant : {{dealerRepresentativeName}}<br/>Date : {{dealerSignatureDate}}<br/>Signature : {{dealerSignature}}</div></div>
                <div class=\"footer\">Document généré par Matchia · {{contractReference}} · Version {{contractVersion}}</div></body></html>
                """;
        String html = replace(template, values, true);
        return new Rendered(html, toPlainText(html));
    }

    private Map<String, String> placeholders(PartnershipContract c) {
        String start = date(c.getStartDate()); String end = date(c.getEndDate());
        long days = c.getStartDate() == null || c.getEndDate() == null ? 0 : java.time.temporal.ChronoUnit.DAYS.between(c.getStartDate(), c.getEndDate());
        Map<String, String> v = new LinkedHashMap<>();
        v.put("contractReference", value(c.getContractNumber())); v.put("contractDate", date(c.getCreatedAt() == null ? null : c.getCreatedAt().toLocalDate()));
        v.put("contractVersion", String.valueOf(c.getVersionNumber())); v.put("bankName", value(c.getBank().getName()));
        v.put("bankRepresentativeName", "Administration " + value(c.getBank().getName()));
        v.put("dealerName", value(c.getDealer().getCompanyName())); v.put("dealerRepresentativeName", value(c.getDealer().getContactPerson()));
        v.put("marketplaceName", value(c.getBank().getSlug(), "Marketplace " + value(c.getBank().getName())));
        v.put("storeName", value(c.getStore().getName()));
        v.put("startDate", start); v.put("endDate", end); v.put("contractDuration", days > 0 ? days + " jours" : "Durée indéterminée");
        v.put("partnershipDetails", value(c.getPartnership().getMessage(), "Publication de produits éligibles dans le Store concerné."));
        v.put("terminationConditions", value(c.getTerminationConditions(), PartnershipContractService.DEFAULT_TERMINATION));
        v.put("bankSignatureDate", date(c.getBankAcceptedAt() == null ? null : c.getBankAcceptedAt().toLocalDate())); v.put("dealerSignatureDate", date(c.getDealerAcceptedAt() == null ? null : c.getDealerAcceptedAt().toLocalDate()));
        v.put("bankSignature", c.getBankAcceptedAt() == null ? "En attente d'acceptation" : "Accepté électroniquement"); v.put("dealerSignature", c.getDealerAcceptedAt() == null ? "En attente d'acceptation" : "Accepté électroniquement");
        return v;
    }

    private String replace(String template, Map<String, String> values, boolean html) { for (var e : values.entrySet()) template = template.replace("{{" + e.getKey() + "}}", html ? escape(e.getValue()).replace("\n", "<br/>") : e.getValue()); return template; }
    private String toPlainText(String html) {
        return html
                .replaceAll("(?is)<style[^>]*>.*?</style>", "")
                .replaceAll("(?i)</span>", "\n")
                .replaceAll("(?i)<br\\s*/?>", "\n")
                .replaceAll("(?i)<li[^>]*>", "- ")
                .replaceAll("(?i)</(h1|h2|p|li|div|section|ul)>", "\n")
                .replaceAll("(?is)<[^>]+>", "")
                .replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">")
                .replace("&quot;", "\"").replace("&#39;", "'")
                .replaceAll("[ \\t]+\\n", "\n")
                .replaceAll("\\n{3,}", "\n\n")
                .trim();
    }
    private String escape(String value) { return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;"); }
    private String date(java.time.LocalDate value) { return value == null ? "Non défini" : DATE.format(value); }
    private boolean empty(String value) { return value == null || value.isBlank(); }
    private String value(String value) { return value(value, "Non renseigné"); }
    private String value(String value, String fallback) { return empty(value) ? fallback : value.trim(); }
}
