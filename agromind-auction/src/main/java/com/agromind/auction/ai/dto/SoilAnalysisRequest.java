package com.agromind.auction.ai.dto;

import lombok.Data;

@Data
public class SoilAnalysisRequest {
    private double nitrogen;   // N level
    private double phosphorus; // P level
    private double potassium;  // K level
    private double phLevel;    // Soil pH
    private String region;     // e.g., "Madhya Pradesh"
}