import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

// Movement Network Configuration
const MOVEMENT_CONFIG = {
  // Testnet (for development)
  testnet: {
    rpcUrl: 'https://testnet.movementnetwork.xyz/v1',
    indexerUrl: 'https://hasura.testnet.movementnetwork.xyz/v1/graphql',
    chainId: 250,
  },
  // Mainnet (for production)
  /* mainnet: {
    rpcUrl: 'https://mainnet.movementnetwork.xyz/v1',
    indexerUrl: 'https://indexer.mainnet.movementnetwork.xyz/v1/graphql',
    chainId: 126,
  } */
};

// Deployed contract address
const CONTRACT_ADDRESS = '0x2339acd68a5b699c8bfefed62febcf497959ca55527227e980c56031b3bfced9'

// Use testnet for development
const NETWORK = 'testnet';
const config = MOVEMENT_CONFIG[NETWORK];

// Backend API URL
const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

export const useMovement = () => {
  const { authenticated } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get Privy wallet
  const getWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets[0]; // Embedded wallet de Privy
  }, [wallets]);

  // Save transaction to DynamoDB
  const saveTransactionToDB = useCallback(async (txData) => {
    try {
      const response = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txData)
      });
      
      if (!response.ok) {
        console.error('Failed to save transaction to DB');
      }
      
      const result = await response.json();
      console.log('✅ Transaction saved to DynamoDB:', result);
      return result;
    } catch (err) {
      console.error('Error saving transaction:', err);
      // Don't throw - transaction succeeded on blockchain, DB save is secondary
    }
  }, []);

  // ============================================
  // WRITE FUNCTIONS (Transactions)
  // ============================================

  // Initialize Admin Registry
  const initializeAdminRegistry = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::admin_registry::initialize`,
        type_arguments: [],
        arguments: []
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // ============================================
  // x402 PAYMENT FUNCTIONS
  // ============================================

  // Purchase ticket with x402 payment
  const purchaseTicketWithPayment = useCallback(async (eventAddress, ticketPrice) => {
    setLoading(true);
    setError(null);
    
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      // Get Privy signer for x402
      const provider = await wallet.getEthereumProvider();
      
      // Wrap fetch with x402 to handle payments automatically
      const paymentFetch = wrapFetchWithPayment(fetch, {
        // Function to sign payment
        signPayment: async (paymentRequirements) => {
          // Build payment payload
          const { maxAmountRequired, payTo, asset, network } = paymentRequirements;
          
          // Sign with Privy wallet
          const signature = await provider.request({
            method: 'eth_signTypedData_v4',
            params: [wallet.address, JSON.stringify({
              // EIP-712 typed data para transferWithAuthorization
              domain: {
                name: 'USD Coin',
                version: '2',
                chainId: network === 'base-sepolia' ? 84532 : 8453,
                verifyingContract: asset,
              },
              types: {
                TransferWithAuthorization: [
                  { name: 'from', type: 'address' },
                  { name: 'to', type: 'address' },
                  { name: 'value', type: 'uint256' },
                  { name: 'validAfter', type: 'uint256' },
                  { name: 'validBefore', type: 'uint256' },
                  { name: 'nonce', type: 'bytes32' },
                ],
              },
              primaryType: 'TransferWithAuthorization',
              message: {
                from: wallet.address,
                to: payTo,
                value: maxAmountRequired,
                validAfter: 0,
                validBefore: Math.floor(Date.now() / 1000) + 3600,
                nonce: `0x${crypto.randomUUID().replace(/-/g, '')}`,
              },
            })],
          });
          
          return signature;
        },
      });

      // Make request with automatic payment
      const response = await paymentFetch('http://localhost:3001/api/purchase-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventAddress,
          buyerAddress: wallet.address,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Purchase failed');
      }

      const result = await response.json();
      return result;
      
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Simplified function for free tickets (without x402)
  const purchaseFreeTicket = useCallback(async (eventAddress, eventName = 'Event') => {
    setLoading(true);
    setError(null);
    
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      // Generate QR hash locally
      const qrHash = Array.from(
        new Uint8Array(
          await crypto.subtle.digest('SHA-256', 
            new TextEncoder().encode(`${eventAddress}-${wallet.address}-${Date.now()}`)
          )
        )
      );

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::purchase_ticket_free`,
        type_arguments: [],
        arguments: [eventAddress, qrHash],
      };

      const response = await wallet.sendTransaction(payload);
      
      // Save transaction to DynamoDB
      await saveTransactionToDB({
        walletAddress: wallet.address,
        txHash: response?.hash || `0x${Date.now()}`,
        type: 'sent',
        amount: '0',
        to: eventAddress,
        from: wallet.address,
        status: 'confirmed',
        description: `Free ticket purchase - ${eventName}`,
        chainId: config.chainId.toString()
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet, saveTransactionToDB]);

  // Create an event
  const createEvent = useCallback(async ({
    adminRegistryAddress,
    name,
    description,
    totalTickets,
    ticketPrice,
    transferable = true,
    resalable = false,
    permanent = false,
    refundable = true,
    paymentProcessor
  }) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::create_event`,
        type_arguments: [],
        arguments: [
          adminRegistryAddress,
          name,
          description,
          totalTickets.toString(),
          ticketPrice.toString(),
          transferable,
          resalable,
          permanent,
          refundable,
          paymentProcessor
        ]
      };

      const response = await wallet.sendTransaction(payload);
      
      // Save transaction to DynamoDB
      await saveTransactionToDB({
        walletAddress: wallet.address,
        txHash: response?.hash || `0x${Date.now()}`,
        type: 'sent',
        amount: '0',
        to: CONTRACT_ADDRESS,
        from: wallet.address,
        status: 'confirmed',
        description: `Create event: ${name}`,
        chainId: config.chainId.toString()
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet, saveTransactionToDB]);

  // Create Business Profile
  const createBusinessProfile = useCallback(async ({
    businessName,
    businessType,
    maxCapacity,
    averageConsumption,
    peakDays,
    peakHoursStart,
    peakHoursEnd,
    typicalEventDurationHours,
    averageTicketPrice,
    monthlyEventsCount,
    customerReturnRate,
    adminRegistry
  }) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::business_profile::create_profile`,
        type_arguments: [],
        arguments: [
          businessName,
          businessType,
          maxCapacity.toString(),
          averageConsumption.toString(),
          peakDays, // vector<u8>
          peakHoursStart,
          peakHoursEnd,
          typicalEventDurationHours,
          averageTicketPrice.toString(),
          monthlyEventsCount,
          customerReturnRate,
          adminRegistry
        ]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Purchase free ticket (price = 0)
  const purchaseFreeTicker = useCallback(async (eventObjectAddress, qrHash) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::purchase_ticket_free`,
        type_arguments: [],
        arguments: [eventObjectAddress, qrHash]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Mint ticket after payment (called by backend/x402)
  const mintTicketAfterPayment = useCallback(async (eventObjectAddress, buyerAddress, qrHash) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::mint_ticket_after_payment`,
        type_arguments: [],
        arguments: [eventObjectAddress, buyerAddress, qrHash]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Use ticket (check-in by user)
  const useTicket = useCallback(async (ticketObjectAddress) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::use_ticket`,
        type_arguments: [],
        arguments: [ticketObjectAddress]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Check-in by staff
  const checkIn = useCallback(async (ticketObjectAddress, eventObjectAddress, qrHash) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::check_in`,
        type_arguments: [],
        arguments: [ticketObjectAddress, eventObjectAddress, qrHash]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // Transfer ticket
  const transferTicket = useCallback(async (ticketObjectAddress, recipientAddress, ticketDescription = 'Ticket') => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::transfer_ticket`,
        type_arguments: [],
        arguments: [ticketObjectAddress, recipientAddress]
      };

      const response = await wallet.sendTransaction(payload);
      
      // Save transaction to DynamoDB
      await saveTransactionToDB({
        walletAddress: wallet.address,
        txHash: response?.hash || `0x${Date.now()}`,
        type: 'sent',
        amount: '0',
        to: recipientAddress,
        from: wallet.address,
        status: 'confirmed',
        description: `Transfer ticket: ${ticketDescription}`,
        chainId: config.chainId.toString()
      });
      
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet, saveTransactionToDB]);

  // Cancel event
  const cancelEvent = useCallback(async (eventObjectAddress) => {
    setLoading(true);
    setError(null);
    try {
      const wallet = getWallet();
      if (!wallet) throw new Error('Wallet not connected');

      const payload = {
        type: 'entry_function_payload',
        function: `${CONTRACT_ADDRESS}::ticket::cancel_event`,
        type_arguments: [],
        arguments: [eventObjectAddress]
      };

      const response = await wallet.sendTransaction(payload);
      return response;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  // ============================================
  // READ FUNCTIONS (GraphQL Indexer)
  // ============================================

  // Generic query to indexer
  const queryIndexer = useCallback(async (query, variables = {}) => {
    try {
      const response = await fetch(config.indexerUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, variables })
      });
      const data = await response.json();
      if (data.errors) throw new Error(data.errors[0].message);
      return data.data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Get events created by a business
  const getEventsByBusiness = useCallback(async (businessAddress) => {
    const query = `
      query GetEventsByBusiness($address: String!) {
        events(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::EventCreated" },
            data: { _contains: { business: $address } }
          }
          order_by: { transaction_version: desc }
        ) {
          data
          transaction_version
          sequence_number
        }
      }
    `;
    return queryIndexer(query, { address: businessAddress });
  }, [queryIndexer]);

  // Get user tickets
  const getTicketsByOwner = useCallback(async (ownerAddress) => {
    const query = `
      query GetTicketsByOwner($address: String!) {
        events(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::TicketPurchased" },
            data: { _contains: { buyer: $address } }
          }
          order_by: { transaction_version: desc }
        ) {
          data
          transaction_version
          sequence_number
        }
      }
    `;
    return queryIndexer(query, { address: ownerAddress });
  }, [queryIndexer]);

  // Get all active events
  const getAllEvents = useCallback(async () => {
    const query = `
      query GetAllEvents {
        events(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::EventCreated" }
          }
          order_by: { transaction_version: desc }
          limit: 100
        ) {
          data
          transaction_version
          sequence_number
        }
      }
    `;
    return queryIndexer(query);
  }, [queryIndexer]);

  // Get event statistics
  const getEventStats = useCallback(async (eventAddress) => {
    const query = `
      query GetEventStats($eventAddress: String!) {
        purchased: events_aggregate(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::TicketPurchased" },
            data: { _contains: { event_address: $eventAddress } }
          }
        ) {
          aggregate { count }
        }
        used: events_aggregate(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::TicketUsed" },
            data: { _contains: { event_address: $eventAddress } }
          }
        ) {
          aggregate { count }
        }
        checkins: events_aggregate(
          where: {
            type: { _eq: "${CONTRACT_ADDRESS}::ticket::CheckInCompleted" },
            data: { _contains: { event_address: $eventAddress } }
          }
        ) {
          aggregate { count }
        }
      }
    `;
    return queryIndexer(query, { eventAddress });
  }, [queryIndexer]);

  // ============================================
  // VIEW FUNCTIONS (Direct RPC)
  // ============================================

  const callViewFunction = useCallback(async (functionName, typeArgs = [], args = []) => {
    try {
      const response = await fetch(`${config.rpcUrl}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function: `${CONTRACT_ADDRESS}::${functionName}`,
          type_arguments: typeArgs,
          arguments: args
        })
      });
      const data = await response.json();
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    }
  }, []);

  // Verify if ticket is valid
  const isTicketValid = useCallback(async (ticketObjectAddress) => {
    return callViewFunction('ticket::is_ticket_valid', [], [ticketObjectAddress]);
  }, [callViewFunction]);

  // Get event info
  const getEventInfo = useCallback(async (eventObjectAddress) => {
    return callViewFunction('ticket::get_event_info', [], [eventObjectAddress]);
  }, [callViewFunction]);

  // Get ticket info
  const getTicketInfo = useCallback(async (ticketObjectAddress) => {
    return callViewFunction('ticket::get_ticket_info', [], [ticketObjectAddress]);
  }, [callViewFunction]);

  // Verify QR hash
  const verifyQrHash = useCallback(async (ticketObjectAddress, hash) => {
    return callViewFunction('ticket::verify_qr_hash', [], [ticketObjectAddress, hash]);
  }, [callViewFunction]);

  // Get remaining tickets
  const getTicketsRemaining = useCallback(async (eventObjectAddress) => {
    return callViewFunction('ticket::get_tickets_remaining', [], [eventObjectAddress]);
  }, [callViewFunction]);

  return {
    // State
    loading,
    error,
    authenticated,
    wallet: getWallet(),
    
    // Config
    contractAddress: CONTRACT_ADDRESS,
    network: NETWORK,
    
    // Write (transactions)
    initializeAdminRegistry,
    createEvent,
    createBusinessProfile,
    purchaseFreeTicker,
    mintTicketAfterPayment,
    useTicket,
    checkIn,
    transferTicket,
    cancelEvent,
    
    // Read (indexer)
    queryIndexer,
    getEventsByBusiness,
    getTicketsByOwner,
    getAllEvents,
    getEventStats,
    
    // View functions (RPC)
    isTicketValid,
    getEventInfo,
    getTicketInfo,
    verifyQrHash,
    getTicketsRemaining,

    purchaseTicketWithPayment,
    purchaseFreeTicket,
  };
};

export default useMovement;
