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
    private final BankRepository bankRepository;
    private final MarketplaceRepository marketplaceRepository;
    private final MarketplaceStoreRepository marketplaceStoreRepository;
    private final DealerSecurityService security;
    private final DealerAccountService accountService;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final EmailService emailService;
    private final AuditLogger auditLogger;

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
                        marketplace.getId(), marketplace.getMarketplaceStores().stream()
                                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible()))
                                .filter(ms -> ms.getStore() != null && ms.getStore().getStatus() == StoreStatusEnum.active)
                                .filter(ms -> dealerStoreId.equals(ms.getStore().getId()))
                                .map(ms -> new DealerDtos.StoreOption(ms.getStore().getId(), ms.getStore().getName(), ms.getStore().getDescription()))
                                .toList()))
                .filter(option -> !option.stores().isEmpty())
                .filter(option -> !repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(
                        dealerId, option.bankId(), dealerStoreId,
                        List.of(DealerPartnershipStatusEnum.PENDING, DealerPartnershipStatusEnum.APPROVED,
                                DealerPartnershipStatusEnum.SUSPENDED)))
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
                .filter(ms -> Boolean.TRUE.equals(ms.getEnabled()) && Boolean.TRUE.equals(ms.getVisible()))
                .orElseThrow(() -> badRequest("Ce store n'est pas actif pour cette banque."));
        if (!dealer.getStore().getId().equals(input.storeId())) {
            throw badRequest("Le partenariat doit correspondre a la categorie du concessionnaire.");
        }
        if (repository.existsByDealerIdAndBankIdAndStoreIdAndStatusIn(dealer.getId(), bank.getId(), input.storeId(),
                List.of(DealerPartnershipStatusEnum.PENDING, DealerPartnershipStatusEnum.APPROVED, DealerPartnershipStatusEnum.SUSPENDED))) {
            throw badRequest("Un partenariat actif ou en attente existe deja pour cette banque et ce store.");
        }
        DealerBankPartnership partnership = repository.findByDealerIdAndBankIdAndStoreId(dealer.getId(), bank.getId(), input.storeId())
                .orElseGet(DealerBankPartnership::new);
        partnership.setDealer(dealer); partnership.setBank(bank); partnership.setStore(marketplaceStore.getStore());
        partnership.setMessage(input.message()); partnership.setRejectionReason(null);
        partnership.setStatus(DealerPartnershipStatusEnum.PENDING); partnership.setProcessingDate(null);
        partnership = repository.save(partnership);
        DealerBankPartnership savedPartnership = partnership;
        userRepository.findFirstByBank_IdAndRoleOrderByCreatedAtAsc(bank.getId(), RoleEnum.ADMIN_BANK)
                .ifPresent(bankAdmin -> notificationService.createNotification("Nouvelle demande de partenariat",
                        dealer.getCompanyName() + " demande un partenariat pour le store " + savedPartnership.getStore().getName() + ".",
                        NotificationTypeEnum.INFO, NotificationStatusEnum.UNREAD, savedPartnership.getId(), bankAdmin.getId()));
        audit("dealer.partnership.submitted", partnership.getId(), AuditStatusEnum.success);
        return toView(partnership);
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> mine(Authentication auth) {
        User user = security.requireDealer(auth);
        return repository.findByDealerIdOrderByRequestDateDesc(user.getDealer().getId()).stream().map(this::toView).toList();
    }

    @Transactional(readOnly = true)
    public List<DealerDtos.PartnershipView> forBank(Authentication auth) {
        User user = security.requireBank(auth);
        if (user.getRole() == RoleEnum.ADMIN_SAAS) {
            return repository.findAll().stream().map(this::toView).toList();
        }
        return repository.findByBankIdOrderByRequestDateDesc(user.getBank().getId()).stream().map(this::toView).toList();
    }

    @Transactional
    public DealerDtos.PartnershipView decide(Authentication auth, Long id, DealerPartnershipStatusEnum status, String reason) {
        User user = security.requireBank(auth);
        DealerBankPartnership partnership = repository.findById(id).orElseThrow(() -> notFound("Partenariat introuvable."));
        if (user.getRole() != RoleEnum.ADMIN_SAAS && !partnership.getBank().getId().equals(user.getBank().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Ce partenariat appartient a une autre banque.");
        }
        if (!List.of(DealerPartnershipStatusEnum.APPROVED, DealerPartnershipStatusEnum.REJECTED,
                DealerPartnershipStatusEnum.SUSPENDED, DealerPartnershipStatusEnum.TERMINATED).contains(status)) {
            throw badRequest("Statut de decision invalide.");
        }
        if (status == DealerPartnershipStatusEnum.REJECTED && (reason == null || reason.isBlank())) {
            throw badRequest("Le motif de rejet est obligatoire.");
        }
        partnership.setStatus(status); partnership.setRejectionReason(reason); partnership.setProcessingDate(LocalDateTime.now());
        partnership = repository.save(partnership);
        User dealerAdmin = userRepository.findFirstByDealer_IdAndRoleOrderByCreatedAtAsc(partnership.getDealer().getId(), RoleEnum.DEALER_ADMIN).orElse(null);
        if (dealerAdmin != null) {
            String message = "Le partenariat avec " + partnership.getBank().getName() + " est maintenant " + status.name().toLowerCase() + ".";
            notificationService.createNotification("Mise a jour du partenariat", message,
                    status == DealerPartnershipStatusEnum.APPROVED ? NotificationTypeEnum.SUCCESS : NotificationTypeEnum.WARNING,
                    NotificationStatusEnum.UNREAD, partnership.getId(), dealerAdmin.getId());
            emailService.sendDealerEventEmail(dealerAdmin.getEmail(), "Mise a jour de votre partenariat Matchia",
                    "Partenariat " + status.name().toLowerCase(), message, null, null,
                    reason == null ? "Store" : "Motif", reason == null ? partnership.getStore().getName() : reason);
        }
        audit("dealer.partnership." + status.name().toLowerCase(), partnership.getId(), AuditStatusEnum.success);
        return toView(partnership);
    }

    public DealerDtos.PartnershipView toView(DealerBankPartnership partnership) {
        return new DealerDtos.PartnershipView(partnership.getId(), accountService.toDealerView(partnership.getDealer()),
                partnership.getBank().getId(), partnership.getBank().getName(), partnership.getStore().getId(),
                partnership.getStore().getName(), partnership.getStatus(), partnership.getMessage(),
                partnership.getRejectionReason(), partnership.getRequestDate(), partnership.getProcessingDate());
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
