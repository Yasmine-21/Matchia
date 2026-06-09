package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "request_module_selection")
public class RequestModuleSelection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_store_id", nullable = false)
    private RequestStoreSelection requestStore;

    private Long moduleId;
    private String moduleName;

    @Column(length = 1000)
    private String moduleDescription;

    @Column(precision = 12, scale = 2)
    private BigDecimal modulePrice;

    @Column(length = 2000)
    private String parameters;
}
