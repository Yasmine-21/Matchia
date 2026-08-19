package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "marketplace_store", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "marketplace_id", "store_id" })
})
public class MarketplaceStore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "marketplace_id")
    private Marketplace marketplace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @OneToMany(mappedBy = "marketplaceStore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<MarketplaceStoreModule> marketplaceStoreModules = new ArrayList<>();

    private Boolean enabled;
    private Boolean visible;

    /**
     * Banner configured by a bank for this exact marketplace/store pair.
     * It intentionally does not live on {@link Store}: a catalog store can be
     * used by several marketplaces and each marketplace needs its own image.
     */
    @Column(name = "banner_image_url")
    private String bannerImageUrl;

}
