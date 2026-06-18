package org.matchia.matchiabackend.entity.converter;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.matchia.matchiabackend.entity.enums.RoleEnum;

@Converter(autoApply = false)
public class RoleEnumConverter implements AttributeConverter<RoleEnum, String> {

    @Override
    public String convertToDatabaseColumn(RoleEnum attribute) {
        if (attribute == null) {
            return null;
        }
        return attribute.name();
    }

    @Override
    public RoleEnum convertToEntityAttribute(String dbData) {
        if (dbData == null || dbData.isBlank()) {
            return null;
        }

        return switch (dbData) {
            case "ADMIN_SAAS", "SUPER_ADMIN" -> RoleEnum.ADMIN_SAAS;
            case "ADMIN_BANK", "ADMIN", "BANK_ADMIN" -> RoleEnum.ADMIN_BANK;
            case "CLIENT", "USER" -> RoleEnum.CLIENT;
            default -> throw new IllegalArgumentException("Unknown role value: " + dbData);
        };
    }
}
