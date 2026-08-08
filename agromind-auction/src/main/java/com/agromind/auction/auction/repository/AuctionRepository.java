package com.agromind.auction.auction.repository;

import com.agromind.auction.auction.model.Auction;
import com.agromind.auction.auction.model.AuctionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface AuctionRepository extends JpaRepository<Auction, Long> {
    
    List<Auction> findByStatus(AuctionStatus status);
    
    // --- THE FIX ---
    // Spring Data JPA reads this as: Find auctions where the associated Crop's Farmer's ID matches.
    // Because the method name perfectly matches the object graph, we don't even need the @Query annotation!
    List<Auction> findByCrop_Farmer_Id(Long farmerId);
}



