package org.matchia.matchiabackend.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.matchia.matchiabackend.entity.enums.RoleEnum;
import org.matchia.matchiabackend.entity.enums.UserStatusEnum;
import java.time.LocalDateTime;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "bank_id")
    private Bank bank;

    private String fullName;
    private String email;
    private String phone;
    private String contactImageUrl;

    @Enumerated(EnumType.STRING)
    private RoleEnum role;

    @Enumerated(EnumType.STRING)
    private UserStatusEnum status;

    private String password;

    @CreationTimestamp
    private LocalDateTime createdAt;



}
