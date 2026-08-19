package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor @AllArgsConstructor
@Table(name = "financing_request_document", uniqueConstraints = @UniqueConstraint(columnNames = {"financing_request_id", "document_type"}))
public class FinancingRequestDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "financing_request_id", nullable = false)
    private FinancingRequest financingRequest;
    @Column(name = "document_type", nullable = false, length = 100) private String documentType;
    @Column(nullable = false, length = 255) private String originalFilename;
    @Column(nullable = false, unique = true, length = 255) private String storedFilename;
    @Column(length = 100) private String contentType;
    private Long fileSize;
    @CreationTimestamp @Column(nullable = false, updatable = false) private LocalDateTime uploadedAt;
}
