package com.agromind.auction.ai.service;

import com.agromind.auction.ai.dto.SoilAnalysisRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ResponseEntity;

import java.util.List;
import java.util.Map;
import java.util.Base64;

@Service
public class GeminiService {

    // Automatically grabs the key you put in application.properties/yml.
    @Value("${gemini.api.key:MISSING_API_KEY}")
    private String geminiApiKey;

    private static final String GEMINI_API_URL =
            "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=";

    public String analyzeSoil(SoilAnalysisRequest request) {
        // 1. We construct a highly specific Prompt Engineering string
        String prompt = String.format(
                "Act as an expert agronomist in %s, India. " +
                        "My soil has the following parameters: Nitrogen (N): %.2f, Phosphorus (P): %.2f, " +
                        "Potassium (K): %.2f, and pH level: %.2f. " +
                        "Based strictly on this data, provide a short, highly professional recommendation (under 100 words) " +
                        "stating the top 2 most profitable crops to grow and a quick fertilizer suggestion.",
                request.getRegion(), request.getNitrogen(), request.getPhosphorus(),
                request.getPotassium(), request.getPhLevel()
        );

        // 2. We format the request exactly how the Gemini API expects it
        Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                        Map.of("parts", List.of(
                                Map.of("text", prompt)
                        ))
                )
        );

        // 3. We use RestTemplate to fire the HTTP POST request to Google's servers
        RestTemplate restTemplate = new RestTemplate();
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        try {
            // Send the request and get the raw JSON response
            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_API_URL + geminiApiKey,
                    entity,
                    Map.class
            );

            // 4. Navigate through Google's nested JSON response to extract the actual AI text
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");

            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            System.err.println("Gemini API Error: " + e.getMessage());
            return "AI Analysis currently unavailable. Please check soil parameters manually.";
        }
    }

    // --- NEW: Crop Disease Vision AI ---
    public String analyzeCropDisease(MultipartFile file) {
        try {
            // 1. Convert the image to Base64 so Gemini can read it over JSON
            String base64Image = Base64.getEncoder().encodeToString(file.getBytes());
            String mimeType = file.getContentType();
            if (mimeType == null) mimeType = "image/jpeg";

            // 2. Build the specific JSON structure Gemini requires for multimodal (Image + Text)
            Map<String, Object> inlineData = Map.of(
                    "mime_type", mimeType,
                    "data", base64Image
            );
            Map<String, Object> imagePart = Map.of("inline_data", inlineData);
            
            // The prompt directing the AI on what to look for
            Map<String, Object> textPart = Map.of("text", 
                "You are an expert agronomist in India. Analyze this crop image. " +
                "If the crop is healthy, say so. If there is a disease, nutrient deficiency, or pest issue, identify it, " +
                "explain the likely cause, and recommend specific local treatments, medicines, or organic remedies. " +
                "Format your response with clear, easy-to-read headings and bullet points."
            );

            // Combine text and image into the parts array
            Map<String, Object> requestBody = Map.of(
                "contents", List.of(
                    Map.of("parts", List.of(textPart, imagePart))
                )
            );

            // 3. Send the request
            RestTemplate restTemplate = new RestTemplate();
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

            Map<String, Object> response = restTemplate.postForObject(
                    GEMINI_API_URL + geminiApiKey,
                    entity,
                    Map.class
            );

            // 4. Extract the markdown text from Gemini's response
            List<Map<String, Object>> candidates = (List<Map<String, Object>>) response.get("candidates");
            Map<String, Object> content = (Map<String, Object>) candidates.get(0).get("content");
            List<Map<String, Object>> parts = (List<Map<String, Object>>) content.get("parts");
            
            return (String) parts.get(0).get("text");

        } catch (Exception e) {
            System.err.println("Gemini Vision API Error: " + e.getMessage());
            return "Failed to analyze image: " + e.getMessage();
        }
    }
}
