import React from 'react';

interface WalletConnectProps {
  isConnected: boolean;
  isConnecting: boolean;
  address: string | null;
  balance: string | null;
  error: string | null;
  checkWalletInstalled: () => boolean;
  connect: () => Promise<void>;
  disconnect: () => void;
}

export const WalletConnect: React.FC<WalletConnectProps> = ({
  isConnected,
  isConnecting,
  address,
  balance,
  error,
  checkWalletInstalled,
  connect,
  disconnect,
}) => {
  const isInstalled = checkWalletInstalled();

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-4 relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute -top-10 -right-10 w-24 h-24 bg-violet-600 rounded-full blur-3xl opacity-30 pulse-glow"></div>
      
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${isConnected ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 'bg-rose-500 shadow-[0_0_12px_#f43f5e]'}`}></span>
          Lace Wallet Connectivity
        </h2>
        {isConnected && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            Connected (Preprod)
          </span>
        )}
      </div>

      {!isInstalled ? (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-sm">
          <strong>Lace Wallet Not Detected:</strong> Please install the 
          <a 
            href="https://www.lace.io" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="underline ml-1 font-semibold hover:text-amber-200"
          >
            Lace Beta Wallet Chrome extension
          </a> and toggle on Developer Mode for Midnight.
        </div>
      ) : (
        <>
          {error && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm break-words">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!isConnected ? (
            <div className="flex flex-col gap-3">
              <p className="text-slate-400 text-sm">
                Connect your Lace wallet to interact with zero-knowledge verification smart circuits on Midnight.
              </p>
              <button
                onClick={connect}
                disabled={isConnecting}
                className="w-full btn-primary text-white font-semibold py-3 px-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isConnecting ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Establishing Connection...
                  </>
                ) : (
                  'Connect Lace Wallet'
                )}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">UNSHIELDED ADDRESS</span>
                  <span className="font-mono text-sm text-slate-300 select-all block truncate" title={address || ''}>
                    {address}
                  </span>
                </div>
                <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
                  <span className="text-xs text-slate-500 block mb-1">BALANCE</span>
                  <span className="font-bold text-lg text-gradient block">
                    {balance ? `${Number(balance).toLocaleString()} tDUST` : '0.00 tDUST'}
                  </span>
                </div>
              </div>

              <button
                onClick={disconnect}
                className="w-full btn-secondary text-slate-300 font-semibold py-2.5 px-4 rounded-xl transition duration-150"
              >
                Disconnect Session
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
