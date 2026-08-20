package org.matchia.matchiabackend.controller;

import org.junit.jupiter.api.Test;
import org.matchia.matchiabackend.dto.UserDto;
import org.matchia.matchiabackend.entity.Bank;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.mapper.UserMapper;
import org.matchia.matchiabackend.repository.BankRepository;
import org.matchia.matchiabackend.service.DealerSecurityService;
import org.matchia.matchiabackend.service.PasswordService;
import org.matchia.matchiabackend.service.UserService;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class UserControllerTest {

    private User user(RoleEnum role, Long id, Bank bank) {
        User user = new User();
        user.setId(id);
        user.setRole(role);
        user.setBank(bank);
        return user;
    }

    @Test
    void createsBankAdministratorAndRefusesUnauthorizedRoles() {
        UserService service = mock(UserService.class);
        UserMapper mapper = mock(UserMapper.class);
        BankRepository banks = mock(BankRepository.class);
        PasswordService passwords = mock(PasswordService.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        UserController controller = new UserController(service, mapper, banks, passwords, security);
        Authentication authentication = mock(Authentication.class);
        Bank bank = new Bank(); bank.setId(2L);
        User admin = user(RoleEnum.ADMIN_SAAS, 1L, null);
        UserDto dto = new UserDto();
        dto.setRole(RoleEnum.ADMIN_BANK); dto.setBankId(2L); dto.setPassword("Secret1!");
        User entity = user(RoleEnum.ADMIN_BANK, 4L, null);
        UserDto saved = new UserDto(); saved.setId(4L);
        when(security.currentUser(authentication)).thenReturn(admin);
        when(passwords.encode("Secret1!")).thenReturn("encoded");
        when(mapper.toEntity(dto)).thenReturn(entity);
        when(banks.findById(2L)).thenReturn(Optional.of(bank));
        when(service.save(entity)).thenReturn(entity);
        when(mapper.toDto(entity)).thenReturn(saved);

        assertThat(controller.create(dto, authentication).getStatusCode().value()).isEqualTo(201);
        assertThat(entity.getBank()).isSameAs(bank);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.DEALER_ADMIN, 3L, null));
        assertThat(controller.create(dto, authentication).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void returnsUsersAccordingToCallerScope() {
        UserService service = mock(UserService.class);
        UserMapper mapper = mock(UserMapper.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        UserController controller = new UserController(service, mapper, mock(BankRepository.class), mock(PasswordService.class), security);
        Authentication authentication = mock(Authentication.class);
        User listed = user(RoleEnum.ADMIN_BANK, 4L, null);
        UserDto dto = new UserDto(); dto.setId(4L);
        when(mapper.toDto(listed)).thenReturn(dto);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.ADMIN_SAAS, 1L, null));
        when(service.findAllForSaasBackoffice()).thenReturn(List.of(listed));
        assertThat(controller.getAll(authentication).getBody()).containsExactly(dto);

        Bank bank = new Bank(); bank.setId(2L);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.ADMIN_BANK, 2L, bank));
        when(service.findAllForBankBackoffice(2L)).thenReturn(List.of(listed));
        assertThat(controller.getAll(authentication).getBody()).containsExactly(dto);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.CLIENT, 3L, null));
        assertThat(controller.getAll(authentication).getStatusCode().value()).isEqualTo(403);
    }

    @Test
    void resolvesVisibleUsersAndPreventsForbiddenDeletion() {
        UserService service = mock(UserService.class);
        UserMapper mapper = mock(UserMapper.class);
        DealerSecurityService security = mock(DealerSecurityService.class);
        UserController controller = new UserController(service, mapper, mock(BankRepository.class), mock(PasswordService.class), security);
        Authentication authentication = mock(Authentication.class);
        User existing = user(RoleEnum.ADMIN_BANK, 7L, null);
        UserDto dto = new UserDto();
        when(mapper.toDto(existing)).thenReturn(dto);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.ADMIN_SAAS, 1L, null));
        when(service.findDetailedForSaasBackoffice(7L)).thenReturn(Optional.of(existing));

        assertThat(controller.getById(7L, authentication).getBody()).isSameAs(dto);
        assertThat(controller.delete(7L, authentication).getStatusCode().value()).isEqualTo(204);
        verify(service).deleteById(7L);
        when(security.currentUser(authentication)).thenReturn(user(RoleEnum.DEALER_ADMIN, 3L, null));
        assertThat(controller.delete(7L, authentication).getStatusCode().value()).isEqualTo(403);
    }
}
