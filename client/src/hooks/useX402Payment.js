// src/hooks/useX402Payment.js
import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

// USDC en Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const BASE_SEPOLIA_CHAIN_ID = 84532;

// Generar bytes32 aleatorio para nonce
const generateBytes32 = () => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return '0x' + Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
};

export function useX402Payment() {
  const { user, ready } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const getWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets[0];
  }, [wallets]);

  const payWithX402 = useCallback(async (amountUSD, serviceName) => {
    setLoading(true);
    setError(null);

    try {
      const wallet = getWallet();
      if (!wallet) {
        throw new Error('Wallet no conectada');
      }

      const provider = await wallet.getEthereumProvider();
      
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== BASE_SEPOLIA_CHAIN_ID) {
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x14a34' }],
          });
        } catch (switchError) {
          throw new Error('Por favor cambia a Base Sepolia en tu wallet');
        }
      }

      const amountInUSDC = Math.floor(amountUSD * 1_000_000);
      
      // FIX: Generar nonce de 32 bytes
      const nonce = generateBytes32();
      
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600;

      const payTo = import.meta.env.VITE_PAYMENT_RECEIVER || '0x209693bc6bfc0c8f852a69f91a435f9fd52bbe69';

      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' },
          ],
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
        domain: {
          name: 'USD Coin',
          version: '2',
          chainId: BASE_SEPOLIA_CHAIN_ID,
          verifyingContract: USDC_ADDRESS,
        },
        message: {
          from: wallet.address,
          to: payTo,
          value: amountInUSDC.toString(),
          validAfter: validAfter.toString(),
          validBefore: validBefore.toString(),
          nonce: nonce,
        },
      };

      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [wallet.address, JSON.stringify(typedData)],
      });

      const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'base-sepolia',
        payload: {
          signature,
          authorization: {
            from: wallet.address,
            to: payTo,
            value: amountInUSDC.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce: nonce,
          },
        },
      };

      return {
        success: true,
        paymentPayload,
        txHash: signature.slice(0, 66),
        amount: amountUSD,
        buyerAddress: wallet.address,
      };

    } catch (err) {
      console.error('Error en pago x402:', err);
      setError(err.message);
      return {
        success: false,
        error: err.message,
      };
    } finally {
      setLoading(false);
    }
  }, [getWallet]);

  const hasWallet = useCallback(() => {
    const wallet = getWallet();
    return !!wallet?.address;
  }, [getWallet]);

  const getWalletAddress = useCallback(() => {
    const wallet = getWallet();
    return wallet?.address || null;
  }, [getWallet]);

  return {
    payWithX402,
    loading,
    error,
    hasWallet,
    getWalletAddress,
    ready,
  };
}

export default useX402Payment;
