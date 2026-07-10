package org.matchia.matchiabackend.ai.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAskRequest {

    @NotBlank(message = "La question est obligatoire.")
    private String question;

    private String currentPage;

    private Long bankId;

    private Long marketplaceId;

    private Long storeId;
}
