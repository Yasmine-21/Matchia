package org.matchia.matchiabackend.service;

import lombok.RequiredArgsConstructor;
import org.matchia.matchiabackend.entity.User;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;
import org.matchia.matchiabackend.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
public class DealerSecurityService {
    private final UserRepository userRepository;

    public User currentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentification requise.");
        }
        return userRepository.findByEmailIgnoreCase(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Utilisateur introuvable."));
    }

    public User requireSaas(Authentication authentication) {
        User user = currentUser(authentication);
        if (user.getRole() != RoleEnum.ADMIN_SAAS) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces reserve a l'administration SaaS.");
        }
        return user;
    }

    public User requireDealer(Authentication authentication) {
        User user = currentUser(authentication);
        if (user.getRole() != RoleEnum.DEALER_ADMIN || user.getDealer() == null
                || user.getDealer().getStatus() != DealerStatusEnum.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces reserve aux concessionnaires.");
        }
        return user;
    }

    public User requireBank(Authentication authentication) {
        User user = currentUser(authentication);
        if (user.getRole() != RoleEnum.ADMIN_SAAS && (user.getRole() != RoleEnum.ADMIN_BANK || user.getBank() == null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Acces reserve a la banque.");
        }
        return user;
    }
}
