package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;

/** Optional bank/store override for the documents expected by a financing request. */
@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "required_financing_document", uniqueConstraints = @UniqueConstraint(columnNames = {"bank_id", "store_id", "document_type"}))
public class RequiredFinancingDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "bank_id", nullable = false) private Bank bank;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "store_id", nullable = false) private Store store;
    @Column(name = "document_type", nullable = false, length = 100) private String documentType;
    @Column(nullable = false, length = 150) private String label;
    @Column(nullable = false) private boolean required = true;
    @Column(nullable = false) private boolean active = true;
}
