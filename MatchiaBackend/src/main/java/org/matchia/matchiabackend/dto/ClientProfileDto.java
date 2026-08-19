package org.matchia.matchiabackend.dto;

import lombok.Data;
import java.time.LocalDate;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;

@Data
public class ClientProfileDto {
    private Long id;
    private String fullName;
    private String email;
    private String phone;
    private String address;
    private LocalDate birthDate;
    private String contactImageUrl;
    private String bankName;
    private long financingRequestCount;
    private UserStatusEnum status;
}
