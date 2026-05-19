package org.matchia.matchiabackend.dto;

import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
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
    private RoleEnum role;
    private UserStatusEnum status;
    private String password;
    private LocalDateTime createdAt;
}
