// src/hooks/useX402Payment.js
import { useState, useCallback } from 'react';
import { usePrivy, useWallets } from '@privy-io/react-auth';

const API_URL = import.meta.env.VITE_API_URL || 'https://d4y2c4layjh2.cloudfront.net';

// USDC en Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const BASE_SEPOLIA_CHAIN_ID = 84532;

export function useX402Payment() {
  const { user, ready } = usePrivy();
  const { wallets } = useWallets();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Obtener wallet de Privy
  const getWallet = useCallback(() => {
    if (!wallets || wallets.length === 0) return null;
    return wallets[0];
  }, [wallets]);

  // Función principal: pagar con x402
  const payWithX402 = useCallback(async (amountUSD, serviceName) => {
    setLoading(true);
    setError(null);

    try {
      const wallet = getWallet();
      if (!wallet) {
        throw new Error('Wallet no conectada');
      }

      // Obtener provider de Ethereum
      const provider = await wallet.getEthereumProvider();
      
      // Verificar que estemos en Base Sepolia
      const chainId = await provider.request({ method: 'eth_chainId' });
      if (parseInt(chainId, 16) !== BASE_SEPOLIA_CHAIN_ID) {
        // Cambiar a Base Sepolia
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0x14a34' }], // 84532 en hex
          });
        } catch (switchError) {
          throw new Error('Por favor cambia a Base Sepolia en tu wallet');
        }
      }

      // Convertir USD a USDC (6 decimales)
      const amountInUSDC = Math.floor(amountUSD * 1_000_000);
      
      // Generar nonce único
      const nonce = '0x' + crypto.randomUUID().replace(/-/g, '');
      
      // Timestamps
      const validAfter = 0;
      const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hora

      // Dirección del payment processor (tu backend)
      const payTo = import.meta.env.VITE_PAYMENT_RECEIVER || '0x209693bc6bfc0c8f852a69f91a435f9fd52bbe69';

      // EIP-712 typed data para TransferWithAuthorization (USDC)
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

      // Firmar con la wallet
      const signature = await provider.request({
        method: 'eth_signTypedData_v4',
        params: [wallet.address, JSON.stringify(typedData)],
      });

      // Construir payload x402
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
        txHash: signature.slice(0, 66), // Usar parte de la firma como referencia
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

  // Verificar si el usuario tiene wallet conectada
  const hasWallet = useCallback(() => {
    const wallet = getWallet();
    return !!wallet?.address;
  }, [getWallet]);

  // Obtener dirección de wallet
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
