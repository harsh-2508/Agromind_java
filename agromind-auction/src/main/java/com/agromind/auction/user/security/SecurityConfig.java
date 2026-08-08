package com.agromind.auction.user.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
// Cors
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import java.util.Arrays;

@Configuration
@EnableWebSecurity // Forces Spring to prioritize OUR rules over the defaults
@RequiredArgsConstructor
public class SecurityConfig {


    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private final JwtAuthenticationFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http    .cors(cors->cors.configurationSource(corsConfigurationSource())) // ADD THIS LINE TO ENABLE CORS
                .csrf(AbstractHttpConfigurer::disable) // Kills the default CSRF block for REST APIs
                .formLogin(AbstractHttpConfigurer::disable) // Disable form login — not needed for REST APIs
                .httpBasic(AbstractHttpConfigurer::disable) // Disable HTTP Basic — prevents auth popups/interference
                .sessionManagement(session -> session
                        .sessionCreationPolicy(SessionCreationPolicy.STATELESS)) // REST APIs should be stateless
                .authorizeHttpRequests(auth -> auth

                        // Allow WebSockets through the security filter!
                        .requestMatchers("/ws-auction/**").permitAll()

                        // Explicitly allow POST requests to this exact URL
                        .requestMatchers("/api/auctions/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/users/register","/api/users/login","/api/ai/analyze-soil").permitAll()
                        .requestMatchers("/error").permitAll()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter,org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter.class);


        return http.build();


    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource(){
        CorsConfiguration configuration=new CorsConfiguration();
        // Allow your React app's local address
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:5173","https://agromind-java.vercel.app"));
        configuration.setAllowedMethods(Arrays.asList("GET","POST","DELETE","PATCH","PUT","OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization","Content-Type","x-auth-token"));
        configuration.setExposedHeaders(Arrays.asList("x-auth-token"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source=new UrlBasedCorsConfigurationSource();
        // Apply these rules to all endpoints in your API
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
}