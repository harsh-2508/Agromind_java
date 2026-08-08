package com.agromind.auction.auction.model;

public enum AuctionStatus {
    PENDING,    // Created by the farmer, waiting to start
    ACTIVE,     // Currently living in the RAM Max-Heap!
    COMPLETED,  // Finished, winner decided
    CANCELLED   // Farmer cancelled it
}

