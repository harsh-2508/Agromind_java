package com.agromind.auction.auction.service;

import com.agromind.auction.auction.model.Bid;
import jakarta.annotation.Priority;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.PriorityBlockingQueue;
import org.springframework.messaging.simp.SimpMessagingTemplate;


@Service
@RequiredArgsConstructor
public class BiddingEngineService {

//    1.inject the messaging template so we can broadcast
    private final SimpMessagingTemplate messagingTemplate;
    // A map to hold a separate Max-Heap for every active auction happening right now
    private final Map<Long, PriorityBlockingQueue<Bid>> activeAuctions = new ConcurrentHashMap<>();


    // The core DSA Logic: How do we decide who is at the top of the Max-Heap?
    private final Comparator<Bid> maxHeapComparator = (bid1, bid2) -> {
        // 1. Sort by Highest Amount (Descending)
        int amountComparison = Double.compare(bid2.getBidAmount(), bid1.getBidAmount());

        // 2. Tie-Breaker: If bids are identical, the EARLIEST timestamp wins (Ascending)
        if (amountComparison == 0) {
            return bid1.getTimestamp().compareTo(bid2.getTimestamp());
        }
        return amountComparison;
    };


    //    initializes a new max-heap when an auction starts
    public void startAuction(Long auctionId) {
        // 11 is default initial capacity. It auto-scales.
        activeAuctions.putIfAbsent(auctionId, new PriorityBlockingQueue<>(11, maxHeapComparator));

        System.out.println("🚀 [BIDDING ENGINE] Max-Heap allocated in RAM for Auction ID: " + auctionId);
    }


    //    O(log n) Insertion: Places a new bid into the max-heap
    public boolean placeBid(Bid newBid) {
        PriorityBlockingQueue<Bid> auctionHeap = activeAuctions.get(newBid.getAuctionId());
        if (auctionHeap == null) {
            throw new RuntimeException("Auction is not active!");
        }

//        Optional check: Only insert if it beats the current highest to save memory
        Bid currentHighest = auctionHeap.peek();
        if (currentHighest != null && newBid.getBidAmount() <= currentHighest.getBidAmount()) {
            return false; // bid rejected, too  low
        }
        //        insert into the max-heap (Automatically bubbles up to the current spot
        auctionHeap.offer(newBid);

        // --- NEW LINE: BROADCAST TO REACT ---
        // Instantly push the new highest bid to anyone listening on this auction's topic
        messagingTemplate.convertAndSend("/topic/auction/"+newBid.getAuctionId(),newBid);
        return true;

    }
    //    O(1) Lookup: Instantly grabs the highest bid without removing it.
    public Bid getHighestBid (Long auctionId){
        PriorityBlockingQueue<Bid> auctionHeap = activeAuctions.get(auctionId);
        if (auctionHeap != null) {
            return auctionHeap.peek();
        }
        return null;
    }


    //    Called when the timer hits zero. Clears memory and returns the winner.
    public Bid closeAuction (Long auctionId){
        PriorityBlockingQueue<Bid> auctionHeap = activeAuctions.remove(auctionId);
        return (auctionHeap != null) ? auctionHeap.peek() : null;
    }
}