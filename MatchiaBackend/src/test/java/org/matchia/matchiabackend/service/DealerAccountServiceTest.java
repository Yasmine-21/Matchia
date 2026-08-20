package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.DealerDtos;
import org.matchia.matchiabackend.entity.Dealer;
import org.matchia.matchiabackend.entity.DealerAccountRequest;
import org.matchia.matchiabackend.entity.Store;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.DealerRequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.StoreStatusEnum;
import org.matchia.matchiabackend.repository.DealerAccountRequestRepository;
import org.matchia.matchiabackend.repository.DealerRepository;
import org.matchia.matchiabackend.repository.StoreRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.core.Authentication;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DealerAccountServiceTest {

    @Mock private DealerAccountRequestRepository requestRepository;
    @Mock private DealerRepository dealerRepository;
    @Mock private StoreRepository storeRepository;
    @Mock private UserRepository userRepository;
    @Mock private PasswordService passwordService;
    @Mock private DealerSecurityService security;
    @Mock private NotificationService notificationService;
    @Mock private EmailService emailService;
    @Mock private AuditLogger auditLogger;
    @Mock private Authentication authentication;

    @InjectMocks
    private DealerAccountService dealerAccountService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(dealerAccountService, "uploadDirectory", "target/test-uploads/dealers");
        ReflectionTestUtils.setField(dealerAccountService, "frontendUrl", "http://localhost");
    }

    @Test
    void register_success() {
        DealerDtos.RegistrationRequest input = new DealerDtos.RegistrationRequest(
                "Company", "REG123", "Address", "Contact", "test@test.com", "123456789", "http://web.com", 1L
        );
        MockMultipartFile logo = new MockMultipartFile("logo", "logo.png", "image/png", "data".getBytes());
        MockMultipartFile doc = new MockMultipartFile("doc", "doc.pdf", "application/pdf", "data".getBytes());

        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(dealerRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(requestRepository.existsByEmailIgnoreCaseAndStatus("test@test.com", DealerRequestStatusEnum.PENDING)).thenReturn(false);
        when(dealerRepository.existsByRegistrationNumberIgnoreCase("REG123")).thenReturn(false);

        Store store = new Store();
        store.setId(1L);
        store.setStatus(StoreStatusEnum.active);
        when(storeRepository.findById(1L)).thenReturn(Optional.of(store));

        DealerAccountRequest savedRequest = new DealerAccountRequest();
        savedRequest.setId(1L);
        savedRequest.setStore(store);
        savedRequest.setDocumentUrls(List.of("url"));
        when(requestRepository.save(any())).thenReturn(savedRequest);

        DealerDtos.AccountRequestView result = dealerAccountService.register(input, logo, null, List.of(doc));

        assertThat(result).isNotNull();
        verify(requestRepository).save(any());
        verify(emailService).sendDealerEventEmail(eq("test@test.com"), anyString(), anyString(), anyString(), any(), any(), anyString(), anyString());
    }

    @Test
    void approve_success() {
        DealerAccountRequest request = new DealerAccountRequest();
        request.setId(1L);
        request.setEmail("test@test.com");
        request.setStatus(DealerRequestStatusEnum.PENDING);
        Store store = new Store();
        store.setId(1L);
        request.setStore(store);

        when(requestRepository.findById(1L)).thenReturn(Optional.of(request));
        when(dealerRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("test@test.com")).thenReturn(false);

        Dealer savedDealer = new Dealer();
        savedDealer.setId(1L);
        savedDealer.setStore(store);
        when(dealerRepository.save(any())).thenReturn(savedDealer);
        when(passwordService.generateTemporaryPassword()).thenReturn("temp-pass");
        
        User adminUser = new User();
        adminUser.setId(10L);
        when(userRepository.save(any())).thenReturn(adminUser);

        DealerDtos.DealerView result = dealerAccountService.approve(authentication, 1L);

        assertThat(result).isNotNull();
        verify(dealerRepository).save(any(Dealer.class));
        verify(userRepository).save(any(User.class));
        assertThat(request.getStatus()).isEqualTo(DealerRequestStatusEnum.APPROVED);
    }

    @Test
    void reject_success() {
        DealerAccountRequest request = new DealerAccountRequest();
        request.setId(1L);
        request.setEmail("test@test.com");
        request.setStatus(DealerRequestStatusEnum.PENDING);
        Store store = new Store();
        store.setId(1L);
        request.setStore(store);
        request.setDocumentUrls(List.of());

        when(requestRepository.findById(1L)).thenReturn(Optional.of(request));

        DealerDtos.AccountRequestView result = dealerAccountService.reject(authentication, 1L, "Reason");

        assertThat(result).isNotNull();
        assertThat(request.getStatus()).isEqualTo(DealerRequestStatusEnum.REJECTED);
        verify(requestRepository).save(request);
    }

    @Test
    void returnsActivePublicDealersAndCurrentDealerProfile() {
        Store store = new Store(); store.setId(2L); store.setName("Auto"); store.setDescription("Vehicles");
        Dealer dealer = new Dealer(); dealer.setId(3L); dealer.setStore(store); dealer.setCompanyName("Dealer"); dealer.setStatus(org.matchia.matchiabackend.entity.enums.DealerStatusEnum.ACTIVE);
        dealer.setEmail("dealer@matchia.tn"); dealer.setPhone("123"); dealer.setAddress("Tunis");
        when(dealerRepository.findByStatusOrderByCompanyNameAsc(org.matchia.matchiabackend.entity.enums.DealerStatusEnum.ACTIVE)).thenReturn(List.of(dealer));
        User user = new User(); user.setDealer(dealer);
        when(security.requireDealer(authentication)).thenReturn(user);

        assertThat(dealerAccountService.activePublicDealers()).singleElement().satisfies(view -> assertThat(view.companyName()).isEqualTo("Dealer"));
        assertThat(dealerAccountService.me(authentication).companyName()).isEqualTo("Dealer");
    }
}
