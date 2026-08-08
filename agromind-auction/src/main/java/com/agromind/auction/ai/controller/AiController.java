package com.agromind.auction.ai.controller;

import com.agromind.auction.ai.dto.SoilAnalysisRequest;
import com.agromind.auction.ai.service.GeminiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile; // <-- NEW: Required for handling file uploads

import java.util.Map;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
public class AiController {

    private final GeminiService geminiService;

    @PostMapping("/analyze-soil")
    public ResponseEntity<Map<String, String>> analyzeSoil(@RequestBody SoilAnalysisRequest request) {
        // Call the AI Service
        String aiRecommendation = geminiService.analyzeSoil(request);

        // Wrap the response in a JSON object for the frontend
        return ResponseEntity.ok(Map.of("recommendation", aiRecommendation));
    }

    // --- NEW: Crop Disease Vision AI Endpoint ---
    @PostMapping("/analyze-disease")
    public ResponseEntity<Map<String, String>> analyzeDisease(@RequestParam("image") MultipartFile image) {
        // Pass the uploaded image file to the Gemini service
        String aiRecommendation = geminiService.analyzeCropDisease(image);
        
        // Wrap the response in the exact same JSON format so React can read it
        return ResponseEntity.ok(Map.of("recommendation", aiRecommendation));
    }
}