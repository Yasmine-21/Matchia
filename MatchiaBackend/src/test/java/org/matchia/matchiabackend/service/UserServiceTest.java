package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
public class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @InjectMocks
    private UserService userService;

    @Test
    void save_success() {
        User user = new User();
        user.setEmail("test@test.com");
        
        when(userRepository.save(user)).thenReturn(user);

        User result = userService.save(user);

        assertThat(result).isNotNull();
        assertThat(result.getEmail()).isEqualTo("test@test.com");
        verify(userRepository).save(user);
    }

    @Test
    void findAllForSaasBackoffice_success() {
        User user = new User();
        user.setRole(RoleEnum.ADMIN_SAAS);
        
        when(userRepository.findByRoleNotOrderByCreatedAtAsc(RoleEnum.CLIENT))
            .thenReturn(List.of(user));

        List<User> result = userService.findAllForSaasBackoffice();

        assertThat(result).hasSize(1);
        verify(userRepository).findByRoleNotOrderByCreatedAtAsc(RoleEnum.CLIENT);
    }

    @Test
    void findAllForBankBackoffice_success() {
        User user = new User();
        user.setRole(RoleEnum.ADMIN_BANK);
        
        when(userRepository.findByBank_IdOrderByCreatedAtAsc(1L))
            .thenReturn(List.of(user));

        List<User> result = userService.findAllForBankBackoffice(1L);

        assertThat(result).hasSize(1);
        verify(userRepository).findByBank_IdOrderByCreatedAtAsc(1L);
    }

    @Test
    void findDetailedForSaasBackoffice_success() {
        User user = new User();
        user.setId(1L);
        
        when(userRepository.findByIdAndRoleNot(1L, RoleEnum.CLIENT))
            .thenReturn(Optional.of(user));

        Optional<User> result = userService.findDetailedForSaasBackoffice(1L);

        assertThat(result).isPresent();
        verify(userRepository).findByIdAndRoleNot(1L, RoleEnum.CLIENT);
    }

    @Test
    void findDetailedForBankBackoffice_success() {
        User user = new User();
        user.setId(1L);
        
        when(userRepository.findByIdAndBank_Id(1L, 10L))
            .thenReturn(Optional.of(user));

        Optional<User> result = userService.findDetailedForBankBackoffice(1L, 10L);

        assertThat(result).isPresent();
        verify(userRepository).findByIdAndBank_Id(1L, 10L);
    }

    @Test
    void findById_success() {
        User user = new User();
        user.setId(1L);
        
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        Optional<User> result = userService.findById(1L);

        assertThat(result).isPresent();
        verify(userRepository).findById(1L);
    }

    @Test
    void findByEmailIgnoreCase_success() {
        User user = new User();
        user.setEmail("Test@test.com");
        
        when(userRepository.findByEmailIgnoreCase("test@test.com")).thenReturn(Optional.of(user));

        Optional<User> result = userService.findByEmailIgnoreCase("test@test.com");

        assertThat(result).isPresent();
        verify(userRepository).findByEmailIgnoreCase("test@test.com");
    }

    @Test
    void deleteById_success() {
        userService.deleteById(1L);
        verify(userRepository).deleteById(1L);
    }
}
