package com.agromind.auction.auction.model;
import jakarta.persistence.*;

import java.time.Instant;
import com.agromind.auction.user.model.User;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


@Entity
@Table(name="auctions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Auction {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // // ONE Auction is tied to ONE Crop listing
    // @OneToOne
    // @JoinColumn(name="crop_id",nullable = false)
    @ManyToOne(fetch = FetchType.EAGER) // Make sure this is EAGER!
    @JoinColumn(name = "crop_id", nullable = false)
    @JsonIgnoreProperties({"farmer", "auctions"}) // Prevents infinite JSON loops!
    private Crop crop;

    private Instant startTime;
    private Instant endTime;

    @Enumerated(EnumType.STRING)
    private AuctionStatus status=AuctionStatus.PENDING;

    // These fields remain null UNTIL the Max-Heap drops the gavel
    private Double winningBidAmount;

    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="winnning_buyer_id")
    private User winningBuyer;
}
