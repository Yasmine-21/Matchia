package org.matchia.matchiabackend.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;
import java.time.LocalDate;

@Data
public class ClientRegistrationRequest {
    @NotBlank private String bankSlug;
    @NotBlank private String fullName;
    @Email @NotBlank private String email;
    @NotBlank private String phone;
    @NotBlank private String password;
    @NotBlank private String confirmPassword;
    @NotNull private LocalDate birthDate;
    @NotBlank private String address;
    private String contactImageUrl;
}
