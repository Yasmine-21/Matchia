package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.FinancingRequest;
import org.matchia.matchiabackend.entity.Product;
import org.matchia.matchiabackend.entity.enums.FinancingRequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class EmailServiceTest {
    @Mock private UserRepository userRepository;
    @Mock private AuditLogger auditLogger;
    @InjectMocks private EmailService emailService;

    @BeforeEach
    void configureSimulationMode() {
        ReflectionTestUtils.setField(emailService, "mailHost", "");
        ReflectionTestUtils.setField(emailService, "frontendUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(emailService, "publicUrl", "https://matchia.com");
    }

    @Test
    void rendersTemplatedMessagesInSimulationAndAuditsAttempt() {
        assertThat(emailService.sendJoinEmailVerificationCode("client@matchia.com", "123456")).isFalse();
        assertThat(emailService.sendDealerCredentialsEmail("dealer@matchia.com", "temporary", "https://app/login")).isFalse();
        assertThat(emailService.sendDealerEventEmail("dealer@matchia.com", "Subject", "Title", "Message", "Open", "https://app", "Info", "Text")).isFalse();
        ArgumentCaptor<AuditLogRequest> audit = ArgumentCaptor.forClass(AuditLogRequest.class);
        verify(auditLogger, org.mockito.Mockito.atLeast(3)).logSystemAsync(audit.capture(), eq("EMAIL_AUTOMATION"));
        assertThat(audit.getAllValues()).allSatisfy(value -> assertThat(value.getResourceType()).isEqualTo("email"));
    }

    @Test
    void rejectsMissingRecipientsAndIncompleteSensitiveRequests() {
        assertThat(emailService.sendDealerEventEmail(" ", "s", "t", "m", null, null, null, null)).isFalse();
        assertThat(emailService.sendPasswordResetEmail(null, "https://reset")).isFalse();
        assertThat(emailService.sendFinancingDecisionEmail(null)).isFalse();
        User user = new User();
        assertThat(emailService.sendBankCredentialsEmail(new Request(), user, "")).isFalse();
    }

    @Test
    void rendersEveryRequestAndFinancingDecisionTemplateInSimulation() {
        Request request = new Request();
        request.setId(7L); request.setContactEmail("contact@bank.tn"); request.setBankEmail("bank@bank.tn");
        request.setBankName("Banque"); request.setMarketplaceSlug("market"); request.setTotalAmount(20d);
        request.setRequestType(RequestTypeEnum.store);
        assertThat(emailService.sendMarketplaceRequestConfirmationEmail(request)).isFalse();
        assertThat(emailService.sendPaymentInstructions(request, "http://localhost:5173/paiement")).isFalse();
        assertThat(emailService.sendStoreRequestRejectedEmail(request, "motif")).isFalse();
        assertThat(emailService.sendModuleRequestRejectedEmail(request, "motif")).isFalse();
        assertThat(emailService.sendSubscriptionRequestRejectedEmail(request, "motif")).isFalse();
        assertThat(emailService.sendJoinRequestRejectedEmail(request, "motif")).isFalse();

        request.setRequestType(RequestTypeEnum.subscription);
        assertThat(emailService.sendSubscriptionRenewalPaymentInstructions(request, "http://localhost:5173/paiement")).isFalse();
        User client = new User(); client.setEmail("client@bank.tn");
        Bank bank = new Bank(); bank.setName("Banque");
        Product product = new Product(); product.setName("Voiture");
        FinancingRequest financing = new FinancingRequest(); financing.setId(8L); financing.setReference("FIN-8"); financing.setClient(client); financing.setBank(bank); financing.setProduct(product);
        financing.setStatus(FinancingRequestStatusEnum.ACCEPTED);
        assertThat(emailService.sendFinancingDecisionEmail(financing)).isFalse();
        financing.setStatus(FinancingRequestStatusEnum.REJECTED); financing.setRejectionReason("revenu");
        assertThat(emailService.sendFinancingDecisionEmail(financing)).isFalse();
        verify(auditLogger, org.mockito.Mockito.atLeast(9)).logSystemAsync(any(AuditLogRequest.class), eq("EMAIL_AUTOMATION"));
    }
}
