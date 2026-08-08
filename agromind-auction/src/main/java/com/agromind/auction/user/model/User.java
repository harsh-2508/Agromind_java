package com.agromind.auction.user.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User implements UserDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Role role;

    // --- THE FIX: Add these Transient fields to catch the React JSON ---
    @Transient // Tells Hibernate NOT to look for these columns in the DB
    private String firstName;

    @Transient
    private String lastName;

    // This is the actual column in the PostgreSQL database
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private Instant createdAt;

    // --- THE FIX: Automatically combine names before saving to the DB ---
    @PrePersist
    public void generateFullName() {
        if (this.fullName == null || this.fullName.isEmpty()) {
            String first = this.firstName != null ? this.firstName : "";
            String last = this.lastName != null ? this.lastName : "";
            this.fullName = (first + " " + last).trim();

            // Fallback just in case both are empty so the DB doesn't crash
            if (this.fullName.isEmpty()) {
                this.fullName = "Unknown User";
            }
        }
    }

    // --- UserDetails Methods ---

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return List.of(new SimpleGrantedAuthority("ROLE_" + role.name()));
    }

    @Override
    public String getUsername() {
        return email;
    }

    @Override
    public boolean isAccountNonExpired() {
        return true;
    }

    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }
}
