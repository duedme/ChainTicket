# Chain Ticket - Movement M1 Hackathon

## Overview
Chain Ticket is a tokenized ticketing platform built on Movement blockchain for the M1 Hackathon. It allows businesses to create, sell, and manage tokenized tickets (NFTs) for events, capacity limits, or special offers.

## Project Structure

```
/
├── client/              # React + Vite frontend
│   ├── src/
│   │   ├── components/  # Reusable UI components
│   │   ├── context/     # React contexts (AuthContext, DataContext)
│   │   ├── pages/       # Page components
│   │   │   ├── admin/   # Admin pages (Dashboard, Services, Profile)
│   │   │   ├── client/  # Client pages (VendorSelection, Menu, Cart, Orders, Profile)
│   │   │   ├── Login.jsx
│   │   │   └── Registration.jsx
│   │   └── assets/      # Images and static assets
│   ├── vite.config.js
│   └── package.json
├── backend/             # Express.js API server
│   ├── server.js
│   └── package.json
├── contracts/           # Movement Move smart contracts
│   ├── sources/
│   │   ├── admin_registry.move
│   │   ├── business_profile.move
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

## Smart Contracts Architecture

### 1. AdminRegistry (admin_registry.move)
Manages administrator roles for the platform with support for multiple superadmins.

**Entry Functions:**
- `initialize(superadmin)` - Creates the registry with initial superadmin (protected against double init)
- `add_superadmin(caller, registry_address, new_superadmin)` - Add another superadmin
- `remove_superadmin(caller, registry_address, superadmin_to_remove)` - Remove a superadmin (can't remove last one)
- `transfer_superadmin(caller, registry_address, new_superadmin)` - Transfer superadmin role to another address
- `set_admin_self_service(caller, registry_address, enabled)` - Enable/disable admins adding other admins
- `add_admin(caller, registry_address, new_admin)` - Add admin (superadmins always can, admins if self-service enabled)
- `remove_admin(caller, registry_address, admin_to_remove)` - Superadmin removes admins

**View Functions:**
- `is_admin(registry_address, addr)` - Check if address is admin
- `is_superadmin(registry_address, addr)` - Check if address is superadmin
- `get_superadmins(registry_address)` - Get list of all superadmins
- `get_all_admins(registry_address)` - Get list of all admins
- `is_admin_self_service_enabled(registry_address)` - Check if admin self-service is enabled

### 2. Ticket (ticket.move)
Main contract for events and ticket NFTs with payment verification and burn functionality.

**Event Struct Fields:**
- `name`, `description`, `business_address`
- `total_tickets`, `tickets_sold`, `ticket_price`
- `is_active` - Event can accept new tickets
- `is_cancelled` - Event permanently cancelled
- `transferable` - Can tickets be transferred between users
- `resalable` - Can tickets be resold
- `permanent` - Tickets can be reused (vs single-use)
- `refundable` - Can tickets be refunded
- `payment_processor` - Address authorized to mint tickets after payment

**Ticket Struct Fields:**
- `event_id`, `ticket_number`, `owner`
- `is_used` - Has the ticket been used
- `is_burned` - Ticket has been permanently destroyed (non-permanent only)
- `permanent` - Copied from event config
- `qr_hash` - Hash for QR code validation

**Entry Functions:**
- `create_event(...)` - Business creates event with all configurations including payment_processor
- `set_payment_processor(business, event_object, processor)` - Change payment processor
- `mint_ticket_after_payment(processor, event_object, buyer, qr_hash)` - Mint ticket (only by payment_processor or business)
- `purchase_ticket_free(buyer, event_object, qr_hash)` - Mint free ticket (only if price == 0)
- `transfer_ticket(sender, ticket_object, recipient)` - Transfer if allowed
- `use_ticket(user, ticket_object)` - User uses ticket (burns if non-permanent)
- `check_in(staff, ticket_object, event_object, qr_hash)` - Staff validates and checks in (burns if non-permanent)
- `cancel_event(business, event_object)` - Permanently cancel event
- `deactivate_event(business, event_object)` - Temporarily deactivate
- `reactivate_event(business, event_object)` - Reactivate event
- `reset_permanent_ticket(owner, ticket_object)` - Reset permanent ticket for reuse

**View Functions:**
- `get_event_info(event_object)` - All event details including payment_processor
- `get_ticket_info(ticket_object)` - All ticket details including is_burned
- `validate_ticket(ticket_object, event_object, qr_hash)` - Verify ticket validity (read-only)
- `is_ticket_valid(ticket_object)` - Check if ticket can be used
- `get_event_business(event_object)` - Get event owner
- `is_event_active(event_object)` - Check if event is active and not cancelled
- `is_event_cancelled(event_object)` - Check if event is cancelled
- `verify_qr_hash(ticket_object, hash)` - Validate QR hash
- `get_ticket_price(event_object)` - Get ticket price
- `get_tickets_remaining(event_object)` - Get remaining tickets
- `get_payment_processor(event_object)` - Get payment processor address

**Events (Logs):**
- EventCreated, TicketPurchased, TicketValidated
- TicketTransferred, TicketUsed, TicketBurned
- EventCancelled, CheckInCompleted, PaymentProcessorSet

**Payment Flow:**
1. Business creates event with `payment_processor` = backend x402 address
2. Client pays off-chain via x402
3. Backend calls `mint_ticket_after_payment` to mint ticket
4. Ticket is created for the buyer

**Ticket Lifecycle (Non-Permanent):**
1. Mint → `is_used=false, is_burned=false`
2. Use/Check-in → `is_used=true, is_burned=true` + resource deleted

**Ticket Lifecycle (Permanent):**
1. Mint → `is_used=false, is_burned=false`
2. Use/Check-in → `is_used=true` (resource stays)
3. Reset → `is_used=false` (ready for reuse)

### 3. BusinessProfile (business_profile.move)
Stores business metadata for AI recommendations.

**Fields:**
- `owner`, `business_name`, `business_type`
- `max_capacity` - Maximum venue capacity
- `average_consumption` - Average spend per customer
- `peak_days` - Vector of peak days (0=Sunday, 6=Saturday)
- `peak_hours_start`, `peak_hours_end` - Peak hours range
- `typical_event_duration_hours`
- `average_ticket_price`
- `monthly_events_count`
- `customer_return_rate` - Percentage of returning customers
- `admin_registry` - Associated admin registry address

**Entry Functions:**
- `create_profile(...)` - Create business profile with all metadata
- `update_capacity_metrics(...)` - Update capacity and consumption
- `update_peak_schedule(...)` - Update peak days and hours
- `update_event_metrics(...)` - Update event-related metrics

**View Functions:**
- `get_profile_info(...)` - All profile data
- `get_ai_recommendation_data(...)` - Data optimized for AI recommendations
- `get_admin_registry(...)`, `get_max_capacity(...)`, `get_owner(...)`

## Entry Flow (Check-in at Venue)

```
1. Client shows QR code (contains ticket_address + nonce hash)
2. Staff scans QR → extract ticket_address and qr_hash
3. Call verify_qr_hash(ticket_object, hash) → confirms QR matches ticket
4. Call is_ticket_valid(ticket_object) → confirms ticket is usable
5. Call check_in(staff, ticket_object, event_object, qr_hash):
   - Verifies staff is admin of event's registry OR is business owner
   - Validates QR hash matches
   - For non-permanent: marks used, burns ticket (deletes resource)
   - For permanent: just records usage (ticket persists)
