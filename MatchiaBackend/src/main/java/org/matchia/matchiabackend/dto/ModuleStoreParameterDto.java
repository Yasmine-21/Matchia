package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModuleStoreParameterDto {
    private Long id;
    private String name;
    private String code;
    private String type;
    private boolean required;
}