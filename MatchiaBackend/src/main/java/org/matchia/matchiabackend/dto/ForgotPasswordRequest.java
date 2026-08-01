package org.matchia.matchiabackend.dto;

import lombok.Data;

@Data
public class ForgotPasswordRequest {
    private String email;
    private String identifier;
}
