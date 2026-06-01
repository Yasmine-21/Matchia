package org.matchia.matchiabackend.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String token;
    private String email;
    private String role;
    private String bankSlug;
    private String name;
}
