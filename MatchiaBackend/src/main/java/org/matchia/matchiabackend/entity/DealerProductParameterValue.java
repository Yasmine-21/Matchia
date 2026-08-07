package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "dealer_product_parameter_value", uniqueConstraints =
        @UniqueConstraint(columnNames = {"dealer_product_id", "parameter_definition_id"}))
public class DealerProductParameterValue {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "dealer_product_id", nullable = false) private DealerProduct product;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "parameter_definition_id", nullable = false) private ProductParameterDefinition parameterDefinition;
    @Column(length = 2000) private String value;
}
