package org.matchia.matchiabackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.DealerProductStatusEnum;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "dealer_product")
public class DealerProduct {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "dealer_id", nullable = false) private Dealer dealer;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "store_id", nullable = false) private Store store;
    @Column(nullable = false) private String name;
    @Column(length = 3000) private String description;
    @Column(precision = 14, scale = 2, nullable = false) private BigDecimal price;
    @Column(name = "image_url") private String imageUrl;
    @Column(name = "eligibility_conditions", length = 3000) private String eligibilityConditions;
    @Enumerated(EnumType.STRING) @Column(nullable = false) private DealerProductStatusEnum status;
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    @JsonIgnore private List<DealerProductParameterValue> parameterValues = new ArrayList<>();
    @CreationTimestamp @Column(name = "created_at", updatable = false) private LocalDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at") private LocalDateTime updatedAt;
}
