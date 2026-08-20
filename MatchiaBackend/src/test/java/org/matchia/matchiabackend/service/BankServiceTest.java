package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.dto.BankDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.BankStatusEnum;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.mapper.BankMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.repository.MarketplaceStoreRepository;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.time.Year;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class BankServiceTest {

    @Mock
    private BankRepository bankRepository;

    @Mock
    private MarketplaceStoreRepository marketplaceStoreRepository;

    @Mock
    private BankMapper bankMapper;

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private BankService bankService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bankService, "uploadDir", "target/test-uploads");
    }

    private Bank createBankEntity() {
        Bank bank = new Bank();
        bank.setId(1L);
        bank.setName("Test Bank");
        bank.setSlug("test-bank");
        bank.setEmail("contact@testbank.com");
        bank.setEstablishedYear(2000);
        bank.setStatus(BankStatusEnum.active);
        return bank;
    }

    private BankDto createBankDto() {
        BankDto dto = new BankDto();
        dto.setId(1L);
        dto.setName("Test Bank");
        dto.setSlug("test-bank");
        dto.setEmail("contact@testbank.com");
        dto.setEstablishedYear(2000);
        dto.setStatus(BankStatusEnum.active);
        return dto;
    }

    @Test
    void getAllBanks_success() {
        Bank bank = createBankEntity();
        BankDto dto = createBankDto();

        when(bankRepository.findAll()).thenReturn(List.of(bank));
        when(bankMapper.toDto(bank)).thenReturn(dto);
        when(marketplaceStoreRepository.countByMarketplace_Bank_Id(1L)).thenReturn(5L);
        
        User admin = new User();
        admin.setRole(RoleEnum.ADMIN_BANK);
        admin.setPhone("+123456789");
        when(userRepository.findByBank_IdOrderByCreatedAtAsc(1L)).thenReturn(List.of(admin));

        List<BankDto> result = bankService.getAllBanks();

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getAssignedStoresCount()).isEqualTo(5);
        assertThat(result.get(0).getContactPhone()).isEqualTo("+123456789");
    }

    @Test
    void createBank_success() {
        BankDto inputDto = new BankDto();
        inputDto.setName("New Bank");
        
        Bank bank = new Bank();
        bank.setName("New Bank");
        
        Bank savedBank = new Bank();
        savedBank.setId(2L);
        savedBank.setName("New Bank");
        savedBank.setSlug("new-bank");
        savedBank.setStatus(BankStatusEnum.inactive);
        
        BankDto savedDto = new BankDto();
        savedDto.setId(2L);
        savedDto.setName("New Bank");

        when(bankMapper.toEntity(inputDto)).thenReturn(bank);
        when(bankRepository.save(any(Bank.class))).thenReturn(savedBank);
        when(bankMapper.toDto(savedBank)).thenReturn(savedDto);

        BankDto result = bankService.createBank(inputDto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(2L);
        verify(bankRepository).save(any(Bank.class));
    }

    @Test
    void createBank_invalidEmail_throwsException() {
        BankDto inputDto = new BankDto();
        inputDto.setName("New Bank");
        inputDto.setEmail("invalid-email");
        
        Bank bank = new Bank();
        bank.setName("New Bank");
        bank.setEmail("invalid-email");

        when(bankMapper.toEntity(inputDto)).thenReturn(bank);

        assertThatThrownBy(() -> bankService.createBank(inputDto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("L'email de la banque doit etre valide");
    }

    @Test
    void createBank_invalidYear_throwsException() {
        BankDto inputDto = new BankDto();
        inputDto.setName("New Bank");
        
        Bank bank = new Bank();
        bank.setName("New Bank");
        bank.setEstablishedYear(1700);

        when(bankMapper.toEntity(inputDto)).thenReturn(bank);

        assertThatThrownBy(() -> bankService.createBank(inputDto))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("L'annee d'etablissement doit etre entre 1800 et");
    }

    @Test
    void createBankMultipart_success() throws IOException {
        MultipartFile logo = new MockMultipartFile("logo", "logo.png", "image/png", "img_content".getBytes());
        
        Bank savedBank = createBankEntity();
        BankDto savedDto = createBankDto();
        
        when(bankRepository.save(any(Bank.class))).thenReturn(savedBank);
        when(bankMapper.toDto(savedBank)).thenReturn(savedDto);

        BankDto result = bankService.createBankMultipart(
                logo, "New Bank", "test@test.com", "123456", "Country", 
                "new-bank", "url", "desc", 2010, BankStatusEnum.active
        );

        assertThat(result).isNotNull();
        verify(bankRepository).save(any(Bank.class));
    }

    @Test
    void createBankMultipart_invalidLogo_throwsException() {
        MultipartFile logo = new MockMultipartFile("logo", "doc.txt", "text/plain", "content".getBytes());

        assertThatThrownBy(() -> bankService.createBankMultipart(
                logo, "New Bank", "test@test.com", "123456", "Country", 
                "new-bank", "url", "desc", 2010, BankStatusEnum.active))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Le logo doit etre une image");
    }

    @Test
    void updateBank_success() {
        Bank existingBank = createBankEntity();
        BankDto updateDto = new BankDto();
        updateDto.setName("Updated Bank");
        updateDto.setSlug("updated-bank");
        
        Bank savedBank = createBankEntity();
        savedBank.setName("Updated Bank");
        savedBank.setSlug("updated-bank");
        
        BankDto savedDto = createBankDto();
        savedDto.setName("Updated Bank");

        when(bankRepository.findById(1L)).thenReturn(Optional.of(existingBank));
        when(bankRepository.save(any(Bank.class))).thenReturn(savedBank);
        when(bankMapper.toDto(savedBank)).thenReturn(savedDto);

        BankDto result = bankService.updateBank(1L, updateDto);

        assertThat(result.getName()).isEqualTo("Updated Bank");
        verify(bankRepository).save(existingBank);
    }

    @Test
    void updateBank_notFound_throwsException() {
        BankDto updateDto = new BankDto();
        when(bankRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> bankService.updateBank(1L, updateDto))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Banque non trouvee");
    }

    @Test
    void updateBankMultipart_success() throws IOException {
        Bank existingBank = createBankEntity();
        MultipartFile logo = new MockMultipartFile("logo", "logo.png", "image/png", "img_content".getBytes());
        
        Bank savedBank = createBankEntity();
        BankDto savedDto = createBankDto();

        when(bankRepository.findById(1L)).thenReturn(Optional.of(existingBank));
        when(bankRepository.save(any(Bank.class))).thenReturn(savedBank);
        when(bankMapper.toDto(savedBank)).thenReturn(savedDto);

        BankDto result = bankService.updateBankMultipart(
                1L, logo, "Updated Bank", "test@test.com", "123456", "Country", 
                "updated-bank", "url", "desc", 2010, BankStatusEnum.active
        );

        assertThat(result).isNotNull();
        verify(bankRepository).save(existingBank);
    }

    @Test
    void updateStatus_success() {
        Bank existingBank = createBankEntity();
        existingBank.setStatus(BankStatusEnum.inactive);
        
        Bank savedBank = createBankEntity();
        savedBank.setStatus(BankStatusEnum.active);
        
        BankDto savedDto = createBankDto();

        when(bankRepository.findById(1L)).thenReturn(Optional.of(existingBank));
        when(bankRepository.save(any(Bank.class))).thenReturn(savedBank);
        when(bankMapper.toDto(savedBank)).thenReturn(savedDto);

        BankDto result = bankService.updateStatus(1L, BankStatusEnum.active);

        assertThat(result).isNotNull();
        assertThat(existingBank.getStatus()).isEqualTo(BankStatusEnum.active);
        verify(bankRepository).save(existingBank);
    }
    
    @Test
    void updateStatus_nullStatus_throwsException() {
        assertThatThrownBy(() -> bankService.updateStatus(1L, null))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void deleteBank_success() {
        when(bankRepository.existsById(1L)).thenReturn(true);

        bankService.deleteBank(1L);

        verify(bankRepository).deleteById(1L);
    }

    @Test
    void deleteBank_notFound_throwsException() {
        when(bankRepository.existsById(1L)).thenReturn(false);

        assertThatThrownBy(() -> bankService.deleteBank(1L))
                .isInstanceOf(RuntimeException.class)
                .hasMessageContaining("Impossible de supprimer");
    }
}
