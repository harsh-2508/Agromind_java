package com.agromind.auction.user.repository;

import com.agromind.auction.user.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // Spring magically writes the SQL for this just by reading the method name!
    Optional<User> findByEmail(String email);
}
