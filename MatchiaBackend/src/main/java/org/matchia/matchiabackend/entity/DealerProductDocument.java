package org.matchia.matchiabackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Entity
@Getter @Setter @NoArgsConstructor
@Table(name = "dealer_product_document")
public class DealerProductDocument {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id", nullable = false) @JsonIgnore private DealerProduct product;
    @Column(name = "document_type", nullable = false, length = 100) private String documentType;
    @Column(name = "file_name", nullable = false) private String fileName;
    @Column(name = "file_path", nullable = false) private String filePath;
    @Column(name = "public_document", nullable = false) private boolean publicDocument;
    @CreationTimestamp @Column(name = "uploaded_at", updatable = false) private LocalDateTime uploadedAt;
}
