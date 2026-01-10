import { useState, useEffect } from 'react';
import { createPublicClient, http, formatUnits } from 'viem';
import { baseSepolia } from 'viem/chains';

// USDC en Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

// ABI mínimo para balanceOf
const ERC20_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }]
  }
];

// Cliente público para Base Sepolia
const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org')
});

export function useUSDCBalance(address) {
  const [balance, setBalance] = useState('0.00');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!address) {
      setLoading(false);
      return;
    }

    const fetchBalance = async () => {
      try {
        const rawBalance = await client.readContract({
          address: USDC_ADDRESS,
          abi: ERC20_ABI,
          functionName: 'balanceOf',
          args: [address]
        });
        
        // USDC tiene 6 decimales
        const formatted = formatUnits(rawBalance, 6);
        setBalance(parseFloat(formatted).toFixed(2));
      } catch (error) {
        console.error('Error fetching USDC balance:', error);
        setBalance('0.00');
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
    
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchBalance, 30000);
    return () => clearInterval(interval);
  }, [address]);

  return { balance, loading };
}
