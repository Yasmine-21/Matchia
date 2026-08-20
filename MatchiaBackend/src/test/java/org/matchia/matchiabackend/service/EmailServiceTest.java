package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.AuditLogRequest;
import org.matchia.matchiabackend.entity.Request;
import org.matchia.matchiabackend.entity.User;
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
}
