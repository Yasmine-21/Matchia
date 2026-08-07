package org.matchia.matchiabackend.dto;

import lombok.Data;

@Data
public class AuthResponse {
    private String id;
    private String token;
    private String accessToken;
    private String email;
    private String phone;
    private String address;
    private String role;
    private String bankSlug;
    private String bankId;
    private String dealerId;
    private String name;
    private String contactImageUrl;
}
