package org.matchia.matchiabackend.service;

import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.RequestDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.Marketplace;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.enums.MarketplaceStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreModuleRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.ModuleRepository;
import org.matchia.matchiabackend.repository.RequestRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;
import java.util.NoSuchElementException;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RequestServiceTest {

    @Mock private RequestRepository requestRepository;
    @Mock private Validator validator;
    @Mock private EmailService emailService;
    @Mock private PaymentService paymentService;
    @Mock private BankRepository bankRepository;
    @Mock private MarketplaceRepository marketplaceRepository;
    @Mock private UserRepository userRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private MarketplaceStoreRepository marketplaceStoreRepository;
    @Mock private MarketplaceStoreModuleRepository marketplaceStoreModuleRepository;
    @Mock private AuditLogger auditLogger;
    @Mock private NotificationService notificationService;
    @Mock private BankAdminCredentialsService bankAdminCredentialsService;
    @Mock private JoinEmailVerificationService joinEmailVerificationService;

    @InjectMocks private RequestService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "uploadDir", "target/test-logos");
    }

    @Test
    void findAllInitializesAndReturnsEveryRequest() {
        Request first = request(RequestTypeEnum.join, RequestStatusEnum.pending);
        Request second = request(RequestTypeEnum.store, RequestStatusEnum.approved);
        when(requestRepository.findAll()).thenReturn(List.of(first, second));

        assertThat(service.findAll()).containsExactly(first, second);

        verify(requestRepository).findAll();
    }

    @Test
    void findByIdReturnsInitializedRequestWhenPresent() {
        Request expected = request(RequestTypeEnum.store, RequestStatusEnum.pending);
        when(requestRepository.findById(5L)).thenReturn(Optional.of(expected));

        assertThat(service.findById(5L)).containsSame(expected);

        verify(requestRepository).findById(5L);
    }

    @Test
    void findByIdReturnsEmptyWhenRequestDoesNotExist() {
        when(requestRepository.findById(99L)).thenReturn(Optional.empty());

        assertThat(service.findById(99L)).isEmpty();

        verify(requestRepository).findById(99L);
    }

    @Test
    void findPendingAndFindByBankDelegateToTheCorrectRepositoryMethods() {
        Request pending = request(RequestTypeEnum.join, RequestStatusEnum.pending);
        Request bankRequest = request(RequestTypeEnum.store, RequestStatusEnum.approved);
        when(requestRepository.findByStatusOrderByCreatedAtDesc(RequestStatusEnum.pending)).thenReturn(List.of(pending));
        when(requestRepository.findByBank_IdOrderByCreatedAtDesc(7L)).thenReturn(List.of(bankRequest));

        assertThat(service.findPendingRequests()).containsExactly(pending);
        assertThat(service.findByBankId(7L)).containsExactly(bankRequest);

        verify(requestRepository).findByStatusOrderByCreatedAtDesc(RequestStatusEnum.pending);
        verify(requestRepository).findByBank_IdOrderByCreatedAtDesc(7L);
    }

    @Test
    void saveDeleteAndCountPendingDelegateToRepository() {
        Request candidate = request(RequestTypeEnum.join, RequestStatusEnum.pending);
        when(requestRepository.save(candidate)).thenReturn(candidate);
        when(requestRepository.countByStatus(RequestStatusEnum.pending)).thenReturn(4L);

        assertThat(service.save(candidate)).isSameAs(candidate);
        service.deleteById(12L);
        assertThat(service.countPendingRequests()).isEqualTo(4L);

        verify(requestRepository).save(candidate);
        verify(requestRepository).deleteById(12L);
        verify(requestRepository).countByStatus(RequestStatusEnum.pending);
    }

    @Test
    void createJsonJoinRequestPersistsSelectionsAndNotifiesDependencies() {
        RequestDto dto = validJoinDto();
        dto.setStoreIds(List.of(1L));
        dto.setModuleIds(List.of(2L));
        Store store = new Store();
        store.setId(1L);
        store.setName("Mobile");
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));
        when(requestRepository.saveAndFlush(any(Request.class))).thenAnswer(invocation -> {
            Request saved = invocation.getArgument(0);
            saved.setId(34L);
            return saved;
        });

        Request saved = service.createJsonRequest(dto);

        assertThat(saved.getId()).isEqualTo(34L);
        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.pending);
        assertThat(saved.getCountry()).isEqualTo("Tunisie");
        assertThat(saved.getSelectedStores()).isEqualTo("[1]");
        assertThat(saved.getSelectedModules()).isEqualTo("[2]");
        assertThat(saved.getStores()).containsExactly(store);
        verify(joinEmailVerificationService).consumeForJoinRequest("contact@bank.tn", "verified-token");
        verify(requestRepository).saveAndFlush(saved);
        verify(auditLogger).logAsync(any());
        verify(notificationService).createRequestCreatedNotification(saved);
        verify(emailService).sendMarketplaceRequestConfirmationEmail(saved);
    }

    @Test
    void createJsonJoinRequestRejectsMissingLogoBeforeAnyPersistence() {
        RequestDto dto = validJoinDto();
        dto.setLogoUrl("  ");

        assertThatThrownBy(() -> service.createJsonRequest(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Le logo de la banque est obligatoire.");

        verify(requestRepository, never()).saveAndFlush(any());
        verify(joinEmailVerificationService, never()).consumeForJoinRequest(any(), any());
    }

    @Test
    void createJsonRequestRejectsUnavailableExistingBankForStoreRequest() {
        RequestDto dto = validExistingBankDto(RequestTypeEnum.store);
        when(bankRepository.findById(18L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.createJsonRequest(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("La banque selectionnee est introuvable.");

        verify(requestRepository, never()).saveAndFlush(any());
    }

    @Test
    void createJsonRequestRejectsStoreRequestWithoutBankId() {
        RequestDto dto = validExistingBankDto(RequestTypeEnum.subscription);
        dto.setBankId(null);

        assertThatThrownBy(() -> service.createJsonRequest(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("La banque existante est obligatoire pour cette demande.");
    }

    @Test
    void createJsonJoinRequestRejectsInvalidMarketplaceFields() {
        RequestDto dto = validJoinDto();
        dto.setMarketplaceSlug("Invalid slug!");
        dto.setStoreIds(List.of(1L));

        assertThatThrownBy(() -> service.createJsonRequest(dto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("minuscules, chiffres et tirets");

        verify(requestRepository, never()).saveAndFlush(any());
    }

    @Test
    void createMultipartRequestRejectsMissingLogo() {
        assertThatThrownBy(() -> service.createMultipartRequest(
                "Bank", "bank@tn.tn", "+21612345678", null, null, null,
                "Tunisie", null, "Contact", "contact@tn.tn", "+21687654321", null,
                null, null, 2020, "[1]", "[]", "bank", "Description",
                "#112233", "#445566", 0D, "token"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Le logo de la banque est obligatoire.");

        verify(joinEmailVerificationService, never()).consumeForJoinRequest(any(), any());
    }

    @Test
    void approveRequestRejectsPreviouslyRejectedRequest() {
        Request rejected = request(RequestTypeEnum.subscription, RequestStatusEnum.rejected);
        when(requestRepository.findById(4L)).thenReturn(Optional.of(rejected));

        assertThatThrownBy(() -> service.approveRequest(4L))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("rejetee ne peut pas etre approuvee");

        verify(requestRepository, never()).save(any());
    }

    @Test
    void approveSubscriptionRequestChangesStatusAndSkipsPaymentLink() {
        Request subscription = request(RequestTypeEnum.subscription, RequestStatusEnum.pending);
        when(requestRepository.findById(8L)).thenReturn(Optional.of(subscription));
        when(requestRepository.save(subscription)).thenReturn(subscription);

        Request saved = service.approveRequest(8L);

        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.approved);
        verify(notificationService).createRequestApprovedNotification(subscription);
        verify(paymentService, never()).initiatePayment(any());
        verify(emailService, never()).sendPaymentInstructions(any(), any());
        verify(notificationService, never()).createBankRequestApprovedNotification(any());
    }

    @Test
    void approveRenewalRequestCreatesRenewalPaymentAndBankNotification() {
        Request renewal = request(RequestTypeEnum.renewal, RequestStatusEnum.pending);
        when(requestRepository.findById(9L)).thenReturn(Optional.of(renewal));
        when(requestRepository.save(renewal)).thenReturn(renewal);

        service.approveRequest(9L);

        verify(notificationService).createRequestApprovedNotification(renewal);
        verify(paymentService).createPaymentForApprovedRenewalRequest(renewal);
        verify(notificationService).createBankRenewalApprovedNotification(renewal);
        verify(paymentService, never()).initiatePayment(any());
    }

    @Test
    void approveModuleRequestProvisionsExistingBankAndInitiatesPayment() {
        Bank bank = bank(42L, "Bank module");
        Marketplace marketplace = new Marketplace();
        marketplace.setId(21L);
        Request moduleRequest = request(RequestTypeEnum.module, RequestStatusEnum.pending);
        moduleRequest.setBank(bank);
        moduleRequest.setSelectedStores("[]");
        moduleRequest.setSelectedModules("[]");
        when(requestRepository.findById(10L)).thenReturn(Optional.of(moduleRequest));
        when(marketplaceRepository.findByBankId(42L)).thenReturn(Optional.of(marketplace));
        when(userRepository.findByEmail("contact@bank.tn")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(requestRepository.save(any(Request.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(paymentService.initiatePayment(moduleRequest)).thenReturn("https://payment.example/link");

        Request saved = service.approveRequest(10L);

        assertThat(saved.getBank()).isSameAs(bank);
        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.approved);
        verify(marketplaceRepository).save(marketplace);
        verify(paymentService).initiatePayment(moduleRequest);
        verify(emailService).sendPaymentInstructions(moduleRequest, "https://payment.example/link");
        verify(notificationService).createBankRequestApprovedNotification(moduleRequest);
    }

    @Test
    void rejectRequestRejectsApprovedRequest() {
        Request approved = request(RequestTypeEnum.join, RequestStatusEnum.approved);
        when(requestRepository.findById(16L)).thenReturn(Optional.of(approved));

        assertThatThrownBy(() -> service.rejectRequest(16L, "reason"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("approuvee ne peut pas etre rejetee");

        verify(requestRepository, never()).save(any());
    }

    @Test
    void rejectJoinRequestTrimsReasonAndUsesJoinEmailOnly() {
        Request join = request(RequestTypeEnum.join, RequestStatusEnum.pending);
        when(requestRepository.findById(17L)).thenReturn(Optional.of(join));
        when(requestRepository.save(join)).thenReturn(join);

        Request saved = service.rejectRequest(17L, "  dossier incomplet  ");

        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.rejected);
        assertThat(saved.getRejectionReason()).isEqualTo("dossier incomplet");
        verify(notificationService).createRequestRejectedNotification(join, "dossier incomplet");
        verify(notificationService, never()).createBankRequestRejectedNotification(any(), any());
        verify(emailService).sendJoinRequestRejectedEmail(join, "dossier incomplet");
    }

    @Test
    void rejectStoreRequestNotifiesBankAndContinuesWhenEmailFails() {
        Request store = request(RequestTypeEnum.store, RequestStatusEnum.pending);
        when(requestRepository.findById(18L)).thenReturn(Optional.of(store));
        when(requestRepository.save(store)).thenReturn(store);
        doThrow(new RuntimeException("mail unavailable"))
                .when(emailService).sendStoreRequestRejectedEmail(store, null);

        Request saved = service.rejectRequest(18L);

        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.rejected);
        verify(notificationService).createRequestRejectedNotification(store, null);
        verify(notificationService).createBankRequestRejectedNotification(store, null);
        verify(emailService).sendStoreRequestRejectedEmail(store, null);
    }

    @Test
    void updateStatusThrowsWhenRequestDoesNotExist() {
        when(requestRepository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.updateStatus(404L, RequestStatusEnum.approved))
                .isInstanceOf(NoSuchElementException.class)
                .hasMessage("Demande non trouvee : 404");
    }

    @Test
    void updateStatusApprovedRenewalCreatesRenewalPayment() {
        Request renewal = request(RequestTypeEnum.renewal, RequestStatusEnum.pending);
        when(requestRepository.findById(22L)).thenReturn(Optional.of(renewal));
        when(requestRepository.save(renewal)).thenReturn(renewal);

        Request saved = service.updateStatus(22L, RequestStatusEnum.approved);

        assertThat(saved.getStatus()).isEqualTo(RequestStatusEnum.approved);
        verify(notificationService).createRequestApprovedNotification(renewal);
        verify(paymentService).createPaymentForApprovedRenewalRequest(renewal);
        verify(notificationService).createBankRenewalApprovedNotification(renewal);
    }

    @Test
    void updateStatusRejectedSubscriptionNotifiesBankAndSendsSubscriptionEmail() {
        Request subscription = request(RequestTypeEnum.subscription, RequestStatusEnum.pending);
        subscription.setRejectionReason("missing document");
        when(requestRepository.findById(23L)).thenReturn(Optional.of(subscription));
        when(requestRepository.save(subscription)).thenReturn(subscription);

        service.updateStatus(23L, RequestStatusEnum.rejected);

        verify(notificationService).createRequestRejectedNotification(subscription, "missing document");
        verify(notificationService).createBankRequestRejectedNotification(subscription, "missing document");
        verify(emailService).sendSubscriptionRequestRejectedEmail(subscription, "missing document");
    }

    @Test
    void validatePaymentForStoreMarksPaymentAndReturnsExistingBankWithoutProvisioning() {
        Bank bank = bank(52L, "Existing bank");
        Request store = request(RequestTypeEnum.store, RequestStatusEnum.approved);
        store.setBank(bank);
        when(requestRepository.findById(24L)).thenReturn(Optional.of(store));
        when(paymentService.isRequestPaymentAlreadyPaid(24L)).thenReturn(false);

        assertThat(service.validatePaymentAndProvisionBank(24L)).isSameAs(bank);

        verify(paymentService).markRequestPaymentPaid(24L);
        verify(bankAdminCredentialsService, never()).issueAfterSuccessfulMarketplacePayment(any());
        verify(bankRepository, never()).save(any());
    }

    @Test
    void validatePaymentForJoinProvisionsBankAndIssuesCredentialsOnlyForFirstPayment() {
        Request join = request(RequestTypeEnum.join, RequestStatusEnum.approved);
        join.setSelectedStores("[]");
        join.setSelectedModules("[]");
        Bank createdBank = bank(71L, "Bank join");
        Marketplace marketplace = new Marketplace();
        marketplace.setId(72L);
        when(requestRepository.findById(25L)).thenReturn(Optional.of(join));
        when(paymentService.isRequestPaymentAlreadyPaid(25L)).thenReturn(false);
        when(bankRepository.findBySlug("bank-join")).thenReturn(Optional.empty());
        when(bankRepository.save(any(Bank.class))).thenReturn(createdBank);
        when(marketplaceRepository.findByBankId(71L)).thenReturn(Optional.empty());
        when(marketplaceRepository.save(any(Marketplace.class))).thenReturn(marketplace);
        when(userRepository.findByEmail("contact@bank.tn")).thenReturn(Optional.empty());
        when(userRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        Bank provisioned = service.validatePaymentAndProvisionBank(25L);

        assertThat(provisioned).isSameAs(createdBank);
        verify(paymentService).markRequestPaymentPaid(25L);
        verify(bankAdminCredentialsService).issueAfterSuccessfulMarketplacePayment(join);
        verify(marketplaceRepository).save(any(Marketplace.class));
        verify(userRepository).save(any());
    }

    @Test
    void getLogoFileReadsExistingFileAndRejectsAbsentFile(@TempDir Path directory) throws IOException {
        Path logo = directory.resolve("logo.png");
        Files.write(logo, new byte[]{1, 2, 3});
        ReflectionTestUtils.setField(service, "uploadDir", directory.toString());

        assertThat(service.getLogoFile("logo.png")).containsExactly(1, 2, 3);
        assertThatThrownBy(() -> service.getLogoFile("missing.png"))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Fichier introuvable");
    }

    @Test
    void linksCreatedMarketplaceBackToBankForImmediateSubscriptionCreation() {
        when(marketplaceRepository.findByBankId(42L)).thenReturn(Optional.empty());
        when(marketplaceRepository.save(any(Marketplace.class))).thenAnswer(invocation -> {
            Marketplace marketplace = invocation.getArgument(0);
            marketplace.setId(7L);
            return marketplace;
        });

        Bank bank = bank(42L, "Banque test");
        Request request = request(RequestTypeEnum.join, RequestStatusEnum.pending);
        request.setPrimaryColor("#123456");
        request.setSecondaryColor("#654321");
        request.setTotalAmount(8_800D);

        Marketplace result = ReflectionTestUtils.invokeMethod(service, "createMarketplace", bank, request, false);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(MarketplaceStatusEnum.inactive);
        assertThat(bank.getMarketplace()).isSameAs(result);
        assertThat(bank.getMarketplace().getId()).isEqualTo(7L);
    }

    private RequestDto validJoinDto() {
        RequestDto dto = new RequestDto();
        dto.setRequestType(RequestTypeEnum.join);
        dto.setBankName("Bank join");
        dto.setBankEmail("bank@bank.tn");
        dto.setBankPhone("+21612345678");
        dto.setLogoUrl("/logos/bank.png");
        dto.setContactName("Contact bank");
        dto.setContactEmail("contact@bank.tn");
        dto.setContactPhone("+21687654321");
        dto.setContactImageUrl("/contacts/contact.png");
        dto.setDescription("Description");
        dto.setBankDescription("Bank description");
        dto.setEstablishmentYear(2020);
        dto.setMarketplaceSlug("bank-join");
        dto.setMarketplaceDescription("Marketplace description");
        dto.setPrimaryColor("#123456");
        dto.setSecondaryColor("#654321");
        dto.setBanniereUrl("/banners/banner.png");
        dto.setTotalAmount(120D);
        dto.setContactEmailVerificationToken("verified-token");
        return dto;
    }

    private RequestDto validExistingBankDto(RequestTypeEnum type) {
        RequestDto dto = new RequestDto();
        dto.setRequestType(type);
        dto.setBankId(18L);
        dto.setBankName("Existing bank");
        dto.setBankEmail("bank@bank.tn");
        dto.setContactName("Contact");
        dto.setContactEmail("contact@bank.tn");
        dto.setStoreIds(type == RequestTypeEnum.subscription ? List.of() : List.of(1L));
        dto.setTotalAmount(10D);
        return dto;
    }

    private Request request(RequestTypeEnum type, RequestStatusEnum status) {
        Request request = new Request();
        request.setId(1L);
        request.setRequestType(type);
        request.setStatus(status);
        request.setBankName("Bank join");
        request.setBankEmail("bank@bank.tn");
        request.setBankPhone("+21612345678");
        request.setLogoUrl("/logos/bank.png");
        request.setContactName("Contact bank");
        request.setContactEmail("contact@bank.tn");
        request.setContactPhone("+21687654321");
        request.setContactImageUrl("/contacts/contact.png");
        request.setMarketplaceSlug("bank-join");
        request.setMarketplaceDescription("Marketplace description");
        request.setPrimaryColor("#123456");
        request.setSecondaryColor("#654321");
        request.setBanniereUrl("/banners/banner.png");
        request.setTotalAmount(100D);
        return request;
    }

    private Bank bank(Long id, String name) {
        Bank bank = new Bank();
        bank.setId(id);
        bank.setName(name);
        bank.setPhone("+21612345678");
        bank.setLogoUrl("/logos/bank.png");
        return bank;
    }
}
