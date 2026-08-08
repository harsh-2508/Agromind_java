package com.agromind.auction.auction.dto;


import lombok.Data;
import java.time.Instant;

@Data
public class CreateAuctionRequest {
    private String name;           // e.g., "Premium Sharbati Wheat"
    private String type;           // e.g., "Wheat"
    private Double quantityKg;     // e.g., 500.0
    private Double basePrice;      // e.g., 1500.0
    private Instant startTime;     // When the Max-Heap should wake up
    private Instant endTime;       // When the gavel should drop
}
