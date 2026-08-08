package com.agromind.auction.auction.model;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class Bid {
    private Long auctionId;
    private Long  buyerId;
    private Double bidAmount;
    private Instant timestamp; //crucial for tie breaker
}
