package com.agromind.auction;

import com.agromind.auction.auction.model.Auction;
import com.agromind.auction.auction.model.AuctionStatus;
import com.agromind.auction.auction.model.Crop;
import com.agromind.auction.auction.repository.AuctionRepository;
import com.agromind.auction.auction.repository.CropRepository;
import com.agromind.auction.user.model.Role;
import com.agromind.auction.user.model.User;
import com.agromind.auction.user.repository.UserRepository;
import com.agromind.auction.auction.service.BiddingEngineService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final CropRepository cropRepository;
    private final AuctionRepository auctionRepository;
    private final PasswordEncoder passwordEncoder;
    private final BiddingEngineService biddingEngineService;

    @Override
    public void run(String... args) throws Exception {
        // Only seed data if the database is empty
        if (userRepository.count() == 0) {
            System.out.println("🌱 [DATA SEEDER] Database is empty. Seeding initial data...");

            // 1. Create a Farmer
            User farmer = new User();
            farmer.setFullName("Ramesh Patel");
            farmer.setEmail("farmer1@agromind.com");
            farmer.setPassword(passwordEncoder.encode("password123"));
            farmer.setRole(Role.FARMER);
            userRepository.save(farmer);

            // 2. Create some Buyers
            User buyer1 = new User();
            buyer1.setFullName("Arjun Singh");

            buyer1.setEmail("buyer1@agromind.com");
            buyer1.setPassword(passwordEncoder.encode("password123"));
            buyer1.setRole(Role.BUYER);
            userRepository.save(buyer1);

            User buyer2 = new User();
            buyer2.setFullName("Priya");
            buyer2.setEmail("buyer2@agromind.com");
            buyer2.setPassword(passwordEncoder.encode("password123"));
            buyer2.setRole(Role.BUYER);
            userRepository.save(buyer2);

            // 3. Create Crops and Auctions

            // --- ACTIVE AUCTION ---
            Crop crop1 = new Crop();
            crop1.setName("Premium Sharbati Wheat");
            crop1.setType("Wheat");
            crop1.setQuantityKg(5000.0);
            crop1.setBasePrice(125000.0); // Base price ₹125,000
            crop1.setFarmer(farmer);
            cropRepository.save(crop1);

            Auction auction1 = new Auction();
            auction1.setCrop(crop1);
            auction1.setStartTime(Instant.now().minus(1, ChronoUnit.HOURS));
            auction1.setEndTime(Instant.now().plus(2, ChronoUnit.HOURS));
            auction1.setStatus(AuctionStatus.ACTIVE);
            auction1 = auctionRepository.save(auction1);

            // Crucial: Load the ACTIVE auction into the Max-Heap RAM!
            biddingEngineService.startAuction(auction1.getId());

            // --- PENDING AUCTION ---
            Crop crop2 = new Crop();
            crop2.setName("Organic Soybeans");
            crop2.setType("Soybean");
            crop2.setQuantityKg(2000.0);
            crop2.setBasePrice(90000.0);
            crop2.setFarmer(farmer);
            cropRepository.save(crop2);

            Auction auction2 = new Auction();
            auction2.setCrop(crop2);
            auction2.setStartTime(Instant.now().plus(1, ChronoUnit.DAYS));
            auction2.setEndTime(Instant.now().plus(2, ChronoUnit.DAYS));
            auction2.setStatus(AuctionStatus.PENDING);
            auctionRepository.save(auction2);

            // --- COMPLETED AUCTION ---
            Crop crop3 = new Crop();
            crop3.setName("Basmati Rice (Export Quality)");
            crop3.setType("Rice");
            crop3.setQuantityKg(1000.0);
            crop3.setBasePrice(60000.0);
            crop3.setFarmer(farmer);
            cropRepository.save(crop3);

            Auction auction3 = new Auction();
            auction3.setCrop(crop3);
            auction3.setStartTime(Instant.now().minus(5, ChronoUnit.DAYS));
            auction3.setEndTime(Instant.now().minus(2, ChronoUnit.DAYS));
            auction3.setStatus(AuctionStatus.COMPLETED);
            auction3.setWinningBidAmount(72500.0);
            auction3.setWinningBuyer(buyer1);
            auctionRepository.save(auction3);

            System.out.println("✅ [DATA SEEDER] Seeding complete! Database ready for testing.");
        } else {
            System.out.println("ℹ️ [DATA SEEDER] Database already contains data. Skipping seeder.");

            // We still need to load ACTIVE auctions back into the Max-Heap if we restarted the server!
            auctionRepository.findByStatus(AuctionStatus.ACTIVE).forEach(auction -> {
                biddingEngineService.startAuction(auction.getId());
                System.out.println("🔄 [BIDDING ENGINE] Reloaded ACTIVE Auction ID: " + auction.getId() + " into Max-Heap on startup.");
            });
        }
    }
}
