package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.dto.PartnershipContractDtos;
import org.matchia.matchiabackend.entity.DealerBankPartnership;
import org.matchia.matchiabackend.entity.PartnershipContract;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.DealerBankPartnershipRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.PartnershipContractRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Year;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PartnershipContractService {
    public static final String FREE_TERMS = "Le partenariat est gratuit et ne requiert aucun abonnement, frais d'activation ou paiement recurrent. "
            + "Une commission peut uniquement s'appliquer lorsqu'un produit du concessionnaire est achete avec succes via la marketplace de la banque, selon les conditions contractuelles convenues.";
    public static final String DEFAULT_TERMINATION = "Le partenariat peut etre resilie selon les conditions convenues entre la banque et le concessionnaire.";

    private final PartnershipContractRepository contractRepository;
    private final DealerBankPartnershipRepository partnershipRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final DealerSecurityService security;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;

    @Transactional
    public PartnershipContract createDraftForApprovedPartnership(DealerBankPartnership partnership) {
        return contractRepository.findByPartnershipId(partnership.getId()).orElseGet(() -> {
            PartnershipContract contract = baseContract(partnership);
            contract.setStatus(PartnershipContractStatusEnum.DRAFT);
            contract.setStartDate(LocalDate.now());
            contract.setEndDate(LocalDate.now().plusYears(1));
            contract.setContractTerms(FREE_TERMS);
            contract.setTerminationConditions(DEFAULT_TERMINATION);
            PartnershipContract saved = contractRepository.save(contract);
            notifyBank(partnership, "Contrat de partenariat cree",
                    "Le contrat gratuit avec " + partnership.getDealer().getCompanyName() + " est pret a etre configure.",
                    NotificationTypeEnum.INFO, saved.getId());
            audit("dealer.contract.created", saved.getId());
            return saved;
        });
    }

    @Transactional
    public void migrateLegacyApprovedPartnerships() {
        partnershipRepository.findAll().stream()
                .filter(partnership -> partnership.getStatus() == DealerPartnershipStatusEnum.APPROVED)
                .filter(partnership -> contractRepository.findByPartnershipId(partnership.getId()).isEmpty())
                .forEach(partnership -> {
                    PartnershipContract contract = baseContract(partnership);
                    LocalDateTime acceptedAt = partnership.getProcessingDate() == null
                            ? LocalDateTime.now() : partnership.getProcessingDate();
                    contract.setStatus(PartnershipContractStatusEnum.ACTIVE);
                    contract.setStartDate(acceptedAt.toLocalDate());
                    contract.setEndDate(acceptedAt.toLocalDate().plusYears(1));
                    contract.setContractTerms(FREE_TERMS);
                    contract.setTerminationConditions(DEFAULT_TERMINATION);
                    contract.setSentAt(acceptedAt);
                    contract.setDealerAcceptedAt(acceptedAt);
                    contract.setBankAcceptedAt(acceptedAt);
                    contractRepository.save(contract);
                    partnership.setStatus(DealerPartnershipStatusEnum.ACTIVE);
                    partnershipRepository.save(partnership);
                });
    }

    @Transactional
    public PartnershipContractDtos.View prepare(Authentication auth, Long partnershipId,
                                                  PartnershipContractDtos.UpsertRequest input) {
        User user = security.requireBank(auth);
        DealerBankPartnership partnership = ownedPartnership(user, partnershipId);
        if (partnership.getStatus() != DealerPartnershipStatusEnum.WAITING_CONTRACT) {
            throw badRequest("Le contrat peut uniquement etre prepare apres l'approbation de la demande.");
        }
        validateStoreConfiguration(partnership);
        PartnershipContract contract = contractRepository.findByPartnershipId(partnershipId)
                .orElseGet(() -> createDraftForApprovedPartnership(partnership));
        if (contract.getStatus() != PartnershipContractStatusEnum.DRAFT) {
            throw badRequest("Seul un contrat brouillon peut etre modifie.");
        }
        apply(contract, input);
        contract.setRejectionReason(null);
        PartnershipContract saved = contractRepository.save(contract);
        audit("dealer.contract.updated", saved.getId());
        return toView(saved);
    }

    @Transactional(readOnly = true)
    public List<PartnershipContractDtos.View> forBank(Authentication auth) {
        User user = security.requireBank(auth);
        List<PartnershipContract> contracts = user.getRole() == RoleEnum.ADMIN_SAAS
                ? contractRepository.findAll()
                : contractRepository.findByBankIdOrderByCreatedAtDesc(user.getBank().getId());
        return contracts.stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public PartnershipContractDtos.View forBankPartnership(Authentication auth, Long partnershipId) {
        User user = security.requireBank(auth);
        DealerBankPartnership partnership = ownedPartnership(user, partnershipId);
        return contractRepository.findByPartnershipId(partnership.getId()).map(this::toView)
                .orElseThrow(() -> notFound("Contrat introuvable."));
    }

    @Transactional
    public PartnershipContractDtos.View send(Authentication auth, Long contractId) {
        User user = security.requireBank(auth);
        PartnershipContract contract = ownedBankContract(user, contractId);
        if (contract.getStatus() != PartnershipContractStatusEnum.DRAFT) {
            throw badRequest("Seul un contrat brouillon peut etre envoye.");
        }
        validateComplete(contract);
        contract.setStatus(PartnershipContractStatusEnum.PENDING_ACCEPTANCE);
        contract.setSentAt(LocalDateTime.now());
        PartnershipContract saved = contractRepository.save(contract);
        notifyDealer(saved, "Nouveau contrat de partenariat",
                "Le contrat gratuit avec " + saved.getBank().getName() + " est disponible pour validation.",
                NotificationTypeEnum.INFO, true);
        audit("dealer.contract.sent", saved.getId());
        return toView(saved);
    }

    @Transactional(readOnly = true)
    public List<PartnershipContractDtos.View> forDealer(Authentication auth) {
        User user = security.requireDealer(auth);
        return contractRepository.findByDealerIdOrderByCreatedAtDesc(user.getDealer().getId()).stream()
                .map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public PartnershipContractDtos.View forDealer(Authentication auth, Long contractId) {
        User user = security.requireDealer(auth);
        return toView(ownedDealerContract(user, contractId));
    }

    @Transactional
    public PartnershipContractDtos.View acceptByDealer(Authentication auth, Long contractId) {
        User user = security.requireDealer(auth);
        PartnershipContract contract = ownedDealerContract(user, contractId);
        if (contract.getStatus() != PartnershipContractStatusEnum.PENDING_ACCEPTANCE) {
            throw badRequest("Ce contrat n'est pas en attente d'acceptation.");
        }
        if (contract.getDealerAcceptedAt() != null) {
            throw badRequest("Ce contrat a deja ete accepte par le concessionnaire.");
        }
        contract.setDealerAcceptedAt(LocalDateTime.now());
        PartnershipContract saved = contractRepository.save(contract);
        notifyBank(saved.getPartnership(), "Contrat accepte par le concessionnaire",
                saved.getDealer().getCompanyName() + " a accepte le contrat. Votre validation finale est requise.",
                NotificationTypeEnum.SUCCESS, saved.getId());
        audit("dealer.contract.accepted", saved.getId());
        return toView(saved);
    }

    @Transactional
    public PartnershipContractDtos.View rejectByDealer(Authentication auth, Long contractId, String reason) {
        User user = security.requireDealer(auth);
        PartnershipContract contract = ownedDealerContract(user, contractId);
        if (contract.getStatus() != PartnershipContractStatusEnum.PENDING_ACCEPTANCE) {
            throw badRequest("Ce contrat n'est pas en attente d'acceptation.");
        }
        if (reason == null || reason.isBlank()) throw badRequest("Le motif du rejet est obligatoire.");
        contract.setStatus(PartnershipContractStatusEnum.CANCELLED);
        contract.setRejectionReason(reason.trim());
        PartnershipContract saved = contractRepository.save(contract);
        saved.getPartnership().setStatus(DealerPartnershipStatusEnum.REJECTED);
        saved.getPartnership().setRejectionReason(reason.trim());
        partnershipRepository.save(saved.getPartnership());
        notifyBank(saved.getPartnership(), "Contrat refuse",
                saved.getDealer().getCompanyName() + " a refuse le contrat. Motif : " + reason.trim(),
                NotificationTypeEnum.WARNING, saved.getId());
        audit("dealer.contract.rejected", saved.getId());
        return toView(saved);
    }

    @Transactional
    public PartnershipContractDtos.View activate(Authentication auth, Long contractId) {
        User user = security.requireBank(auth);
        PartnershipContract contract = ownedBankContract(user, contractId);
        if (contract.getStatus() != PartnershipContractStatusEnum.PENDING_ACCEPTANCE
                || contract.getDealerAcceptedAt() == null) {
            throw badRequest("Le concessionnaire doit accepter le contrat avant son activation.");
        }
        if (contract.getEndDate().isBefore(LocalDate.now())) throw badRequest("Le contrat est deja expire.");
        contract.setBankAcceptedAt(LocalDateTime.now());
        contract.setStatus(PartnershipContractStatusEnum.ACTIVE);
        PartnershipContract saved = contractRepository.save(contract);
        saved.getPartnership().setStatus(DealerPartnershipStatusEnum.ACTIVE);
        saved.getPartnership().setProcessingDate(LocalDateTime.now());
        partnershipRepository.save(saved.getPartnership());
        notifyDealer(saved, "Partenariat active",
                "Le contrat avec " + saved.getBank().getName() + " est actif. Vous pouvez maintenant soumettre vos produits.",
                NotificationTypeEnum.SUCCESS, true);
        audit("dealer.contract.activated", saved.getId());
        return toView(saved);
    }

    @Transactional
    public PartnershipContractDtos.View terminate(Authentication auth, Long contractId, String reason) {
        User user = security.requireBank(auth);
        PartnershipContract contract = ownedBankContract(user, contractId);
        if (contract.getStatus() != PartnershipContractStatusEnum.ACTIVE) {
            throw badRequest("Seul un contrat actif peut etre resilie.");
        }
        if (reason == null || reason.isBlank()) throw badRequest("Le motif de resiliation est obligatoire.");
        contract.setStatus(PartnershipContractStatusEnum.TERMINATED);
        contract.setRejectionReason(reason.trim());
        PartnershipContract saved = contractRepository.save(contract);
        saved.getPartnership().setStatus(DealerPartnershipStatusEnum.TERMINATED);
        saved.getPartnership().setRejectionReason(reason.trim());
        partnershipRepository.save(saved.getPartnership());
        notifyDealer(saved, "Contrat de partenariat resilie",
                "Le contrat avec " + saved.getBank().getName() + " a ete resilie. Motif : " + reason.trim(),
                NotificationTypeEnum.WARNING, true);
        audit("dealer.contract.terminated", saved.getId());
        return toView(saved);
    }

    @Transactional
    public void expireContracts() {
        contractRepository.findByStatusAndEndDateBefore(PartnershipContractStatusEnum.ACTIVE, LocalDate.now())
                .forEach(contract -> {
                    contract.setStatus(PartnershipContractStatusEnum.EXPIRED);
                    contractRepository.save(contract);
                    contract.getPartnership().setStatus(DealerPartnershipStatusEnum.TERMINATED);
                    partnershipRepository.save(contract.getPartnership());
                    notifyDealer(contract, "Contrat de partenariat expire",
                            "Le contrat avec " + contract.getBank().getName() + " est arrive a expiration.",
                            NotificationTypeEnum.WARNING, false);
                    notifyBank(contract.getPartnership(), "Contrat de partenariat expire",
                            "Le contrat avec " + contract.getDealer().getCompanyName() + " est arrive a expiration.",
                            NotificationTypeEnum.WARNING, contract.getId());
                    audit("dealer.contract.expired", contract.getId());
                });
    }

    @Transactional(readOnly = true)
    public List<PartnershipContractDtos.View> supervise(Authentication auth) {
        security.requireSaas(auth);
        return contractRepository.findAll().stream().map(this::toView).toList();
    }

    public PartnershipContractDtos.View toView(PartnershipContract contract) {
        return new PartnershipContractDtos.View(
                contract.getId(), contract.getContractNumber(), contract.getPartnership().getId(),
                contract.getDealer().getId(), contract.getDealer().getCompanyName(),
                contract.getBank().getId(), contract.getBank().getName(),
                contract.getStore().getId(), contract.getStore().getName(), contract.getStatus(),
                contract.getStartDate(), contract.getEndDate(), contract.getBillingModel(), BigDecimal.ZERO,
                Boolean.TRUE.equals(contract.getCommissionApplicable()), contract.getCommissionType(),
                contract.getCommissionValue(), contract.getContractTerms(), contract.getTerminationConditions(),
                contract.getDealerAcceptedAt(), contract.getBankAcceptedAt(), contract.getSentAt(),
                contract.getRejectionReason(), contract.getCreatedAt(), contract.getUpdatedAt());
    }

    private PartnershipContract baseContract(DealerBankPartnership partnership) {
        PartnershipContract contract = new PartnershipContract();
        contract.setContractNumber("MTC-" + Year.now().getValue() + "-" + partnership.getId() + "-"
                + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        contract.setPartnership(partnership);
        contract.setDealer(partnership.getDealer());
        contract.setBank(partnership.getBank());
        contract.setStore(partnership.getStore());
        contract.setBillingModel(PartnershipBillingModelEnum.FREE);
        contract.setCommissionApplicable(false);
        return contract;
    }

    private void apply(PartnershipContract contract, PartnershipContractDtos.UpsertRequest input) {
        if (!input.endDate().isAfter(input.startDate())) throw badRequest("La date de fin doit etre posterieure a la date de debut.");
        if (input.commissionApplicable()) {
            if (input.commissionType() == null || input.commissionValue() == null) {
                throw badRequest("Le type et la valeur de commission sont obligatoires.");
            }
            if (input.commissionType() == PartnershipCommissionTypeEnum.PERCENTAGE
                    && input.commissionValue().compareTo(BigDecimal.valueOf(100)) > 0) {
                throw badRequest("Le pourcentage de commission ne peut pas depasser 100 %.");
            }
            contract.setCommissionType(input.commissionType());
            contract.setCommissionValue(input.commissionValue());
        } else {
            contract.setCommissionType(null);
            contract.setCommissionValue(null);
        }
        contract.setStartDate(input.startDate());
        contract.setEndDate(input.endDate());
        contract.setCommissionApplicable(input.commissionApplicable());
        contract.setContractTerms(hasText(input.contractTerms()) ? input.contractTerms().trim() : FREE_TERMS);
        contract.setTerminationConditions(hasText(input.terminationConditions())
                ? input.terminationConditions().trim() : DEFAULT_TERMINATION);
        contract.setBillingModel(PartnershipBillingModelEnum.FREE);
    }

    private void validateComplete(PartnershipContract contract) {
        if (contract.getStartDate() == null || contract.getEndDate() == null
                || !contract.getEndDate().isAfter(contract.getStartDate())) {
            throw badRequest("Les dates du contrat sont invalides.");
        }
        if (Boolean.TRUE.equals(contract.getCommissionApplicable())
                && (contract.getCommissionType() == null || contract.getCommissionValue() == null)) {
            throw badRequest("Les conditions de commission sont incompletes.");
        }
    }

    private void validateStoreConfiguration(DealerBankPartnership partnership) {
        marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(
                        partnership.getBank().getId(), partnership.getStore().getId())
                .filter(value -> Boolean.TRUE.equals(value.getEnabled()) && Boolean.TRUE.equals(value.getVisible()))
                .orElseThrow(() -> badRequest("Le store n'est pas actif dans la marketplace de cette banque."));
    }

    private DealerBankPartnership ownedPartnership(User user, Long partnershipId) {
        DealerBankPartnership partnership = partnershipRepository.findById(partnershipId)
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (user.getRole() != RoleEnum.ADMIN_SAAS
                && (user.getBank() == null || !partnership.getBank().getId().equals(user.getBank().getId()))) {
            throw forbidden("Ce partenariat appartient a une autre banque.");
        }
        return partnership;
    }

    private PartnershipContract ownedBankContract(User user, Long contractId) {
        PartnershipContract contract = contractRepository.findDetailedById(contractId)
                .orElseThrow(() -> notFound("Contrat introuvable."));
        if (user.getRole() != RoleEnum.ADMIN_SAAS
                && (user.getBank() == null || !contract.getBank().getId().equals(user.getBank().getId()))) {
            throw forbidden("Ce contrat appartient a une autre banque.");
        }
        return contract;
    }

    private PartnershipContract ownedDealerContract(User user, Long contractId) {
        PartnershipContract contract = contractRepository.findDetailedById(contractId)
                .orElseThrow(() -> notFound("Contrat introuvable."));
        if (!contract.getDealer().getId().equals(user.getDealer().getId())) {
            throw forbidden("Ce contrat appartient a un autre concessionnaire.");
        }
        return contract;
    }

    private void notifyDealer(PartnershipContract contract, String title, String message,
                              NotificationTypeEnum type, boolean sendEmail) {
        userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(contract.getDealer().getId(), RoleEnum.DEALER_ADMIN)
                .ifPresent(admin -> {
                    notificationService.createNotification(title, message, type, NotificationStatusEnum.UNREAD,
                            contract.getId(), admin.getId());
                    if (sendEmail) {
                        emailService.sendDealerEventEmail(admin.getEmail(), title, title, message,
                                null, null, "Modele du partenariat", "FREE - Frais 0 TND");
                    }
                });
    }

    private void notifyBank(DealerBankPartnership partnership, String title, String message,
                            NotificationTypeEnum type, Long referenceId) {
        userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(partnership.getBank().getId(), RoleEnum.ADMIN_BANK)
                .ifPresent(admin -> notificationService.createNotification(title, message, type,
                        NotificationStatusEnum.UNREAD, referenceId, admin.getId()));
    }

    private void audit(String action, Long id) {
        AuditLogRequest log = new AuditLogRequest();
        log.setAction(action);
        log.setCategory(AuditCategoryEnum.data_config);
        log.setResourceType("partnership_contract");
        log.setResourceId(String.valueOf(id));
        log.setStatus(AuditStatusEnum.success);
        log.setSource("dealer-contracts");
        auditLogger.logAsync(log);
    }

    private boolean hasText(String value) { return value != null && !value.isBlank(); }
    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }
    private ResponseStatusException forbidden(String message) { return new ResponseStatusException(HttpStatus.FORBIDDEN, message); }
}
