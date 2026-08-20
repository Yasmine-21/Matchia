package org.matchia.matchiabackend.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.boot.DefaultApplicationArguments;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DefaultSaasAdminInitializerTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordService passwordService;

    @InjectMocks
    private DefaultSaasAdminInitializer initializer;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(initializer, "defaultEmail", "admin@matchia.com");
        ReflectionTestUtils.setField(initializer, "defaultPassword", "Pass1234!");
        ReflectionTestUtils.setField(initializer, "defaultName", "Super Admin");
    }

    @Test
    void run_shouldCreateNewAdmin_whenNotFound() {
        when(userRepository.findByEmailIgnoreCase("admin@matchia.com")).thenReturn(Optional.empty());

        initializer.run(new DefaultApplicationArguments());

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        
        User savedUser = captor.getValue();
        assertEquals("admin@matchia.com", savedUser.getEmail());
        assertEquals("Super Admin", savedUser.getFullName());
        assertEquals(RoleEnum.ADMIN_SAAS, savedUser.getRole());
        assertEquals(UserStatusEnum.active, savedUser.getStatus());
        
        verify(passwordService).setPassword(savedUser, "Pass1234!");
    }

    @Test
    void run_shouldUpdateExistingAdmin_whenFound() {
        User existingUser = new User();
        existingUser.setEmail("admin@matchia.com");
        existingUser.setRole(RoleEnum.ADMIN_BANK);
        existingUser.setStatus(UserStatusEnum.inactive);
        
        when(userRepository.findByEmailIgnoreCase("admin@matchia.com")).thenReturn(Optional.of(existingUser));

        initializer.run(new DefaultApplicationArguments());

        verify(userRepository).save(existingUser);
        
        assertEquals("admin@matchia.com", existingUser.getEmail());
        assertEquals("Super Admin", existingUser.getFullName());
        assertEquals(RoleEnum.ADMIN_SAAS, existingUser.getRole()); // role updated
        assertEquals(UserStatusEnum.active, existingUser.getStatus()); // status updated
        
        verify(passwordService).setPassword(existingUser, "Pass1234!");
    }
}
