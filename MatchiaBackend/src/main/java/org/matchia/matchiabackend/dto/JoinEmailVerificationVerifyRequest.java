package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record JoinEmailVerificationVerifyRequest(
        @NotBlank(message = "L'adresse e-mail est obligatoire.")
        @Email(message = "L'adresse e-mail doit etre valide.")
        @Size(max = 254, message = "L'adresse e-mail est trop longue.")
        String email,

        @NotBlank(message = "Le code de verification est obligatoire.")
        @Pattern(regexp = "^\\d{6}$", message = "Le code de verification doit contenir exactement 6 chiffres.")
        String code
) {
}
