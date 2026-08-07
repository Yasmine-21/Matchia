package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.matchia.matchiabackend.entity.enums.DealerRequestStatusEnum;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "dealer_account_request")
public class DealerAccountRequest {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "company_name", nullable = false) private String companyName;
    @Column(name = "registration_number", nullable = false) private String registrationNumber;
    @Column(nullable = false, length = 1000) private String address;
    @Column(name = "contact_person", nullable = false) private String contactPerson;
    @Column(nullable = false) private String email;
    @Column(nullable = false) private String phone;
    @Column(name = "logo_url") private String logoUrl;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ElementCollection
    @CollectionTable(name = "dealer_request_document", joinColumns = @JoinColumn(name = "request_id"))
    @Column(name = "document_url", nullable = false)
    private List<String> documentUrls = new ArrayList<>();

    @Enumerated(EnumType.STRING) @Column(nullable = false)
    private DealerRequestStatusEnum status;
    @Column(name = "rejection_reason", length = 1000) private String rejectionReason;
    @CreationTimestamp @Column(name = "submitted_at", updatable = false) private LocalDateTime submittedAt;
    @Column(name = "processed_at") private LocalDateTime processedAt;
}
