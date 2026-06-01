package org.matchia.matchiabackend.service;

import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.Request;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class EmailService {

    public boolean sendPaymentInstructions(Request request, String paymentLink) {
        log.info("=========================================================================");
        log.info("ENVOI D'EMAIL SIMULE - ADHESION MATCHIA");
        log.info("=========================================================================");
        log.info("Destinataire (Admin Banque) : {}", request.getContactEmail());
        log.info("Destinataire Institution (Banque) : {}", request.getBankEmail());
        log.info("Sujet : Felicitations ! Votre demande d'adhesion a Matchia a ete approuvee !");
        log.info("-------------------------------------------------------------------------");
        log.info("Bonjour {},", request.getContactName());
        log.info("La demande d'adhesion pour la banque '{}' a ete approuvee.", request.getBankName());
        log.info("Montant total a regler : {} TND / mois", request.getTotalAmount());
        log.info("Lien de paiement : {}", paymentLink);
        log.info("-------------------------------------------------------------------------");
        log.info("Une fois le paiement effectue, votre espace d'administration de banque sera automatiquement cree.");
        log.info("L'equipe Matchia");
        log.info("=========================================================================");
        return true;
    }
}
