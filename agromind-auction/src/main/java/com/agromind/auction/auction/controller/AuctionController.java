package com.agromind.auction.auction.controller;

import com.agromind.auction.auction.dto.CreateAuctionRequest;
import com.agromind.auction.auction.model.Auction;
import com.agromind.auction.auction.model.Bid;
import com.agromind.auction.auction.service.AuctionLifecycleService;
import com.agromind.auction.auction.service.BiddingEngineService;
import com.agromind.auction.user.repository.UserRepository;
import com.agromind.auction.user.model.User;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import com.agromind.auction.auction.model.Crop;
import com.agromind.auction.auction.repository.CropRepository;
import com.agromind.auction.auction.model.AuctionStatus;

import java.time.Instant;
import java.util.Map;

import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/auctions")
@RequiredArgsConstructor
public class AuctionController {

    private final BiddingEngineService biddingEngineService;
    private final AuctionLifecycleService auctionLifecycleService;
    private final com.agromind.auction.auction.repository.AuctionRepository auctionRepository; //inject the repository
    private final UserRepository userRepository;
    private final CropRepository cropRepository;

    @PostMapping
    public ResponseEntity<Auction> createAuction(@RequestBody Auction requestPayload) {

        // 1. Get the securely logged-in farmer's email from the JWT
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User farmer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Farmer not found"));

        // 2. Extract the crop details sent by React and link it to the Farmer
        Crop newCrop = requestPayload.getCrop();
        newCrop.setFarmer(farmer);
        
        // Save the crop to the database first
        Crop savedCrop = cropRepository.save(newCrop);

        // 3. Create a brand new Auction for this crop
        Auction newAuction = new Auction();
        newAuction.setCrop(savedCrop);
        newAuction.setStatus(AuctionStatus.PENDING); // Always starts as PENDING!

        // Save the auction to the database
        Auction savedAuction = auctionRepository.save(newAuction);

        // 4. Return the fully saved object back to React (which instantly adds it to the UI grid)
        return ResponseEntity.ok(savedAuction);
    }


        @GetMapping("/my-auctions")
    public ResponseEntity<List<Auction>> getMyAuctions() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        User farmer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Farmer not found"));

        // --- THE FIX: Call the updated repository method name ---
        List<Auction> myAuctions = auctionRepository.findByCrop_Farmer_Id(farmer.getId());
        
        return ResponseEntity.ok(myAuctions);
    }


    // --- THIS IS FOR THE BUYER DASHBOARD ---
    // Returns the global marketplace of all auctions
    @GetMapping("/all")
    public ResponseEntity<List<Auction>> getAllAuctions() {
        List<Auction> allAuctions = auctionRepository.findAll();
        return ResponseEntity.ok(allAuctions);
    }



//    0.create the crop and auction in the database
    @PostMapping("/create")
    public ResponseEntity<Map<String,String>> createAuction(@RequestBody CreateAuctionRequest request){
        Auction savedAuction=auctionLifecycleService.createAuction(request);
        return ResponseEntity.ok(Map.of(
                "message","Crop and auction created successfully!",
        "auctionID",savedAuction.getId().toString()
        ));
    }


    // 1. Initialize the Heap for a specific crop listing
    // 1. Initialize the Heap for a specific crop listing
    @PostMapping("/{auctionId}/start")
    public ResponseEntity<String> startAuction(@PathVariable Long auctionId){
        // Start the in-memory Max-Heap
        biddingEngineService.startAuction(auctionId);

        // --- THE FIX: Update the database status to ACTIVE ---
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        auction.setStatus(AuctionStatus.ACTIVE);
        auction.setStartTime(Instant.now()); // Record exactly when it started

        auctionRepository.save(auction); // Save the ACTIVE status to PostgreSQL!

        return ResponseEntity.ok("Auction " + auctionId + " started successfully. Ready for bids!");
    }


    // 2. place a bid(O(log n) insertion)
    @PostMapping("/bid")
    public ResponseEntity<String> placeBid(@RequestBody Bid incomingBid){
        // PRO TIP: In a real enterprise app, you would extract the buyerId from the JWT context.
        // We also stamp the exact server time here so buyers can't hack their computer clocks to cheat tie-breakers.
        incomingBid.setTimestamp(Instant.now());

        boolean accepted= biddingEngineService.placeBid(incomingBid);
        if(accepted){
            return ResponseEntity.ok("Bid accepted into the Max-Heap");
        }
        else{
            return ResponseEntity.badRequest().body("Bid rejected.you must bid higher than the current maximum");
        }
    }

    // 4. Close the Auction and Announce Winner
    @PostMapping("/{auctionId}/close")
    public ResponseEntity<String> closeAuction(@PathVariable Long auctionId){
        // Shut down the Max-Heap and pop the winner
        Bid winningBid = biddingEngineService.closeAuction(auctionId);

        // --- THE FIX: Update the database status to COMPLETED ---
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        auction.setStatus(AuctionStatus.COMPLETED);
        auction.setEndTime(Instant.now()); // Record exactly when it ended

        // If someone actually won, save their ID and the amount to the database!
        if (winningBid != null) {
            auction.setWinningBidAmount(winningBid.getBidAmount());
            User buyer = userRepository.findById(winningBid.getBuyerId()).orElse(null);
            auction.setWinningBuyer(buyer);
        }

        auctionRepository.save(auction); // Save the COMPLETED status to PostgreSQL!

        if(winningBid == null){
            return ResponseEntity.ok("Auction " + auctionId + " closed with no bids.");
        }
        return ResponseEntity.ok("Auction closed! Winner is Buyer " + winningBid.getBuyerId() + " with a massive bid for Rs." + winningBid.getBidAmount());
    }



    // 3. Get Current Highest Bid (O(1) Instant Lookup)
    @GetMapping("/{auctionId}/highest")
    public ResponseEntity<Bid> getHighestBid(@PathVariable Long auctionId){
        Bid highestBid=biddingEngineService.getHighestBid(auctionId);
        if(highestBid==null){
            return ResponseEntity.notFound().build();
        }
        else{
            return ResponseEntity.ok(highestBid);
        }
    }







}
