package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class DefaultSaasAdminInitializer implements ApplicationRunner {

    private final UserRepository userRepository;
    private final PasswordService passwordService;

    @Value("${MATCHIA_SAAS_ADMIN_USERNAME:mouakharyasmine@gmail.com}")
    private String defaultEmail;

    @Value("${MATCHIA_SAAS_ADMIN_PASSWORD:test123456}")
    private String defaultPassword;

    @Value("${MATCHIA_SAAS_ADMIN_NAME:Yasmine Mouakhar}")
    private String defaultName;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        User admin = userRepository.findByEmailIgnoreCase(defaultEmail)
                .orElse(null);

        if (admin == null) {
            admin = new User();
            admin.setRole(RoleEnum.ADMIN_SAAS);
            admin.setStatus(UserStatusEnum.active);
        }

        admin.setEmail(defaultEmail);
        admin.setFullName(defaultName);
        admin.setRole(RoleEnum.ADMIN_SAAS);
        admin.setStatus(UserStatusEnum.active);
        passwordService.setPassword(admin, defaultPassword);
        userRepository.save(admin);

        log.info("Default SaaS admin account ensured for identifier {}", defaultEmail);
    }
}
