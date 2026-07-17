package org.matchia.matchiabackend.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AiAskRequest {

    @NotBlank(message = "La question est obligatoire.")
    @Size(max = 2000, message = "La question ne doit pas dépasser 2000 caractères.")
    private String question;

    private String currentPage;

    private Long bankId;

    private Long marketplaceId;

    private Long storeId;
}
