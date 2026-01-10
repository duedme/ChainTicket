import { encodeFunctionData, parseUnits, toHex } from 'viem';

// USDC en Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';
const PAYMENT_RECEIVER = '0x725093639BA33D79cb7e31A6F7dEca912e22b019';

// ABI mínimo para USDC con EIP-3009
const USDC_ABI = [
  {
    name: 'transferWithAuthorization',
    type: 'function',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' },
      { name: 'validAfter', type: 'uint256' },
      { name: 'validBefore', type: 'uint256' },
      { name: 'nonce', type: 'bytes32' },
      { name: 'signature', type: 'bytes' }
    ],
    outputs: []
  }
];

// Generar nonce aleatorio
function generateNonce() {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return toHex(randomBytes);
}

// Crear el mensaje para firmar (EIP-712)
export function createAuthorizationMessage(from, amount, nonce, validBefore) {
  return {
    domain: {
      name: 'USD Coin',
      version: '2',
      chainId: 84532, // Base Sepolia
      verifyingContract: USDC_ADDRESS
    },
    types: {
      TransferWithAuthorization: [
        { name: 'from', type: 'address' },
        { name: 'to', type: 'address' },
        { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' },
        { name: 'validBefore', type: 'uint256' },
        { name: 'nonce', type: 'bytes32' }
      ]
    },
    primaryType: 'TransferWithAuthorization',
    message: {
      from: from,
      to: PAYMENT_RECEIVER,
      value: parseUnits(amount.toString(), 6), // USDC tiene 6 decimales
      validAfter: 0n,
      validBefore: BigInt(validBefore),
      nonce: nonce
    }
  };
}

// Firmar autorización de pago con Privy wallet
export async function signPaymentAuthorization(wallet, amount) {
  const provider = await wallet.getEthereumProvider();
  const from = wallet.address;
  
  // Generar parámetros
  const nonce = generateNonce();
  const validBefore = Math.floor(Date.now() / 1000) + 3600; // 1 hora
  
  // Crear mensaje EIP-712
  const typedData = createAuthorizationMessage(from, amount, nonce, validBefore);
  
  // Firmar con Privy (esto muestra el popup bonito)
  const signature = await provider.request({
    method: 'eth_signTypedData_v4',
    params: [from, JSON.stringify(typedData)]
  });
  
  // Retornar todo lo necesario para el backend
  return {
    from,
    to: PAYMENT_RECEIVER,
    value: parseUnits(amount.toString(), 6).toString(),
    validAfter: '0',
    validBefore: validBefore.toString(),
    nonce,
    signature,
    chainId: 84532
  };
}

// Codificar para enviar al backend como x-payment header
export function encodePaymentHeader(authorizationData) {
  return btoa(JSON.stringify(authorizationData));
}
