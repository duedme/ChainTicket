module ticketchain::ticket {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use aptos_framework::object::{Self, Object, DeleteRef};
    use aptos_framework::event;

    const E_NOT_AUTHORIZED: u64 = 1;
    const E_TICKET_ALREADY_USED: u64 = 2;
    const E_EVENT_SOLD_OUT: u64 = 3;
    const E_INVALID_TICKET: u64 = 4;
    const E_EVENT_INACTIVE: u64 = 5;
    const E_TRANSFER_NOT_ALLOWED: u64 = 6;
    const E_RESALE_NOT_ALLOWED: u64 = 7;
    const E_NOT_TICKET_OWNER: u64 = 8;
    const E_EVENT_CANCELLED: u64 = 9;
    const E_TICKET_NOT_PERMANENT: u64 = 10;
    const E_INVALID_QR_HASH: u64 = 11;
    const E_PAYMENT_NOT_VERIFIED: u64 = 12;
    const E_TICKET_BURNED: u64 = 13;
    const E_NOT_PAYMENT_PROCESSOR: u64 = 14;
    const E_PAYMENT_PROCESSOR_NOT_SET: u64 = 15;

    struct Event has key {
        name: String,
        description: String,
        business_address: address,
        total_tickets: u64,
        tickets_sold: u64,
        ticket_price: u64,
        is_active: bool,
        is_cancelled: bool,
        transferable: bool,
        resalable: bool,
        permanent: bool,
        refundable: bool,
        payment_processor: address,
    }

    struct Ticket has key {
        event_id: address,
        ticket_number: u64,
        owner: address,
        is_used: bool,
        is_burned: bool,
        permanent: bool,
        qr_hash: vector<u8>,
    }

    struct TicketDeleteRef has key, store {
        delete_ref: DeleteRef,
    }

    #[event]
    struct EventCreated has drop, store {
        event_address: address,
        business: address,
        name: String,
        total_tickets: u64,
        ticket_price: u64,
        transferable: bool,
        resalable: bool,
        permanent: bool,
        refundable: bool,
    }

    #[event]
    struct TicketPurchased has drop, store {
        ticket_address: address,
        event_address: address,
        buyer: address,
        ticket_number: u64,
        price_paid: u64,
    }

    #[event]
    struct TicketValidated has drop, store {
        ticket_address: address,
        event_address: address,
        validator: address,
        is_valid: bool,
    }

    #[event]
    struct TicketTransferred has drop, store {
        ticket_address: address,
        from: address,
        to: address,
        event_address: address,
    }

    #[event]
    struct TicketUsed has drop, store {
        ticket_address: address,
        event_address: address,
        user: address,
        was_burned: bool,
    }

    #[event]
    struct TicketBurned has drop, store {
        ticket_address: address,
        event_address: address,
        owner: address,
    }

    #[event]
    struct EventCancelled has drop, store {
        event_address: address,
        business: address,
        tickets_sold: u64,
    }

    #[event]
    struct CheckInCompleted has drop, store {
        ticket_address: address,
        event_address: address,
        staff: address,
        ticket_owner: address,
        was_consumed: bool,
    }

    #[event]
    struct PaymentProcessorSet has drop, store {
        event_address: address,
        processor: address,
        set_by: address,
    }

    public entry fun create_event(
        business: &signer,
        name: String,
        description: String,
        total_tickets: u64,
        ticket_price: u64,
        transferable: bool,
        resalable: bool,
        permanent: bool,
        refundable: bool,
        payment_processor: address,
    ) {
        let business_addr = signer::address_of(business);
        
        let constructor_ref = object::create_object(business_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let event_address = object::address_from_constructor_ref(&constructor_ref);

        let name_copy = string::utf8(*string::bytes(&name));

        move_to(&object_signer, Event {
            name,
            description,
            business_address: business_addr,
            total_tickets,
            tickets_sold: 0,
            ticket_price,
            is_active: true,
            is_cancelled: false,
            transferable,
            resalable,
            permanent,
            refundable,
            payment_processor,
        });

        event::emit(EventCreated {
            event_address,
            business: business_addr,
            name: name_copy,
            total_tickets,
            ticket_price,
            transferable,
            resalable,
            permanent,
            refundable,
        });
    }

    public entry fun set_payment_processor(
        business: &signer,
        event_object: Object<Event>,
        processor: address,
    ) acquires Event {
        let business_addr = signer::address_of(business);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);
        
        assert!(event_data.business_address == business_addr, E_NOT_AUTHORIZED);
        
        event_data.payment_processor = processor;

        event::emit(PaymentProcessorSet {
            event_address: event_addr,
            processor,
            set_by: business_addr,
        });
    }

    public entry fun mint_ticket_after_payment(
        payment_processor: &signer,
        event_object: Object<Event>,
        buyer: address,
        qr_hash: vector<u8>,
    ) acquires Event {
        let processor_addr = signer::address_of(payment_processor);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);

        let is_processor = event_data.payment_processor == processor_addr;
        let is_business = event_data.business_address == processor_addr;
        assert!(is_processor || is_business, E_NOT_PAYMENT_PROCESSOR);

        assert!(event_data.is_active, E_EVENT_INACTIVE);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
        assert!(event_data.tickets_sold < event_data.total_tickets, E_EVENT_SOLD_OUT);

        event_data.tickets_sold = event_data.tickets_sold + 1;
        let ticket_number = event_data.tickets_sold;
        let is_permanent = event_data.permanent;
        let price = event_data.ticket_price;

        let constructor_ref = object::create_object(buyer);
        let object_signer = object::generate_signer(&constructor_ref);
        let ticket_address = object::address_from_constructor_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);

        move_to(&object_signer, Ticket {
            event_id: event_addr,
            ticket_number,
            owner: buyer,
            is_used: false,
            is_burned: false,
            permanent: is_permanent,
            qr_hash,
        });

        move_to(&object_signer, TicketDeleteRef {
            delete_ref,
        });

        event::emit(TicketPurchased {
            ticket_address,
            event_address: event_addr,
            buyer,
            ticket_number,
            price_paid: price,
        });
    }

    public entry fun purchase_ticket_free(
        buyer: &signer,
        event_object: Object<Event>,
        qr_hash: vector<u8>,
    ) acquires Event {
        let buyer_addr = signer::address_of(buyer);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);

        assert!(event_data.ticket_price == 0, E_PAYMENT_NOT_VERIFIED);
        assert!(event_data.is_active, E_EVENT_INACTIVE);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
        assert!(event_data.tickets_sold < event_data.total_tickets, E_EVENT_SOLD_OUT);

        event_data.tickets_sold = event_data.tickets_sold + 1;
        let ticket_number = event_data.tickets_sold;
        let is_permanent = event_data.permanent;

        let constructor_ref = object::create_object(buyer_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let ticket_address = object::address_from_constructor_ref(&constructor_ref);
        let delete_ref = object::generate_delete_ref(&constructor_ref);

        move_to(&object_signer, Ticket {
            event_id: event_addr,
            ticket_number,
            owner: buyer_addr,
            is_used: false,
            is_burned: false,
            permanent: is_permanent,
            qr_hash,
        });

        move_to(&object_signer, TicketDeleteRef {
            delete_ref,
        });

        event::emit(TicketPurchased {
            ticket_address,
            event_address: event_addr,
            buyer: buyer_addr,
            ticket_number,
            price_paid: 0,
        });
    }

    public entry fun transfer_ticket(
        sender: &signer,
        ticket_object: Object<Ticket>,
        recipient: address,
    ) acquires Ticket, Event {
        let sender_addr = signer::address_of(sender);
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global_mut<Ticket>(ticket_addr);
        
        assert!(ticket_data.owner == sender_addr, E_NOT_TICKET_OWNER);
        assert!(!ticket_data.is_used, E_TICKET_ALREADY_USED);
        assert!(!ticket_data.is_burned, E_TICKET_BURNED);
        
        let event_data = borrow_global<Event>(ticket_data.event_id);
        assert!(event_data.is_active, E_EVENT_INACTIVE);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
        assert!(event_data.transferable, E_TRANSFER_NOT_ALLOWED);
        
        let event_id = ticket_data.event_id;
        ticket_data.owner = recipient;

        event::emit(TicketTransferred {
            ticket_address: ticket_addr,
            from: sender_addr,
            to: recipient,
            event_address: event_id,
        });
    }

    public entry fun use_ticket(
        user: &signer,
        ticket_object: Object<Ticket>,
    ) acquires Ticket, Event, TicketDeleteRef {
        let user_addr = signer::address_of(user);
        let ticket_addr = object::object_address(&ticket_object);
        
        let event_id: address;
        let is_permanent: bool;
        
        {
            let ticket_data = borrow_global_mut<Ticket>(ticket_addr);
            
            assert!(ticket_data.owner == user_addr, E_NOT_TICKET_OWNER);
            assert!(!ticket_data.is_used, E_TICKET_ALREADY_USED);
            assert!(!ticket_data.is_burned, E_TICKET_BURNED);
            
            let event_data = borrow_global<Event>(ticket_data.event_id);
            assert!(event_data.is_active, E_EVENT_INACTIVE);
            assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
            
            event_id = ticket_data.event_id;
            is_permanent = ticket_data.permanent;
            
            ticket_data.is_used = true;
            
            if (!is_permanent) {
                ticket_data.is_burned = true;
            };
        };
        
        if (!is_permanent) {
            let Ticket { 
                event_id: _, 
                ticket_number: _, 
                owner: _, 
                is_used: _, 
                is_burned: _, 
                permanent: _, 
                qr_hash: _ 
            } = move_from<Ticket>(ticket_addr);
            let TicketDeleteRef { delete_ref } = move_from<TicketDeleteRef>(ticket_addr);
            object::delete(delete_ref);
            
            event::emit(TicketBurned {
                ticket_address: ticket_addr,
                event_address: event_id,
                owner: user_addr,
            });
        };
        
        event::emit(TicketUsed {
            ticket_address: ticket_addr,
            event_address: event_id,
            user: user_addr,
            was_burned: !is_permanent,
        });
    }

    #[view]
    public fun validate_ticket(
        ticket_object: Object<Ticket>,
        event_object: Object<Event>,
        qr_hash_to_verify: vector<u8>,
    ): (bool, bool, bool, address) acquires Ticket, Event {
        let ticket_addr = object::object_address(&ticket_object);
        let event_addr = object::object_address(&event_object);
        
        let event_data = borrow_global<Event>(event_addr);
        let ticket_data = borrow_global<Ticket>(ticket_addr);
        
        let event_active = event_data.is_active && !event_data.is_cancelled;
        let ticket_belongs_to_event = ticket_data.event_id == event_addr;
        let qr_valid = ticket_data.qr_hash == qr_hash_to_verify;
        let ticket_usable = if (ticket_data.permanent) {
            !ticket_data.is_burned
        } else {
            !ticket_data.is_used && !ticket_data.is_burned
        };
        
        let is_valid = event_active && ticket_belongs_to_event && qr_valid && ticket_usable;
        
        (is_valid, ticket_data.permanent, ticket_data.is_used, ticket_data.owner)
    }

    public entry fun check_in(
        staff: &signer,
        ticket_object: Object<Ticket>,
        event_object: Object<Event>,
        qr_hash_to_verify: vector<u8>,
    ) acquires Ticket, Event, TicketDeleteRef {
        let staff_addr = signer::address_of(staff);
        let ticket_addr = object::object_address(&ticket_object);
        let event_addr = object::object_address(&event_object);
        
        let event_data = borrow_global<Event>(event_addr);
        assert!(event_data.business_address == staff_addr, E_NOT_AUTHORIZED);
        assert!(event_data.is_active, E_EVENT_INACTIVE);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);

        let ticket_owner: address;
        let is_permanent: bool;
        let mut was_consumed = false;
        
        {
            let ticket_data = borrow_global_mut<Ticket>(ticket_addr);
            assert!(ticket_data.event_id == event_addr, E_INVALID_TICKET);
            assert!(!ticket_data.is_burned, E_TICKET_BURNED);
            assert!(ticket_data.qr_hash == qr_hash_to_verify, E_INVALID_QR_HASH);
            
            ticket_owner = ticket_data.owner;
            is_permanent = ticket_data.permanent;
            
            if (!is_permanent) {
                assert!(!ticket_data.is_used, E_TICKET_ALREADY_USED);
                ticket_data.is_used = true;
                ticket_data.is_burned = true;
                was_consumed = true;
            };
        };
        
        if (was_consumed) {
            let Ticket { 
                event_id: _, 
                ticket_number: _, 
                owner: _, 
                is_used: _, 
                is_burned: _, 
                permanent: _, 
                qr_hash: _ 
            } = move_from<Ticket>(ticket_addr);
            let TicketDeleteRef { delete_ref } = move_from<TicketDeleteRef>(ticket_addr);
            object::delete(delete_ref);
            
            event::emit(TicketBurned {
                ticket_address: ticket_addr,
                event_address: event_addr,
                owner: ticket_owner,
            });
        };

        event::emit(TicketValidated {
            ticket_address: ticket_addr,
            event_address: event_addr,
            validator: staff_addr,
            is_valid: true,
        });

        event::emit(CheckInCompleted {
            ticket_address: ticket_addr,
            event_address: event_addr,
            staff: staff_addr,
            ticket_owner,
            was_consumed,
        });
    }

    public entry fun cancel_event(
        business: &signer,
        event_object: Object<Event>,
    ) acquires Event {
        let business_addr = signer::address_of(business);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);
        
        assert!(event_data.business_address == business_addr, E_NOT_AUTHORIZED);
        
        let tickets_sold = event_data.tickets_sold;
        event_data.is_active = false;
        event_data.is_cancelled = true;

        event::emit(EventCancelled {
            event_address: event_addr,
            business: business_addr,
            tickets_sold,
        });
    }

    public entry fun deactivate_event(
        business: &signer,
        event_object: Object<Event>,
    ) acquires Event {
        let business_addr = signer::address_of(business);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);
        
        assert!(event_data.business_address == business_addr, E_NOT_AUTHORIZED);
        
        event_data.is_active = false;
    }

    public entry fun reactivate_event(
        business: &signer,
        event_object: Object<Event>,
    ) acquires Event {
        let business_addr = signer::address_of(business);
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global_mut<Event>(event_addr);
        
        assert!(event_data.business_address == business_addr, E_NOT_AUTHORIZED);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
        
        event_data.is_active = true;
    }

    public entry fun reset_permanent_ticket(
        owner: &signer,
        ticket_object: Object<Ticket>,
    ) acquires Ticket, Event {
        let owner_addr = signer::address_of(owner);
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global_mut<Ticket>(ticket_addr);
        
        assert!(ticket_data.owner == owner_addr, E_NOT_TICKET_OWNER);
        assert!(ticket_data.permanent, E_TICKET_NOT_PERMANENT);
        assert!(!ticket_data.is_burned, E_TICKET_BURNED);
        
        let event_data = borrow_global<Event>(ticket_data.event_id);
        assert!(event_data.is_active, E_EVENT_INACTIVE);
        assert!(!event_data.is_cancelled, E_EVENT_CANCELLED);
        
        ticket_data.is_used = false;
    }

    #[view]
    public fun get_event_info(event_object: Object<Event>): (
        String,
        u64,
        u64,
        u64,
        bool,
        bool,
        bool,
        bool,
        bool,
        bool,
        address
    ) acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        (
            event_data.name,
            event_data.total_tickets,
            event_data.tickets_sold,
            event_data.ticket_price,
            event_data.is_active,
            event_data.is_cancelled,
            event_data.transferable,
            event_data.resalable,
            event_data.permanent,
            event_data.refundable,
            event_data.payment_processor,
        )
    }

    #[view]
    public fun get_ticket_info(ticket_object: Object<Ticket>): (
        address,
        u64,
        address,
        bool,
        bool,
        bool,
        vector<u8>
    ) acquires Ticket {
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global<Ticket>(ticket_addr);
        (
            ticket_data.event_id,
            ticket_data.ticket_number,
            ticket_data.owner,
            ticket_data.is_used,
            ticket_data.is_burned,
            ticket_data.permanent,
            ticket_data.qr_hash,
        )
    }

    #[view]
    public fun is_ticket_valid(ticket_object: Object<Ticket>): bool acquires Ticket, Event {
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global<Ticket>(ticket_addr);
        
        if (ticket_data.is_burned) {
            return false
        };
        
        let event_data = borrow_global<Event>(ticket_data.event_id);
        if (!event_data.is_active || event_data.is_cancelled) {
            return false
        };
        
        if (ticket_data.permanent) {
            true
        } else {
            !ticket_data.is_used
        }
    }

    #[view]
    public fun get_event_business(event_object: Object<Event>): address acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.business_address
    }

    #[view]
    public fun is_event_active(event_object: Object<Event>): bool acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.is_active && !event_data.is_cancelled
    }

    #[view]
    public fun is_event_cancelled(event_object: Object<Event>): bool acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.is_cancelled
    }

    #[view]
    public fun verify_qr_hash(ticket_object: Object<Ticket>, hash_to_verify: vector<u8>): bool acquires Ticket {
        let ticket_addr = object::object_address(&ticket_object);
        let ticket_data = borrow_global<Ticket>(ticket_addr);
        ticket_data.qr_hash == hash_to_verify
    }

    #[view]
    public fun get_ticket_price(event_object: Object<Event>): u64 acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.ticket_price
    }

    #[view]
    public fun get_tickets_remaining(event_object: Object<Event>): u64 acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.total_tickets - event_data.tickets_sold
    }

    #[view]
    public fun get_payment_processor(event_object: Object<Event>): address acquires Event {
        let event_addr = object::object_address(&event_object);
        let event_data = borrow_global<Event>(event_addr);
        event_data.payment_processor
    }
}
