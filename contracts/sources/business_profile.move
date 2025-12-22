module ticketchain::business_profile {
    use std::string::{Self, String};
    use std::signer;
    use std::vector;
    use aptos_framework::object::{Self, Object};
    use aptos_framework::event;

    const E_NOT_AUTHORIZED: u64 = 1;
    const E_PROFILE_NOT_FOUND: u64 = 2;
    const E_PROFILE_ALREADY_EXISTS: u64 = 3;

    struct BusinessProfile has key {
        owner: address,
        business_name: String,
        business_type: String,
        max_capacity: u64,
        average_consumption: u64,
        peak_days: vector<u8>,
        peak_hours_start: u8,
        peak_hours_end: u8,
        typical_event_duration_hours: u8,
        average_ticket_price: u64,
        monthly_events_count: u8,
        customer_return_rate: u8,
        admin_registry: address,
    }

    #[event]
    struct ProfileCreated has drop, store {
        profile_address: address,
        owner: address,
        business_name: String,
        business_type: String,
    }

    #[event]
    struct ProfileUpdated has drop, store {
        profile_address: address,
        updated_by: address,
    }

    public entry fun create_profile(
        owner: &signer,
        business_name: String,
        business_type: String,
        max_capacity: u64,
        average_consumption: u64,
        peak_days: vector<u8>,
        peak_hours_start: u8,
        peak_hours_end: u8,
        typical_event_duration_hours: u8,
        average_ticket_price: u64,
        monthly_events_count: u8,
        customer_return_rate: u8,
        admin_registry: address,
    ) {
        let owner_addr = signer::address_of(owner);
        
        let constructor_ref = object::create_object(owner_addr);
        let object_signer = object::generate_signer(&constructor_ref);
        let profile_address = object::address_from_constructor_ref(&constructor_ref);

        let name_for_event = *&business_name;
        let type_for_event = *&business_type;

        move_to(&object_signer, BusinessProfile {
            owner: owner_addr,
            business_name,
            business_type,
            max_capacity,
            average_consumption,
            peak_days,
            peak_hours_start,
            peak_hours_end,
            typical_event_duration_hours,
            average_ticket_price,
            monthly_events_count,
            customer_return_rate,
            admin_registry,
        });

        event::emit(ProfileCreated {
            profile_address,
            owner: owner_addr,
            business_name: name_for_event,
            business_type: type_for_event,
        });
    }

    public entry fun update_capacity_metrics(
        caller: &signer,
        profile_object: Object<BusinessProfile>,
        max_capacity: u64,
        average_consumption: u64,
    ) acquires BusinessProfile {
        let caller_addr = signer::address_of(caller);
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global_mut<BusinessProfile>(profile_addr);
        
        assert!(profile.owner == caller_addr, E_NOT_AUTHORIZED);
        
        profile.max_capacity = max_capacity;
        profile.average_consumption = average_consumption;

        event::emit(ProfileUpdated {
            profile_address: profile_addr,
            updated_by: caller_addr,
        });
    }

    public entry fun update_peak_schedule(
        caller: &signer,
        profile_object: Object<BusinessProfile>,
        peak_days: vector<u8>,
        peak_hours_start: u8,
        peak_hours_end: u8,
    ) acquires BusinessProfile {
        let caller_addr = signer::address_of(caller);
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global_mut<BusinessProfile>(profile_addr);
        
        assert!(profile.owner == caller_addr, E_NOT_AUTHORIZED);
        
        profile.peak_days = peak_days;
        profile.peak_hours_start = peak_hours_start;
        profile.peak_hours_end = peak_hours_end;

        event::emit(ProfileUpdated {
            profile_address: profile_addr,
            updated_by: caller_addr,
        });
    }

    public entry fun update_event_metrics(
        caller: &signer,
        profile_object: Object<BusinessProfile>,
        typical_event_duration_hours: u8,
        average_ticket_price: u64,
        monthly_events_count: u8,
        customer_return_rate: u8,
    ) acquires BusinessProfile {
        let caller_addr = signer::address_of(caller);
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global_mut<BusinessProfile>(profile_addr);
        
        assert!(profile.owner == caller_addr, E_NOT_AUTHORIZED);
        
        profile.typical_event_duration_hours = typical_event_duration_hours;
        profile.average_ticket_price = average_ticket_price;
        profile.monthly_events_count = monthly_events_count;
        profile.customer_return_rate = customer_return_rate;

        event::emit(ProfileUpdated {
            profile_address: profile_addr,
            updated_by: caller_addr,
        });
    }

    #[view]
    public fun get_profile_info(profile_object: Object<BusinessProfile>): (
        address,
        String,
        String,
        u64,
        u64,
        vector<u8>,
        u8,
        u8,
        u8,
        u64,
        u8,
        u8,
        address
    ) acquires BusinessProfile {
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global<BusinessProfile>(profile_addr);
        (
            profile.owner,
            profile.business_name,
            profile.business_type,
            profile.max_capacity,
            profile.average_consumption,
            profile.peak_days,
            profile.peak_hours_start,
            profile.peak_hours_end,
            profile.typical_event_duration_hours,
            profile.average_ticket_price,
            profile.monthly_events_count,
            profile.customer_return_rate,
            profile.admin_registry,
        )
    }

    #[view]
    public fun get_ai_recommendation_data(profile_object: Object<BusinessProfile>): (
        u64,
        u64,
        vector<u8>,
        u8,
        u8,
        u8,
        u64,
        u8,
        u8
    ) acquires BusinessProfile {
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global<BusinessProfile>(profile_addr);
        (
            profile.max_capacity,
            profile.average_consumption,
            profile.peak_days,
            profile.peak_hours_start,
            profile.peak_hours_end,
            profile.typical_event_duration_hours,
            profile.average_ticket_price,
            profile.monthly_events_count,
            profile.customer_return_rate,
        )
    }

    #[view]
    public fun get_admin_registry(profile_object: Object<BusinessProfile>): address acquires BusinessProfile {
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global<BusinessProfile>(profile_addr);
        profile.admin_registry
    }

    #[view]
    public fun get_max_capacity(profile_object: Object<BusinessProfile>): u64 acquires BusinessProfile {
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global<BusinessProfile>(profile_addr);
        profile.max_capacity
    }

    #[view]
    public fun get_owner(profile_object: Object<BusinessProfile>): address acquires BusinessProfile {
        let profile_addr = object::object_address(&profile_object);
        let profile = borrow_global<BusinessProfile>(profile_addr);
        profile.owner
    }
}
