package com.agromind.auction.user.service;

import com.agromind.auction.user.dto.LoginRequest;
import com.agromind.auction.user.model.User;
import com.agromind.auction.user.repository.UserRepository;
import com.agromind.auction.user.security.JwtService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService; //injecting jwt tool

    public Map<String, Object> registerUser(User user) {
        // 1. Check if email exists
        if (userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new RuntimeException("Email is already registered!");
        }
        
        // 2. Hash the password securely
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        
        // 3. Save to database
        User savedUser = userRepository.save(user);

        // 4. Generate token so they are instantly logged in upon registration!
        String token = jwtService.generateToken(savedUser);

        // 5. Return the Token AND the User details to React
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("message", "Registration Successful");
        response.put("user", Map.of(
                "id", savedUser.getId(),
                "email", savedUser.getEmail(),
                "role", savedUser.getRole().name()
        ));
        
        return response;
    }

    public Map<String, Object> loginUser(LoginRequest request){
        // 1. Find user by email
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found!"));
                
        // DEBUG: This will print in your IntelliJ console so we can see what password React actually sent!
        System.out.println("Attempting login for: " + request.getEmail() + " | Password received: [" + request.getPassword() + "]");

        // 2. Check if raw password matches the hashed password in DB
        if(!passwordEncoder.matches(request.getPassword(), user.getPassword())){
            throw new RuntimeException("Invalid Password");
        }
        
        // 3. Passwords match! Generate the VIP Wristband (Token)
        String token = jwtService.generateToken(user);
        
        // 4. Return the Token AND the User details to React
        Map<String, Object> response = new HashMap<>();
        response.put("token", token);
        response.put("message", "Login Successful");
        response.put("user", Map.of(
                "id", user.getId(),
                "email", user.getEmail(),
                "role", user.getRole().name()
        ));
        
        return response;
    }
}
