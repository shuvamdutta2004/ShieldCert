import React from 'react';
import { useMidnight } from './hooks/useMidnight';
import { WalletConnect } from './components/WalletConnect';
import { CircuitCall } from './components/CircuitCall';

export const App: React.FC = () => {
  const {
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
    verifyCredential,
  } = useMidnight();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col gap-8">
      {/* Header section */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-extrabold text-gradient tracking-tight">
            ShieldCert
          </h1>
          <p className="text-slate-400 text-sm md:text-base mt-1">
            Zero-Knowledge Certificate Verification on Midnight Network.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-semibold uppercase tracking-wider">
          Level 2: Waxing Crescent
        </div>
      </header>

      {/* Main layout */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar/Connect and Info */}
        <section className="lg:col-span-5 flex flex-col gap-6">
          <WalletConnect
            isConnected={isConnected}
            isConnecting={isConnecting}
            address={address}
            balance={balance}
            error={error}
            checkWalletInstalled={checkWalletInstalled}
            connect={connect}
            disconnect={disconnect}
          />

          <div className="glass-panel p-6 rounded-2xl border border-slate-800/80 flex flex-col gap-4">
            <h3 className="text-md font-bold text-slate-200">ShieldCert Privacy Claim</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              When verification executes, an on-chain observer sees <strong>only</strong> the transaction hash 
              and the state commitment changes.
            </p>
            <p className="text-slate-400 text-xs leading-relaxed">
              They <strong>cannot see</strong> the student's name, degree type, grade, or the secret keys. 
              The zero-knowledge circuit proves the certificate is authentic locally in the browser, leaving no private trace.
            </p>
            <div className="border-t border-slate-800/60 pt-3 mt-1 flex flex-col gap-2">
              <span className="text-xs font-semibold text-slate-300">Public (On-Chain) Data:</span>
              <ul className="list-disc pl-4 text-[11px] text-slate-400 flex flex-col gap-1">
                <li>Credential Hash commitment</li>
                <li>Total credential registration counter</li>
                <li>Issuer derived public key</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Action Panel */}
        <section className="lg:col-span-7">
          <CircuitCall
            isConnected={isConnected}
            isCalling={isCalling}
            isDeploying={isDeploying}
            contractAddress={contractAddress}
            txResult={txResult}
            error={error}
            deploy={deploy}
            registerCredential={registerCredential}
            verifyCredential={verifyCredential}
          />
        </section>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-slate-500 border-t border-slate-900 pt-6 mt-6">
        ShieldCert is powered by Midnight Network &bull; Compact Compiler v0.5.1 &bull; Lace DApp Connector API v4.0.1
      </footer>
    </div>
  );
};
