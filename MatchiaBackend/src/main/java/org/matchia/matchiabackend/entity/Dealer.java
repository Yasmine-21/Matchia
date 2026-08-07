package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.DealerStatusEnum;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "dealer", uniqueConstraints = {
        @UniqueConstraint(columnNames = "registration_number"),
        @UniqueConstraint(columnNames = "email")
})
public class Dealer {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "company_name", nullable = false)
    private String companyName;

    @Column(name = "registration_number", nullable = false)
    private String registrationNumber;

    @Column(nullable = false, length = 1000)
    private String address;

    @Column(name = "contact_person", nullable = false)
    private String contactPerson;

    @Column(nullable = false)
    private String email;

    @Column(nullable = false)
    private String phone;

    @Column(name = "logo_url")
    private String logoUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private DealerStatusEnum status;

    @CreationTimestamp @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
