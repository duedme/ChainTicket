# Chain Ticket - Movement M1 Hackathon

## Overview
Chain Ticket is a tokenized ticketing platform built on Movement blockchain for the M1 Hackathon. It allows businesses to create, sell, and manage tokenized tickets (NFTs) for events, capacity limits, or special offers.

## Project Structure

```
/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React contexts (AuthContext)
│   │   ├── pages/       # Page components (Login, Client, Admin)
│   │   └── assets/      # Images and static assets
│   ├── vite.config.js
│   └── package.json
├── backend/             # Express.js API server
│   ├── server.js
│   └── package.json
├── contracts/           # Movement Move smart contracts
│   ├── sources/
│   │   └── ticket.move
│   └── Move.toml
└── replit.md            # This file
```

## Tech Stack

### Frontend
- **React 18.2.0** with Vite
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Privy 1.88.4** for wallet authentication (email, wallet, social login)
- **React Router** for navigation

### Backend
- **Express.js** API
- OpenAI integration for AI recommendations

### Blockchain
- **Movement blockchain** (Move language)
- Smart contracts for ticket NFT creation, purchase, and validation

## Running the Project

The frontend runs on port 5000, backend on port 3001.

## Key Features (MVP)

1. **Ticket Creation** - Businesses create tokenized event tickets
2. **AI Recommendations** - Get suggestions on ticket quantities
3. **QR Validation** - Scan tickets at entry points
4. **Analytics Dashboard** - Track sales and revenue

## Authentication

- **Privy** integration for wallet/social authentication
- Traditional username/password login also available
- Test credentials: admin/123 or user/123

## Important Notes

- Privy version must stay at 1.88.4 to avoid React hook conflicts
- React must stay at 18.2.0 for compatibility with Privy
- Vite config includes aliases to prevent duplicate React instances

## Privy App ID
clpispdty00ycl80fpueukbhl
