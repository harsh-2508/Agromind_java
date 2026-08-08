package com.agromind.auction.user.security;

import com.agromind.auction.user.model.User;
import com.agromind.auction.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.rmi.ServerException;
import java.util.Collections;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    private final JwtService jwtService;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException,IOException{
        final String authHeader=request.getHeader("Authorization");
        final String jwt;
        final String userEmail;

        // 1. Check if the token is missing or doesn't start with "Bearer "
        if(authHeader==null || !authHeader.startsWith("Bearer ")){
            filterChain.doFilter(request,response);
            return;
        }

        // 2. Extract the token and the email
        jwt=authHeader.substring(7); //this remove the "Bearer " prefix
        userEmail=jwtService.extractUsername(jwt);

        // 3. If email exists and user is not already authenticated in this session
        if(userEmail!=null && SecurityContextHolder.getContext().getAuthentication()==null){
            User user=userRepository.findByEmail(userEmail).orElse(null);
            if(user!=null && jwtService.isTokenValid(jwt,user)){
                UsernamePasswordAuthenticationToken authToken=new UsernamePasswordAuthenticationToken(user,null,Collections.singletonList(new SimpleGrantedAuthority("ROLE_"+user.getRole().name())));
                authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authToken);
            }
        }
        // 5. Continue to the next filter/controller
        filterChain.doFilter(request,response);
    }
}
