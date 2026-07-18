import { useState, useEffect, useRef } from 'react';
import { 
  deployContract, 
  findDeployedContract 
} from '@midnight-ntwrk/midnight-js-contracts';
import { FetchZkConfigProvider } from '@midnight-ntwrk/midnight-js-fetch-zk-config-provider';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import * as CompiledContract from '@midnight-ntwrk/compact-js/effect/CompiledContract';
import { Contract } from '../../managed/contract/index.js';

// Helper to convert hex string to Uint8Array
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substring(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export function useMidnight() {
  const [isConnected, setIsConnected] = useState(false);
  const [walletAPI, setWalletAPI] = useState<any>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  const [contractAddress, setContractAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txResult, setTxResult] = useState<string | null>(null);

  // References for keeping private witness inputs securely in memory (never exposed to UI)
  const privateCertDataRef = useRef<string>('');
  const privateIssuerSecretRef = useRef<string>('');

  // 1. Detect if Lace wallet is installed
  const checkWalletInstalled = () => {
    return !!(window.midnight?.mnLace || window.midnight?.lace);
  };

  // 2. Connect Lace Wallet (Preprod/Preview)
  const connect = async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const wallet = window.midnight?.mnLace || window.midnight?.lace;
      if (!wallet) {
        throw new Error('Lace wallet extension not found. Please install Lace Beta Wallet.');
      }

      // connect is favored, fallback to enable
      let api: any;
      if (typeof wallet.connect === 'function') {
        api = await wallet.connect('preprod');
      } else {
        api = await wallet.enable();
      }

      setWalletAPI(api);

      // Get address using unshielded address getter
      let userAddr = '';
      if (typeof api.getUnshieldedAddress === 'function') {
        userAddr = await api.getUnshieldedAddress();
      } else if (typeof api.getUnshieldedAddresses === 'function') {
        const addrs = await api.getUnshieldedAddresses();
        userAddr = addrs[0] || '';
      } else if (typeof api.getUnusedAddresses === 'function') {
        const addrs = await api.getUnusedAddresses();
        userAddr = addrs[0] || '';
      } else if (api.state && typeof api.state === 'function') {
        const s = await api.state();
        userAddr = s.address || s.unshieldedAddress || '';
      }
      setAddress(userAddr);

      // Get balance
      let userBal = '0';
      if (typeof api.getUnshieldedBalances === 'function') {
        const bals = await api.getUnshieldedBalances();
        userBal = bals.DUST ? (BigInt(bals.DUST) / 1000000n).toString() : '0';
      } else if (api.state && typeof api.state === 'function') {
        const s = await api.state();
        userBal = s.balance || '0';
      }
      setBalance(userBal);
      setIsConnected(true);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to Lace wallet.');
    } finally {
      setIsConnecting(false);
    }
  };

  // 3. Disconnect Wallet
  const disconnect = () => {
    setIsConnected(false);
    setWalletAPI(null);
    setAddress(null);
    setBalance(null);
    setContractAddress(null);
    setTxResult(null);
    setError(null);
    privateCertDataRef.current = '';
    privateIssuerSecretRef.current = '';
  };

  // Helper to build contract providers
  const getProviders = async (api: any): Promise<any> => {
    if (!api) throw new Error('Wallet not connected.');
    const uris = await api.getServiceURIs();
    const zkConfigProvider = new FetchZkConfigProvider(uris.zkConfigURI);
    
    return {
      privateStateProvider: levelPrivateStateProvider({
        privateStoragePasswordProvider: () => Promise.resolve('shieldcert-password'),
        accountId: 'shieldcert-account'
      }),
      publicDataProvider: indexerPublicDataProvider(uris.indexerURI, uris.indexerWSURI),
      proofProvider: httpClientProofProvider(uris.proofServerURI, zkConfigProvider),
      zkConfigProvider,
      walletProvider: {
        coinPublicKey: await api.getCoinPublicKey(),
        encryptionPublicKey: await api.getEncryptionPublicKey(),
        balanceTx: (tx: any, newCoins: any) => api.balanceTransaction(tx, newCoins)
      },
      midnightProvider: {
        submitTx: (tx: any) => api.submitTransaction(tx)
      }
    };
  };

  // 4. Deploy Contract
  const deploy = async (issuerSecretHex: string) => {
    if (!issuerSecretHex) {
      setError('Issuer Secret is required to deploy.');
      return;
    }
    setError(null);
    setIsDeploying(true);
    setTxResult(null);
    
    try {
      // Store secret privately
      privateIssuerSecretRef.current = issuerSecretHex;
      privateCertDataRef.current = ''; // Reset

      const providers = await getProviders(walletAPI);

      // Setup witnesses interface with correct tuple type casts
      const witnesses = {
        getCertificateData: (context: any) => {
          const bytes = hexToBytes(privateCertDataRef.current || '00'.repeat(32));
          return [context.state, bytes] as [any, Uint8Array];
        },
        getIssuerSecret: (context: any) => {
          const bytes = hexToBytes(privateIssuerSecretRef.current);
          return [context.state, { bytes }] as [any, { bytes: Uint8Array }];
        }
      };

      // Wrap the contract class with CompiledContract structure using any-cast to avoid type checker generic errors
      const compiledContractInstance = (CompiledContract.make as any)('shield_cert', Contract)
        .pipe(
          (CompiledContract.withWitnesses as any)(witnesses),
          (CompiledContract.withCompiledFileAssets as any)('.')
        );

      // Deploy the contract to Preprod
      const deployed = await deployContract(providers, {
        compiledContract: compiledContractInstance as any,
        privateStateId: 'shieldcert-deployer-state',
        initialPrivateState: {}
      } as any) as any;

      const addr = deployed.deployTxData.public.contractAddress;
      setContractAddress(addr);
      setTxResult(`Successfully deployed contract at: ${addr}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Contract deployment failed.');
    } finally {
      setIsDeploying(false);
    }
  };

  // 5. Register Credential (calls registerCredential circuit)
  const registerCredential = async (
    targetContractAddr: string, 
    issuerSecretHex: string, 
    certDataHex: string
  ) => {
    if (!targetContractAddr || !issuerSecretHex || !certDataHex) {
      setError('Contract address, Issuer Secret, and Certificate Data are all required.');
      return;
    }
    setError(null);
    setIsCalling(true);
    setTxResult(null);

    try {
      // Set private inputs privately in memory
      privateIssuerSecretRef.current = issuerSecretHex;
      privateCertDataRef.current = certDataHex;

      const providers = await getProviders(walletAPI);

      const witnesses = {
        getCertificateData: (context: any) => {
          const bytes = hexToBytes(privateCertDataRef.current);
          return [context.state, bytes] as [any, Uint8Array];
        },
        getIssuerSecret: (context: any) => {
          const bytes = hexToBytes(privateIssuerSecretRef.current);
          return [context.state, { bytes }] as [any, { bytes: Uint8Array }];
        }
      };

      // Wrap the contract class with CompiledContract structure
      const compiledContractInstance = (CompiledContract.make as any)('shield_cert', Contract)
        .pipe(
          (CompiledContract.withWitnesses as any)(witnesses),
          (CompiledContract.withCompiledFileAssets as any)('.')
        );
      
      const deployed = await findDeployedContract(providers, {
        contractAddress: targetContractAddr,
        compiledContract: compiledContractInstance as any
      } as any) as any;

      // Execute registerCredential circuit off-chain (ZK proof generated locally in browser)
      // and submit the transaction on-chain.
      const tx = await deployed.callTx.registerCredential() as any;

      setTxResult(`Credential registered successfully! Transaction ID: ${tx.txId || tx.transactionId || tx.toString()}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Register Credential circuit call failed.');
    } finally {
      setIsCalling(false);
    }
  };

  // 6. Verify Credential (calls verifyCredential circuit)
  const verifyCredential = async (
    targetContractAddr: string, 
    issuerSecretHex: string, 
    certDataHex: string
  ) => {
    if (!targetContractAddr || !issuerSecretHex || !certDataHex) {
      setError('Contract address, Issuer Secret, and Certificate Data are required.');
      return;
    }
    setError(null);
    setIsCalling(true);
    setTxResult(null);

    try {
      // Set private inputs privately in memory
      privateIssuerSecretRef.current = issuerSecretHex;
      privateCertDataRef.current = certDataHex;

      const providers = await getProviders(walletAPI);

      const witnesses = {
        getCertificateData: (context: any) => {
          const bytes = hexToBytes(privateCertDataRef.current);
          return [context.state, bytes] as [any, Uint8Array];
        },
        getIssuerSecret: (context: any) => {
          const bytes = hexToBytes(privateIssuerSecretRef.current);
          return [context.state, { bytes }] as [any, { bytes: Uint8Array }];
        }
      };

      // Wrap the contract class with CompiledContract structure
      const compiledContractInstance = (CompiledContract.make as any)('shield_cert', Contract)
        .pipe(
          (CompiledContract.withWitnesses as any)(witnesses),
          (CompiledContract.withCompiledFileAssets as any)('.')
        );

      const deployed = await findDeployedContract(providers, {
        contractAddress: targetContractAddr,
        compiledContract: compiledContractInstance as any
      } as any) as any;

      // Execute verifyCredential circuit off-chain (ZK proof generated locally in browser)
      // and submit verifyTx on-chain.
      const tx = await deployed.callTx.verifyCredential() as any;

      setTxResult(`Verification Successful! Credential validity verified via ZK proof. Transaction ID: ${tx.txId || tx.transactionId || tx.toString()}`);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Verification failed: provided details do not match the registered credential.');
    } finally {
      setIsCalling(false);
    }
  };

  return {
    isConnected,
    isConnecting,
    isCalling,
    isDeploying,
    address,
    balance,
    contractAddress,
    error,
    txResult,
    checkWalletInstalled,
    connect,
    disconnect,
    deploy,
    registerCredential,
    verifyCredential
  };
}
