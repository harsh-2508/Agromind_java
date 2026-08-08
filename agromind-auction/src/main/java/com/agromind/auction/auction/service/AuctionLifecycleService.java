package com.agromind.auction.auction.service;

import com.agromind.auction.auction.dto.CreateAuctionRequest;
import com.agromind.auction.auction.model.Auction;
import com.agromind.auction.auction.model.AuctionStatus;
import com.agromind.auction.auction.model.Bid;
import com.agromind.auction.auction.model.Crop;
import com.agromind.auction.auction.repository.AuctionRepository;
import com.agromind.auction.auction.repository.CropRepository;
import com.agromind.auction.user.model.User;
import com.agromind.auction.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuctionLifecycleService {

    private final AuctionRepository auctionRepository;
    private final CropRepository cropRepository;
    private final UserRepository userRepository;
    private final BiddingEngineService biddingEngineService;

    /**
     * Phase 0: Creating the Crop and Auction securely in PostgreSQL
     */
    @Transactional
    public Auction createAuction(CreateAuctionRequest request) {
        // 1. Grab the raw object from the Security Context
        Object principal = SecurityContextHolder.getContext().getAuthentication().getPrincipal();

        String email;

        // 2. Safely cast it to your User entity to extract JUST the email
        if (principal instanceof User) {
            email = ((User) principal).getEmail();
        } else if (principal instanceof org.springframework.security.core.userdetails.UserDetails) {
            email = ((org.springframework.security.core.userdetails.UserDetails) principal).getUsername();
        } else {
            email = principal.toString(); // Fallback
        }

        // 3. Now search the database with a clean email!
        User farmer = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Farmer not found in database for email: " + email));

        // 1. Save the Crop permanently
        Crop crop = new Crop();
        crop.setName(request.getName());
        crop.setType(request.getType());
        crop.setQuantityKg(request.getQuantityKg());
        crop.setBasePrice(request.getBasePrice());
        crop.setFarmer(farmer);
        cropRepository.save(crop);

        // 2. Save the pending Auction
        Auction auction = new Auction();
        auction.setCrop(crop);
        auction.setStartTime(request.getStartTime());
        auction.setEndTime(request.getEndTime());
        auction.setStatus(AuctionStatus.PENDING);

        return auctionRepository.save(auction);
    }

    /**
     * Phase 1: Waking up the Database and the RAM
     */
    @Transactional
    public void activateAuction(Long auctionId) {
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found in PostgreSQL"));

        if (auction.getStatus() != AuctionStatus.PENDING) {
            throw new RuntimeException("Only PENDING auctions can be started!");
        }

        // 1. Update DB Status
        auction.setStatus(AuctionStatus.ACTIVE);
        auctionRepository.save(auction);

        // 2. Fire up the Max-Heap in RAM!
        biddingEngineService.startAuction(auctionId);
    }

    /**
     * Phase 2: Dropping the Gavel and Saving Permanently
     */
    @Transactional
    public Auction finalizeAuction(Long auctionId) {
        // 1. Pull the auction from the DB
        Auction auction = auctionRepository.findById(auctionId)
                .orElseThrow(() -> new RuntimeException("Auction not found"));

        // 2. Shut down the Max-Heap and pull the ultimate winner from RAM
        Bid winningBid = biddingEngineService.closeAuction(auctionId);

        // 3. Save the results permanently
        if (winningBid != null) {
            User winner = userRepository.findById(winningBid.getBuyerId()).orElse(null);
            auction.setWinningBuyer(winner);
            auction.setWinningBidAmount(winningBid.getBidAmount());
        }

        auction.setStatus(AuctionStatus.COMPLETED);

        // Return the saved, finalized database record
        return auctionRepository.save(auction);
    }
}