module ticketchain::admin_registry {
    use std::signer;
    use std::vector;
    use aptos_framework::event;

    const E_NOT_SUPERADMIN: u64 = 1;
    const E_ALREADY_ADMIN: u64 = 2;
    const E_NOT_ADMIN: u64 = 3;
    const E_REGISTRY_NOT_INITIALIZED: u64 = 4;
    const E_CANNOT_REMOVE_LAST_SUPERADMIN: u64 = 5;
    const E_ALREADY_INITIALIZED: u64 = 6;
    const E_ALREADY_SUPERADMIN: u64 = 7;
    const E_SELF_SERVICE_DISABLED: u64 = 8;

    struct AdminRegistry has key {
        superadmins: vector<address>,
        admins: vector<address>,
        allow_admin_self_service: bool,
    }

    #[event]
    struct RegistryInitialized has drop, store {
        registry_address: address,
        initial_superadmin: address,
    }

    #[event]
    struct SuperadminAdded has drop, store {
        superadmin: address,
        added_by: address,
    }

    #[event]
    struct SuperadminRemoved has drop, store {
        superadmin: address,
        removed_by: address,
    }

    #[event]
    struct SuperadminTransferred has drop, store {
        from: address,
        to: address,
    }

    #[event]
    struct AdminAdded has drop, store {
        admin: address,
        added_by: address,
    }

    #[event]
    struct AdminRemoved has drop, store {
        admin: address,
        removed_by: address,
    }

    #[event]
    struct SelfServicePolicyChanged has drop, store {
        enabled: bool,
        changed_by: address,
    }

    public entry fun initialize(superadmin: &signer) {
        let superadmin_addr = signer::address_of(superadmin);
        
        assert!(!exists<AdminRegistry>(superadmin_addr), E_ALREADY_INITIALIZED);
        
        let superadmins = vector::empty<address>();
        vector::push_back(&mut superadmins, superadmin_addr);
        
        let admins = vector::empty<address>();
        vector::push_back(&mut admins, superadmin_addr);
        
        move_to(superadmin, AdminRegistry {
            superadmins,
            admins,
            allow_admin_self_service: false,
        });

        event::emit(RegistryInitialized {
            registry_address: superadmin_addr,
            initial_superadmin: superadmin_addr,
        });
    }

    public entry fun add_superadmin(
        caller: &signer,
        registry_address: address,
        new_superadmin: address
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        assert!(is_superadmin_internal(&registry.superadmins, caller_addr), E_NOT_SUPERADMIN);
        assert!(!is_superadmin_internal(&registry.superadmins, new_superadmin), E_ALREADY_SUPERADMIN);
        
        vector::push_back(&mut registry.superadmins, new_superadmin);
        
        if (!is_admin_internal(&registry.admins, new_superadmin)) {
            vector::push_back(&mut registry.admins, new_superadmin);
        };
        
        event::emit(SuperadminAdded {
            superadmin: new_superadmin,
            added_by: caller_addr,
        });
    }

    public entry fun remove_superadmin(
        caller: &signer,
        registry_address: address,
        superadmin_to_remove: address
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        assert!(is_superadmin_internal(&registry.superadmins, caller_addr), E_NOT_SUPERADMIN);
        assert!(vector::length(&registry.superadmins) > 1, E_CANNOT_REMOVE_LAST_SUPERADMIN);
        
        let (found, index) = vector::index_of(&registry.superadmins, &superadmin_to_remove);
        if (found) {
            vector::remove(&mut registry.superadmins, index);
        };
        
        event::emit(SuperadminRemoved {
            superadmin: superadmin_to_remove,
            removed_by: caller_addr,
        });
    }

    public entry fun transfer_superadmin(
        caller: &signer,
        registry_address: address,
        new_superadmin: address
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        assert!(is_superadmin_internal(&registry.superadmins, caller_addr), E_NOT_SUPERADMIN);
        
        let (found, index) = vector::index_of(&registry.superadmins, &caller_addr);
        if (found) {
            vector::remove(&mut registry.superadmins, index);
        };
        
        if (!is_superadmin_internal(&registry.superadmins, new_superadmin)) {
            vector::push_back(&mut registry.superadmins, new_superadmin);
        };
        
        if (!is_admin_internal(&registry.admins, new_superadmin)) {
            vector::push_back(&mut registry.admins, new_superadmin);
        };
        
        event::emit(SuperadminTransferred {
            from: caller_addr,
            to: new_superadmin,
        });
    }

