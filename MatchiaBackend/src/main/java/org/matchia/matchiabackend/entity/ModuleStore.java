package org.matchia.matchiabackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
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
@AllArgsConstructor
@NoArgsConstructor
@Table(name = "module_store")
public class ModuleStore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    @JsonIgnoreProperties("moduleStores")
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_id")
    @JsonIgnoreProperties("moduleStores")
    private Module module;

@OneToMany(mappedBy = "moduleStore", cascade = CascadeType.ALL)
private List<ModuleStoreParameter> parameters = new ArrayList<>();

    private Boolean actif;
    private Integer ordre;

    @Column(precision = 12, scale = 2)
    private BigDecimal price;


}
