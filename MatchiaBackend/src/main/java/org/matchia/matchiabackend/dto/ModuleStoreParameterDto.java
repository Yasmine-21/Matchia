package org.matchia.matchiabackend.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ModuleStoreParameterDto {
    private Long id;
    private String name;
    private String code;
    private String type;
    private boolean required;
    private String value;
    private List<String> options;
}