    public entry fun set_admin_self_service(
        caller: &signer,
        registry_address: address,
        enabled: bool
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        assert!(is_superadmin_internal(&registry.superadmins, caller_addr), E_NOT_SUPERADMIN);
        
        registry.allow_admin_self_service = enabled;

        event::emit(SelfServicePolicyChanged {
            enabled,
            changed_by: caller_addr,
        });
    }

    public entry fun add_admin(
        caller: &signer,
        registry_address: address,
        new_admin: address
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        let is_caller_superadmin = is_superadmin_internal(&registry.superadmins, caller_addr);
        let is_caller_admin = is_admin_internal(&registry.admins, caller_addr);
        
        if (!is_caller_superadmin) {
            assert!(is_caller_admin && registry.allow_admin_self_service, E_SELF_SERVICE_DISABLED);
        };
        
        assert!(!is_admin_internal(&registry.admins, new_admin), E_ALREADY_ADMIN);
        
        vector::push_back(&mut registry.admins, new_admin);
        
        event::emit(AdminAdded {
            admin: new_admin,
            added_by: caller_addr,
        });
    }

    public entry fun remove_admin(
        caller: &signer,
        registry_address: address,
        admin_to_remove: address
    ) acquires AdminRegistry {
        let caller_addr = signer::address_of(caller);
        let registry = borrow_global_mut<AdminRegistry>(registry_address);
        
        assert!(is_superadmin_internal(&registry.superadmins, caller_addr), E_NOT_SUPERADMIN);
        assert!(!is_superadmin_internal(&registry.superadmins, admin_to_remove), E_NOT_ADMIN);
        assert!(is_admin_internal(&registry.admins, admin_to_remove), E_NOT_ADMIN);
        
        let (found, index) = vector::index_of(&registry.admins, &admin_to_remove);
        if (found) {
            vector::remove(&mut registry.admins, index);
        };
        
        event::emit(AdminRemoved {
            admin: admin_to_remove,
            removed_by: caller_addr,
        });
    }

    #[view]
    public fun is_admin(registry_address: address, addr: address): bool acquires AdminRegistry {
        if (!exists<AdminRegistry>(registry_address)) {
            return false
        };
        let registry = borrow_global<AdminRegistry>(registry_address);
        is_admin_internal(&registry.admins, addr)
    }

    #[view]
    public fun is_superadmin(registry_address: address, addr: address): bool acquires AdminRegistry {
        if (!exists<AdminRegistry>(registry_address)) {
            return false
        };
        let registry = borrow_global<AdminRegistry>(registry_address);
        is_superadmin_internal(&registry.superadmins, addr)
    }

    #[view]
    public fun get_superadmins(registry_address: address): vector<address> acquires AdminRegistry {
        let registry = borrow_global<AdminRegistry>(registry_address);
        let result = vector::empty<address>();
        let len = vector::length(&registry.superadmins);
        let mut i = 0;
        while (i < len) {
            vector::push_back(&mut result, *vector::borrow(&registry.superadmins, i));
            i = i + 1;
        };
        result
    }

    #[view]
    public fun get_all_admins(registry_address: address): vector<address> acquires AdminRegistry {
        let registry = borrow_global<AdminRegistry>(registry_address);
        let result = vector::empty<address>();
        let len = vector::length(&registry.admins);
        let mut i = 0;
        while (i < len) {
            vector::push_back(&mut result, *vector::borrow(&registry.admins, i));
            i = i + 1;
        };
        result
    }

    #[view]
    public fun is_admin_self_service_enabled(registry_address: address): bool acquires AdminRegistry {
        let registry = borrow_global<AdminRegistry>(registry_address);
        registry.allow_admin_self_service
    }

    fun is_admin_internal(admins: &vector<address>, addr: address): bool {
        let len = vector::length(admins);
        let mut i = 0;
        while (i < len) {
            if (*vector::borrow(admins, i) == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }

    fun is_superadmin_internal(superadmins: &vector<address>, addr: address): bool {
        let len = vector::length(superadmins);
        let mut i = 0;
        while (i < len) {
            if (*vector::borrow(superadmins, i) == addr) {
                return true
            };
            i = i + 1;
        };
        false
    }
}
