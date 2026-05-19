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
@Table(name = "bank_store", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "bank_id", "store_id" })
})
public class BankStore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id")
    private Bank bank;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @OneToMany(mappedBy = "bankStore", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<BankStoreModule> bankStoreModules = new ArrayList<>();

    private Boolean enabled;
    private Boolean visible;

}