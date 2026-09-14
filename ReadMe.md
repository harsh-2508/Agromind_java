graph TD
    subgraph Client Layer [Frontend - Vercel]
        UI[React UI / Tailwind]
        REST[REST Client]
        WS[STOMP/SockJS Client]
        UI -->|API Calls| REST
        UI -->|Live Bids| WS
    end

    subgraph Application Layer [Backend - Docker on Render]
        SEC[Spring Security & JWT Filter]
        CTRL[REST Controllers]
        BROKER[WebSocket Broker]
        HEAP[In-Memory Max-Heap]

        REST -->|JSON / Bearer Token| SEC
        WS -->|WSS Protocol| SEC
        
        SEC --> CTRL
        SEC --> BROKER

        BROKER <-->|Validates/Updates| HEAP
    end

    subgraph Data & External Layer
        DB[(PostgreSQL DB)]
        AI[Google Gemini Vision API]

        CTRL -->|Multipart/Base64| AI
        CTRL -->|JPA/Hibernate| DB
        HEAP -->|Persist Winning Bid on Close| DB
    end