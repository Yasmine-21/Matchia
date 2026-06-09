package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "request")
public class Request {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id")
    private Bank bank;

    @Enumerated(EnumType.STRING)
    private RequestTypeEnum requestType;

    @Enumerated(EnumType.STRING)
    private RequestStatusEnum status;

    private String priority;
    private String createdBy;
    private String bankName;
    private String bankEmail;
    private String logoUrl;
    private String country;
    private String website;
    private String contactName;
    private String contactEmail;
    private String contactPhone;
    private String contactImageUrl;


    private String description;
    @Column(length = 1000)
    private String bankDescription;
    private Integer establishmentYear;

    @Column(unique = true)
    private String marketplaceSlug;

    @Column(length = 500)
    private String marketplaceDescription;

    @Column(length = 7)
    private String primaryColor;

    @Column(length = 7)
    private String secondaryColor;

    private String banniereUrl;

    private String selectedStores;

   
    private String selectedModules;

    private Double totalAmount;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestStoreSelection> selectedStoreDetails = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "request_store",
            joinColumns = @JoinColumn(name = "request_id"),
            inverseJoinColumns = @JoinColumn(name = "store_id")
    )
    private List<Store> stores = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "request_module",
            joinColumns = @JoinColumn(name = "request_id"),
            inverseJoinColumns = @JoinColumn(name = "module_id")
    )
    private List<Module> modules = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
