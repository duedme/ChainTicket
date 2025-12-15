module ticketchain::ticket {
    use std::string::{Self, String};
    use std::signer;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::event;

    /// Error codes
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_TICKET_ALREADY_USED: u64 = 2;
    const E_EVENT_SOLD_OUT: u64 = 3;
    const E_INVALID_TICKET: u64 = 4;

    /// Represents an event created by a business
    struct Event has key {
        name: String,
        description: String,
        business_address: address,
        total_tickets: u64,
        tickets_sold: u64,
        ticket_price: u64,
        is_active: bool,
    }

    /// Represents a ticket NFT
    struct Ticket has key {
        event_id: address,
        ticket_number: u64,
        owner: address,
        permanent: bool
    }

    /// Events for tracking
    #[event]
    struct EventCreated has drop, store {
        event_address: address,
        business: address,
        name: String,
        total_tickets: u64,
    }

    #[event]
    struct TicketPurchased has drop, store {
        ticket_address: address,
        event_address: address,
        buyer: address,
        ticket_number: u64,
    }

    #[event]
    struct TicketValidated has drop, store {
        ticket_address: address,
        event_address: address,
        validated_at: u64,
    }

    /// Create a new event
    public entry fun create_event(
        business: &signer,
        name: String,
        description: String,
        total_tickets: u64,
        ticket_price: u64,
    ) {
        let business_addr = signer::address_of(business);
        
        let constructor_ref = object::create_object(business_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let event_address = object::address_from_constructor_ref(&constructor_ref);

        // Copy the name for the event emission before moving it to storage
        let name_copy = string::utf8(*string::bytes(&name));

        move_to(&object_signer, Event {
            name,
            description,
            business_address: business_addr,
            total_tickets,
            tickets_sold: 0,
            ticket_price,
            is_active: true,
        });

        event::emit(EventCreated {
            event_address,
            business: business_addr,
            name: name_copy,
            total_tickets,
        });
    }

    /// Purchase a ticket for an event
    public entry fun purchase_ticket(
        buyer: &signer,
        event_object: Object<Event>,
    ) acquires Event {
        let buyer_addr = signer::address_of(buyer);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);

        assert!(event_data.is_active, E_INVALID_TICKET);
        assert!(event_data.tickets_sold < event_data.total_tickets, E_EVENT_SOLD_OUT);

        event_data.tickets_sold = event_data.tickets_sold + 1;
        let ticket_number = event_data.tickets_sold;

        let constructor_ref = object::create_object(buyer_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let ticket_address = object::address_from_constructor_ref(&constructor_ref);

        move_to(&object_signer, Ticket {
            event_id: event_addr,
            ticket_number,
            owner: buyer_addr,
            is_used: false,
        });

        event::emit(TicketPurchased {
            ticket_address,
            event_address: event_addr,
            buyer: buyer_addr,
            ticket_number,
        });
    }

    /// Validate a ticket at entry point
    public entry fun validate_ticket(
        validator: &signer,
        ticket_object: Object<Ticket>,
        event_object: Object<Event>,
    ) acquires Ticket, Event {
        let validator_addr = signer::address_of(validator);
        let ticket_addr = object::object_address(&ticket_object);
        let event_addr = object::object_address(&event_object);
        
        let event_data = borrow_global<Event>(event_addr);
        assert!(event_data.business_address == validator_addr, E_NOT_AUTHORIZED);

        let ticket_data = borrow_global_mut<Ticket>(ticket_addr);
        assert!(ticket_data.event_id == event_addr, E_INVALID_TICKET);
        assert!(!ticket_data.is_used, E_TICKET_ALREADY_USED);

        ticket_data.is_used = true;

        event::emit(TicketValidated {
            ticket_address: ticket_addr,
            event_address: event_addr,
            validated_at: 0,
        });
    }

    #[view]
    public fun get_event_info(event_object: Object<Event>): (String, u64, u64, u64, bool) acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        (
            event_data.name,
            event_data.total_tickets,
            event_data.tickets_sold,
            event_data.ticket_price,
            event_data.is_active,
        )
    }

    #[view]
    public fun is_ticket_valid(ticket_object: Object<Ticket>): bool acquires Ticket {
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global<Ticket>(ticket_addr);
        !ticket_data.is_used
    }
}
