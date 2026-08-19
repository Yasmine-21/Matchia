package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.*;
import org.matchia.matchiabackend.entity.enums.*;
import org.matchia.matchiabackend.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DealerPartnershipService {
    private final DealerBankPartnershipRepository repository;
    private final DealerRepository dealerRepository;
    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final DealerSecurityService security;
    private final DealerAccountService accountService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;
    private final PartnershipContractService contractService;

    private static final List<DealerPartnershipStatusEnum> BLOCKING_STATUSES = List.of(
            DealerPartnershipStatusEnum.PENDING,
            DealerPartnershipStatusEnum.APPROVED,
            DealerPartnershipStatusEnum.WAITING_CONTRACT,
            DealerPartnershipStatusEnum.ACTIVE,
            DealerPartnershipStatusEnum.SUSPENDED);

    @Transactional(readOnly = true)
    public List<DealerDtos.BankOption> availableBanks(Authentication auth) {
        User user = security.requireDealer(auth);
        Long dealerId = user.getDealer().getId();
        Long dealerStoreId = user.getDealer().getStore().getId();
        return marketplaceRepository.findAll().stream()
                .filter(marketplace -> marketplace.getStatus() == MarketplaceStatusEnum.active)
                .filter(marketplace -> marketplace.getBank() != null && marketplace.getBank().getStatus() == BankStatusEnum.active)
                .map(marketplace -> new DealerDtos.BankOption(
                    marketplace.getBank().getId(), marketplace.getBank().getName(), marketplace.getBank().getLogoUrl(),
                        marketplace.getId(), marketplace.getBank().getSlug(), marketplace.getMarketplaceStores().stream()
                                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible()))
                                .filter(ms -> ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                                .filter(ms -> dealerStoreId.equals(ms.getStore().getId()))
                                .map(ms -> new DealerDtos.StoreOption(ms.getStore().getId(), ms.getStore().getName(), ms.getStore().getDescription()))
                                .toList()))
                .filter(option -> !option.stores().isEmpty())
                .filter(option -> !repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                        dealerId, option.bankId(), dealerStoreId,
                        BLOCKING_STATUSES))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.StoreOption> availableStoresForBank(Authentication auth) {
        return availableStoresForBank(auth, null);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.StoreOption> availableStoresForBank(Authentication auth, String tenantBankSlug) {
        User user = security.requireBank(auth);
        Bank bank = resolveBankContext(user, tenantBankSlug);
        return marketplaceRepository.findByBankId(bank.getId())
                .map(marketplace -> marketplace.getMarketplaceStores().stream()
                        .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible()))
                        .filter(ms -> ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                        .map(ms -> new DealerDtos.StoreOption(
                                ms.getStore().getId(), ms.getStore().getName(), ms.getStore().getDescription()))
                        .sorted((left, right) -> left.storeName().compareToIgnoreCase(right.storeName()))
                        .toList())
                .orElseGet(List::of);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.DealerView> dealersByStore(Authentication auth, String tenantBankSlug, Long storeId) {
        User user = security.requireBank(auth);
        Bank bank = resolveBankContext(user, tenantBankSlug);
        marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(bank.getId(), storeId)
                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible()))
                .filter(ms -> ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                .orElseThrow(() -> badRequest("Ce store n'est pas actif dans votre marketplace."));

        return dealerRepository.findByStore_IdAndStatusOrderByCompanyNameAsc(storeId, DealerStatusEnum.ACTIVE).stream()
                .filter(dealer -> !repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                        dealer.getId(), bank.getId(), storeId, BLOCKING_STATUSES))
                .map(accountService::toDealerView)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.DealerView> availableDealers(Authentication auth, Long storeId) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            return List.of();
        }
        Long bankId = user.getBank().getId();
        if (storeId != null && availableStoresForBank(auth).stream().noneMatch(store -> store.storeId().equals(storeId))) {
            throw badRequest("Ce store n'est pas actif dans votre marketplace.");
        }
        return dealerRepository.findByStatusOrderByCompanyNameAsc(DealerStatusEnum.ACTIVE).stream()
                .filter(dealer -> dealer.getStore() != null && dealer.getStore().getStatus() == StoreStatusEnum.active)
                .filter(dealer -> storeId == null || dealer.getStore().getId().equals(storeId))
                .filter(dealer -> marketplaceStoreRepository.findByMarketplace_Bank_IdAndStore_Id(
                                bankId, dealer.getStore().getId())
                        .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible())
                                && ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                        .isPresent())
                .filter(dealer -> !repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                        dealer.getId(), bankId, dealer.getStore().getId(), BLOCKING_STATUSES))
                .map(accountService::toDealerView)
                .toList();
    }

    @Transactional
    public DealerDtos.PartnershipView create(Authentication auth, DealerDtos.PartnershipCreate input) {
        User user = security.requireDealer(auth);
        Dealer dealer = user.getDealer();
        Bank bank = bankRepository.findById(input.bankId()).orElseThrow(() -> notFound("Banque introuvable."));
        if (bank.getStatus() != BankStatusEnum.active) throw badRequest("La banque selectionnee est inactive.");
        MarketplaceStore marketplaceStore = marketplaceStoreRepository
                .findByMarketplace_Bank_IdAndStore_Id(bank.getId(), input.storeId())
                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible())
                        && ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                .orElseThrow(() -> badRequest("Ce store n'est pas actif pour cette banque."));
        if (!dealer.getStore().getId().equals(input.storeId())) {
            throw badRequest("Le partenariat doit correspondre a la categorie du concessionnaire.");
        }
        if (repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(dealer.getId(), bank.getId(), input.storeId(),
                BLOCKING_STATUSES)) {
            throw badRequest("Un partenariat actif ou en attente existe deja pour cette banque et ce store.");
        }
        DealerBankPartnership partnership = repository.findByDealerIdAndBankIdAndStoreId(dealer.getId(), bank.getId(), input.storeId())
                .orElseGet(DealerBankPartnership::new);
        partnership.setDealer(dealer); partnership.setBank(bank); partnership.setStore(marketplaceStore.getStore());
        partnership.setMessage(input.message()); partnership.setRejectionReason(null);
        partnership.setInitiatedBy(PartnershipInitiatorEnum.DEALER);
        partnership.setStatus(DealerPartnershipStatusEnum.PENDING); partnership.setProcessingDate(null);
        partnership.setApprovedAt(null); partnership.setRejectedAt(null);
        partnership = repository.save(partnership);
        DealerBankPartnership savedPartnership = partnership;
        userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(bank.getId(), RoleEnum.ADMIN_BANK)
                .ifPresent(bankAdmin -> notificationService.createNotification("Nouvelle demande de partenariat",
                        dealer.getCompanyName() + " demande un partenariat pour le store " + savedPartnership.getStore().getName() + ".",
                        NotificationTypeEnum.INFO, NotificationStatusEnum.UNREAD, savedPartnership.getId(), bankAdmin.getId()));
        audit("dealer.partnership.submitted", partnership.getId(), AuditStatusEnum.success);
        return toView(partnership);
    }

    @Transactional
    public DealerDtos.PartnershipView createByBank(Authentication auth, DealerDtos.BankPartnershipCreate input) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            throw badRequest("Une invitation doit etre envoyee depuis le back-office d'une banque.");
        }
        Bank bank = user.getBank();
        Dealer dealer = dealerRepository.findById(input.dealerId())
                .filter(value -> value.getStatus() == DealerStatusEnum.ACTIVE)
                .orElseThrow(() -> notFound("Concessionnaire actif introuvable."));
        if (!dealer.getStore().getId().equals(input.storeId())) {
            throw badRequest("Le store selectionne n'est pas compatible avec le concessionnaire.");
        }
        MarketplaceStore marketplaceStore = marketplaceStoreRepository
                .findByMarketplace_Bank_IdAndStore_Id(bank.getId(), input.storeId())
                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible())
                        && ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                .orElseThrow(() -> badRequest("Ce store n'est pas actif dans votre marketplace."));
        if (repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                dealer.getId(), bank.getId(), input.storeId(), BLOCKING_STATUSES)) {
            throw badRequest("Une demande de partenariat existe deja entre ce concessionnaire et cette banque pour le store selectionne.");
        }
        DealerBankPartnership partnership = repository
                .findByDealerIdAndBankIdAndStoreId(dealer.getId(), bank.getId(), input.storeId())
                .orElseGet(DealerBankPartnership::new);
        partnership.setDealer(dealer); partnership.setBank(bank); partnership.setStore(marketplaceStore.getStore());
        partnership.setInitiatedBy(PartnershipInitiatorEnum.BANK); partnership.setStatus(DealerPartnershipStatusEnum.PENDING);
        partnership.setMessage(input.message()); partnership.setRejectionReason(null); partnership.setProcessingDate(null);
        partnership.setApprovedAt(null); partnership.setRejectedAt(null);
        partnership = repository.save(partnership);
        User dealerAdmin = userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(dealer.getId(), RoleEnum.DEALER_ADMIN).orElse(null);
        if (dealerAdmin != null) {
            String message = bank.getName() + " vous invite a etablir un partenariat pour le store " + partnership.getStore().getName() + ".";
            notificationService.createNotification("Invitation de partenariat", message, NotificationTypeEnum.INFO,
                    NotificationStatusEnum.UNREAD, partnership.getId(), dealerAdmin.getId());
            emailService.sendDealerEventEmail(dealerAdmin.getEmail(), "Invitation de partenariat Matchia",
                    "Nouvelle invitation", message, null, null, "Store", partnership.getStore().getName());
        }
        audit("dealer.partnership.invited", partnership.getId(), AuditStatusEnum.success);
        return toView(partnership);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> mine(Authentication auth) {
        User user = security.requireDealer(auth);
        return repository.findByDealerIdOrderByRequestDateDesc(user.getDealer().getId()).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> sentByDealer(Authentication auth) {
        return mine(auth).stream()
                .filter(item -> item.initiatedBy() == PartnershipInitiatorEnum.DEALER)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> receivedByDealer(Authentication auth) {
        return mine(auth).stream()
                .filter(item -> item.initiatedBy() == PartnershipInitiatorEnum.BANK)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> activeForDealer(Authentication auth) {
        return mine(auth).stream()
                .filter(item -> item.status() == DealerPartnershipStatusEnum.ACTIVE)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> forBank(Authentication auth) {
        return forBank(auth, null);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> forBank(Authentication auth, String tenantBankSlug) {
        User user = security.requireBank(auth);
        Long bankId;
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            if (tenantBankSlug == null || tenantBankSlug.isBlank()) {
                throw badRequest("Le tenant bancaire est obligatoire pour consulter les partenariats.");
            }
            bankId = bankRepository.findBySlug(tenantBankSlug.trim())
                    .orElseThrow(() -> notFound("Banque du tenant introuvable."))
                    .getId();
        } else {
            bankId = user.getBank().getId();
        }
        return repository.findByBankIdOrderByRequestDateDesc(bankId).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> sentByBank(Authentication auth) {
        return sentByBank(auth, null);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> sentByBank(Authentication auth, String tenantBankSlug) {
        return forBank(auth, tenantBankSlug).stream()
                .filter(item -> item.initiatedBy() == PartnershipInitiatorEnum.BANK)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> receivedByBank(Authentication auth) {
        return receivedByBank(auth, null);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> receivedByBank(Authentication auth, String tenantBankSlug) {
        return forBank(auth, tenantBankSlug).stream()
                .filter(item -> item.initiatedBy() == PartnershipInitiatorEnum.DEALER)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> activeForBank(Authentication auth) {
        return activeForBank(auth, null);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> activeForBank(Authentication auth, String tenantBankSlug) {
        return forBank(auth, tenantBankSlug).stream()
                .filter(item -> item.status() == DealerPartnershipStatusEnum.ACTIVE)
                .toList();
    }

    private Bank resolveBankContext(User user, String tenantBankSlug) {
        if (user.getRole() != RoleEnum.ADMIN_SAAS) {
            return user.getBank();
        }
        if (tenantBankSlug == null || tenantBankSlug.isBlank()) {
            throw badRequest("Le tenant bancaire est obligatoire.");
        }
        return bankRepository.findBySlug(tenantBankSlug.trim())
                .orElseThrow(() -> notFound("Banque du tenant introuvable."));
    }

    @Transactional
    public DealerDtos.PartnershipView decide(Authentication auth, Long id, DealerPartnershipStatusEnum status, String reason) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seule la banque destinataire peut traiter cette demande de partenariat.");
        }
        DealerBankPartnership partnership = repository.findById(id).orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getBank().getId().equals(user.getBank().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce partenariat appartient a une autre banque.");
        }
        if (partnership.getStatus() != DealerPartnershipStatusEnum.PENDING) {
            throw badRequest("Seule une demande en attente peut etre approuvee ou rejetee.");
        }
        if (effectiveInitiator(partnership) != PartnershipInitiatorEnum.DEALER) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "La banque ne peut pas traiter une invitation qu'elle a elle-meme envoyee.");
        }
        return completeDecision(partnership, status, reason);
    }

    @Transactional
    public DealerDtos.PartnershipView decideByDealer(Authentication auth, Long id,
                                                       DealerPartnershipStatusEnum status, String reason) {
        User user = security.requireDealer(auth);
        DealerBankPartnership partnership = repository.findById(id)
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getDealer().getId().equals(user.getDealer().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Cette invitation appartient a un autre concessionnaire.");
        }
        if (partnership.getStatus() != DealerPartnershipStatusEnum.PENDING) {
            throw badRequest("Seule une invitation en attente peut etre approuvee ou rejetee.");
        }
        if (effectiveInitiator(partnership) != PartnershipInitiatorEnum.BANK) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Le concessionnaire ne peut pas traiter une demande qu'il a lui-meme envoyee.");
        }
        return completeDecision(partnership, status, reason);
    }

    @Transactional
    public DealerDtos.PartnershipView cancelByBank(Authentication auth, Long id) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            throw badRequest("L'annulation doit etre effectuee depuis le back-office de la banque emettrice.");
        }
        DealerBankPartnership partnership = repository.findById(id)
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getBank().getId().equals(user.getBank().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette invitation appartient a une autre banque.");
        }
        if (effectiveInitiator(partnership) != PartnershipInitiatorEnum.BANK
                || partnership.getStatus() != DealerPartnershipStatusEnum.PENDING) {
            throw badRequest("Seule une invitation bancaire en attente peut etre annulee.");
        }
        partnership.setStatus(DealerPartnershipStatusEnum.TERMINATED);
        partnership.setProcessingDate(LocalDateTime.now());
        DealerBankPartnership saved = repository.save(partnership);
        notifyDealer(saved, "Invitation annulee",
                saved.getBank().getName() + " a annule son invitation de partenariat.", NotificationTypeEnum.WARNING);
        audit("dealer.partnership.cancelled", saved.getId(), AuditStatusEnum.success);
        return toView(saved);
    }

    @Transactional
    public DealerDtos.PartnershipView cancelByDealer(Authentication auth, Long id) {
        User user = security.requireDealer(auth);
        DealerBankPartnership partnership = repository.findById(id)
                .orElseThrow(() -> notFound("Partenariat introuvable."));
        if (!partnership.getDealer().getId().equals(user.getDealer().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette demande appartient a un autre concessionnaire.");
        }
        if (effectiveInitiator(partnership) != PartnershipInitiatorEnum.DEALER
                || partnership.getStatus() != DealerPartnershipStatusEnum.PENDING) {
            throw badRequest("Seule une demande concessionnaire en attente peut etre annulee.");
        }
        partnership.setStatus(DealerPartnershipStatusEnum.TERMINATED);
        partnership.setProcessingDate(LocalDateTime.now());
        DealerBankPartnership saved = repository.save(partnership);
        notifyBank(saved, "Demande annulee",
                saved.getDealer().getCompanyName() + " a annule sa demande de partenariat.", NotificationTypeEnum.WARNING);
        audit("dealer.partnership.cancelled", saved.getId(), AuditStatusEnum.success);
        return toView(saved);
    }

    public DealerDtos.PartnershipView toView(DealerBankPartnership partnership) {
        return new DealerDtos.PartnershipView(partnership.getId(), accountService.toDealerView(partnership.getDealer()),
                partnership.getBank().getId(), partnership.getBank().getName(), partnership.getBank().getLogoUrl(),
                partnership.getStore().getId(),
                partnership.getStore().getName(), effectiveInitiator(partnership), partnership.getStatus(),
                partnership.getMessage(), partnership.getRejectionReason(), partnership.getRequestDate(),
                partnership.getProcessingDate(), partnership.getApprovedAt(), partnership.getRejectedAt());
    }

    private DealerDtos.PartnershipView completeDecision(DealerBankPartnership partnership,
                                                          DealerPartnershipStatusEnum decision, String reason) {
        if (!List.of(DealerPartnershipStatusEnum.APPROVED, DealerPartnershipStatusEnum.REJECTED).contains(decision)) {
            throw badRequest("Statut de decision invalide.");
        }
        if (decision == DealerPartnershipStatusEnum.REJECTED && (reason == null || reason.isBlank())) {
            throw badRequest("Le motif de rejet est obligatoire.");
        }
        LocalDateTime now = LocalDateTime.now();
        partnership.setProcessingDate(now);
        if (decision == DealerPartnershipStatusEnum.REJECTED) {
            partnership.setStatus(DealerPartnershipStatusEnum.REJECTED);
            partnership.setRejectionReason(reason.trim());
            partnership.setRejectedAt(now);
            partnership.setApprovedAt(null);
        } else {
            partnership.setStatus(DealerPartnershipStatusEnum.WAITING_CONTRACT);
            partnership.setRejectionReason(null);
            partnership.setApprovedAt(now);
            partnership.setRejectedAt(null);
        }
        DealerBankPartnership saved = repository.save(partnership);
        if (decision == DealerPartnershipStatusEnum.APPROVED) {
            contractService.createDraftForApprovedPartnership(saved);
        }
        if (effectiveInitiator(saved) == PartnershipInitiatorEnum.DEALER) {
            String message = decision == DealerPartnershipStatusEnum.APPROVED
                    ? "Votre demande avec " + saved.getBank().getName() + " a ete acceptee. Le contrat est en preparation."
                    : "Votre demande avec " + saved.getBank().getName() + " a ete rejetee. Motif : " + reason.trim();
            notifyDealer(saved, "Mise a jour du partenariat", message,
                    decision == DealerPartnershipStatusEnum.APPROVED ? NotificationTypeEnum.SUCCESS : NotificationTypeEnum.WARNING);
        } else {
            String message = decision == DealerPartnershipStatusEnum.APPROVED
                    ? saved.getDealer().getCompanyName() + " a accepte votre invitation. Le contrat peut etre prepare."
                    : saved.getDealer().getCompanyName() + " a rejete votre invitation. Motif : " + reason.trim();
            notifyBank(saved, "Mise a jour du partenariat", message,
                    decision == DealerPartnershipStatusEnum.APPROVED ? NotificationTypeEnum.SUCCESS : NotificationTypeEnum.WARNING);
        }
        audit("dealer.partnership." + decision.name().toLowerCase(), saved.getId(), AuditStatusEnum.success);
        return toView(saved);
    }

    private PartnershipInitiatorEnum effectiveInitiator(DealerBankPartnership partnership) {
        return partnership.getInitiatedBy() == null ? PartnershipInitiatorEnum.DEALER : partnership.getInitiatedBy();
    }

    private void notifyDealer(DealerBankPartnership partnership, String title, String message, NotificationTypeEnum type) {
        userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(partnership.getDealer().getId(), RoleEnum.DEALER_ADMIN)
                .ifPresent(admin -> {
                    notificationService.createNotification(title, message, type, NotificationStatusEnum.UNREAD,
                            partnership.getId(), admin.getId());
                    emailService.sendDealerEventEmail(admin.getEmail(), title + " - Matchia", title, message,
                            null, null, "Store", partnership.getStore().getName());
                });
    }

    private void notifyBank(DealerBankPartnership partnership, String title, String message, NotificationTypeEnum type) {
        userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(partnership.getBank().getId(), RoleEnum.ADMIN_BANK)
                .ifPresent(admin -> {
                    notificationService.createNotification(title, message, type, NotificationStatusEnum.UNREAD,
                            partnership.getId(), admin.getId());
                    emailService.sendDealerEventEmail(admin.getEmail(), title + " - Matchia", title, message,
                            null, null, "Store", partnership.getStore().getName());
                });
    }

    private ResponseStatusException badRequest(String message) { return new ResponseStatusException(HttpStatus.BAD_REQUEST, message); }
    private ResponseStatusException notFound(String message) { return new ResponseStatusException(HttpStatus.NOT_FOUND, message); }

    private void audit(String action, Long id, AuditStatusEnum status) {
        AuditLogRequest log = new AuditLogRequest();
        log.setAction(action); log.setCategory(AuditCategoryEnum.data_config); log.setResourceType("dealer_partnership");
        log.setResourceId(String.valueOf(id)); log.setStatus(status); log.setSource("dealer-management");
        auditLogger.logAsync(log);
    }
}
