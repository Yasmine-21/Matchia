package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "request_store_selection")
public class RequestStoreSelection {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false)
    private Request request;

    private Long storeId;
    private String storeName;

    @Column(length = 1000)
    private String storeDescription;

    @Column(precision = 12, scale = 2)
    private BigDecimal storePrice;

    @OneToMany(mappedBy = "requestStore", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestModuleSelection> modules = new ArrayList<>();
}
