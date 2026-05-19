package org.matchia.matchiabackend.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "module_store_parameter")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ModuleStoreParameter {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "module_store_id")
    @JsonIgnore
    private ModuleStore moduleStore;

    private String code;
    private String label;
    private String type;
    private Boolean required;
}
