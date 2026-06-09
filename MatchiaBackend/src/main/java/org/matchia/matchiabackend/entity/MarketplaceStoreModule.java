package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "marketplace_store_module", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"marketplace_store_id", "module_id"})
})
public class MarketplaceStoreModule {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marketplace_store_id")
    private MarketplaceStore marketplaceStore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    private Module module;


    private Boolean enabled;
    private Boolean visible;




}
