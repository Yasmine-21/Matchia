package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import com.fasterxml.jackson.annotation.JsonProperty;
import org.matchia.matchiabackend.entity.enums.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDto {
    private Long id;
    private Long bankId;
    private String fullName;
    private String email;
    private String phone;
    private String contactImageUrl;
    private RoleEnum role;
    private UserStatusEnum status;
    @JsonProperty(access = JsonProperty.Access.WRITE_ONLY)
    private String password;
    private LocalDateTime createdAt;
}