6. Emit CheckInCompleted event for off-chain logging
```

**QR Code Generation (off-chain):**
```
qr_data = hash(ticket_address + nonce)
store qr_hash in ticket.qr_hash at mint time
QR code encodes: { ticket_address, qr_data }
```

## Running the Project

The frontend runs on port 5000, backend on port 3001.

## Key Features (MVP)

1. **Ticket Creation** - Businesses create tokenized event tickets
2. **AI Recommendations** - Get suggestions on ticket quantities
3. **QR Validation** - Scan tickets at entry points
4. **Analytics Dashboard** - Track sales and revenue

## Vendor Categories

- **Bar** - Golden Bar & Lounge
- **Restaurant** - Premium Steakhouse
- **Coffee** - Artisan Coffee Co.
- **Social Event** - Elite Events (VIP Gala, Networking Parties, Concerts, Art Exhibitions)

## Services/Tickets Management (Admin)

Each service/ticket includes:
- **Title** - Name of the service/event
- **Image** - Visual representation
- **Duration** - How long the service/event lasts
- **Total Tickets** - Maximum capacity
- **Sold Count** - Tickets already sold
- **isActive** - Enable/disable the service
- **Schedule** - Operating hours and days

Admin Controls:
- **Add Service** - Create new tickets/services with schedule
- **Edit** - Modify title, duration, stock, schedule, and operating days
- **Activate/Deactivate** - Toggle service availability (green power button)
- **Delete** - Remove service with confirmation dialog

## Authentication & Registration

- **Privy** integration for wallet/social authentication
- Traditional username/password login also available
- Test credentials: admin/123 or user/123
- **New wallet registration flow**: When a new wallet connects, users select whether to register as User or Vendor, then fill out profile information

## User Profiles

- Both clients and admins have "My Profile" pages
- Users can edit: Full Name, Email, Phone, Location
- Vendors can also set: Business Name
- Profile data is stored in localStorage and persists across sessions

## Navigation

### Client Navigation (Bottom Nav Mobile)
- Catalog - Browse establishments
- Wallet - View orders/tickets
- Profile - Manage account

### Admin Navigation (Sidebar + Bottom Nav Mobile)
- Overview - Manage orders/queue
- Services - Manage tickets/services with schedules
- My Profile - Account settings

## Important Notes

- Privy version must stay at 1.88.4 to avoid React hook conflicts
- React must stay at 18.2.0 for compatibility with Privy
- Vite config includes aliases to prevent duplicate React instances
- Hook errors in console are related to Privy's iframe integration in Replit environment

## Privy App ID
clpispdty00ycl80fpueukbhl
