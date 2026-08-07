package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.matchia.matchiabackend.entity.enums.RequestStatusEnum;
import org.matchia.matchiabackend.entity.enums.RequestTypeEnum;
import org.matchia.matchiabackend.validation.JoinRequestValidation;

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
    @Column(length = 1000)
    private String rejectionReason;
    private String createdBy;
    @NotBlank(groups = JoinRequestValidation.class, message = "Le nom de la banque est obligatoire.")
    @Size(groups = JoinRequestValidation.class, max = 150, message = "Le nom de la banque ne doit pas depasser 150 caracteres.")
    private String bankName;

    @NotBlank(groups = JoinRequestValidation.class, message = "L'email de la banque est obligatoire.")
    @Email(groups = JoinRequestValidation.class, message = "L'email de la banque doit etre valide.")
    @Size(groups = JoinRequestValidation.class, max = 254, message = "L'email de la banque est trop long.")
    private String bankEmail;

    @NotBlank(groups = JoinRequestValidation.class, message = "Le telephone de la banque est obligatoire.")
    @Pattern(
            groups = JoinRequestValidation.class,
            regexp = "^\\+216\\d{8}$",
            message = "Le telephone doit commencer par +216 et contenir exactement 8 chiffres."
    )
    private String bankPhone;

    @NotBlank(groups = JoinRequestValidation.class, message = "Le logo de la banque est obligatoire.")
    private String logoUrl;
    private String country;
    @Size(groups = JoinRequestValidation.class, max = 255, message = "L'URL du site web ne doit pas depasser 255 caracteres.")
    private String website;
    @NotBlank(groups = JoinRequestValidation.class, message = "Le nom du contact principal est obligatoire.")
    @Size(groups = JoinRequestValidation.class, max = 150, message = "Le nom du contact ne doit pas depasser 150 caracteres.")
    private String contactName;

    @NotBlank(groups = JoinRequestValidation.class, message = "L'email du contact principal est obligatoire.")
    @Email(groups = JoinRequestValidation.class, message = "L'email du contact principal doit etre valide.")
    @Size(groups = JoinRequestValidation.class, max = 254, message = "L'email du contact principal est trop long.")
    private String contactEmail;

    @NotBlank(groups = JoinRequestValidation.class, message = "Le telephone du contact principal est obligatoire.")
    @Pattern(
            groups = JoinRequestValidation.class,
            regexp = "^\\+216\\d{8}$",
            message = "Le telephone du contact doit commencer par +216 et contenir exactement 8 chiffres."
    )
    private String contactPhone;

    @NotBlank(groups = JoinRequestValidation.class, message = "L'image du contact principal est obligatoire.")
    private String contactImageUrl;


    @Column(length = 1000)
    private String description;
    @Column(length = 3000)
    @Size(groups = JoinRequestValidation.class, max = 1000, message = "La description de la banque ne doit pas depasser 1000 caracteres.")
    private String bankDescription;

    @Min(groups = JoinRequestValidation.class, value = 1901, message = "L'annee d'etablissement doit etre strictement superieure a 1900.")
    @Max(groups = JoinRequestValidation.class, value = 9999, message = "L'annee d'etablissement doit contenir exactement 4 chiffres.")
    private Integer establishmentYear;

    @NotBlank(groups = JoinRequestValidation.class, message = "Le slug marketplace est obligatoire.")
    @Pattern(
            groups = JoinRequestValidation.class,
            regexp = "^[a-z0-9-]+$",
            message = "Le slug marketplace doit contenir uniquement des minuscules, chiffres et tirets."
    )
    @Size(groups = JoinRequestValidation.class, max = 100, message = "Le slug marketplace ne doit pas depasser 100 caracteres.")
    private String marketplaceSlug;

    @Column(length = 1000)
    @NotBlank(groups = JoinRequestValidation.class, message = "La description marketplace est obligatoire.")
    @Size(groups = JoinRequestValidation.class, max = 500, message = "La description marketplace ne doit pas depasser 500 caracteres.")
    private String marketplaceDescription;

    @Column(length = 7)
    @NotBlank(groups = JoinRequestValidation.class, message = "La couleur primaire est obligatoire.")
    @Pattern(groups = JoinRequestValidation.class, regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur primaire doit etre une couleur hexadecimale valide.")
    private String primaryColor;

    @Column(length = 7)
    @NotBlank(groups = JoinRequestValidation.class, message = "La couleur secondaire est obligatoire.")
    @Pattern(groups = JoinRequestValidation.class, regexp = "^#[0-9A-Fa-f]{6}$", message = "La couleur secondaire doit etre une couleur hexadecimale valide.")
    private String secondaryColor;

    @NotBlank(groups = JoinRequestValidation.class, message = "La banniere marketplace est obligatoire.")
    private String banniereUrl;

    private String selectedStores;

   
    private String selectedModules;

    @NotNull(groups = JoinRequestValidation.class, message = "Le total mensuel est obligatoire.")
    @Min(groups = JoinRequestValidation.class, value = 0, message = "Le total mensuel doit etre superieur ou egal a 0.")
    private Double totalAmount;

    /** The initial request retained as the commercial source of a renewal. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "original_request_id")
    private Request originalRequest;

    /** Present only for a renewal request. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private Subscription subscription;

    @OneToMany(mappedBy = "request", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<RequestStoreSelection> selectedStoreDetails = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "request_store",
            joinColumns = @JoinColumn(name = "request_id"),
            inverseJoinColumns = @JoinColumn(name = "store_id")
    )
    @Size(groups = JoinRequestValidation.class, min = 1, message = "Au moins un store doit etre selectionne.")
    private List<Store> stores = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "request_module",
            joinColumns = @JoinColumn(name = "request_id"),
            inverseJoinColumns = @JoinColumn(name = "module_id")
    )
    @Size(groups = JoinRequestValidation.class, min = 1, message = "Au moins un module doit etre selectionne.")
    private List<Module> modules = new ArrayList<>();

    @CreationTimestamp
    private LocalDateTime createdAt;

    @UpdateTimestamp
    private LocalDateTime updatedAt;
}
