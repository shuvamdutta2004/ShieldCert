import React, { useState } from 'react';

interface CircuitCallProps {
  isConnected: boolean;
  isCalling: boolean;
  isDeploying: boolean;
  contractAddress: string | null;
  txResult: string | null;
  error: string | null;
  deploy: (issuerSecretHex: string) => Promise<void>;
  registerCredential: (
    targetContractAddr: string, 
    issuerSecretHex: string, 
    certDataHex: string
  ) => Promise<void>;
  verifyCredential: (
    targetContractAddr: string, 
    issuerSecretHex: string, 
    certDataHex: string
  ) => Promise<void>;
}

export const CircuitCall: React.FC<CircuitCallProps> = ({
  isConnected,
  isCalling,
  isDeploying,
  contractAddress,
  txResult,
  error,
  deploy,
  registerCredential,
  verifyCredential,
}) => {
  const [activeTab, setActiveTab] = useState<'register' | 'verify' | 'deploy'>('verify');
  
  // Input fields (these represent raw private variables)
  const [targetAddress, setTargetAddress] = useState<string>('');
  const [issuerSecret, setIssuerSecret] = useState<string>('deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234deadbeefcafe1234');
  const [certData, setCertData] = useState<string>('abc123abc123abc123abc123abc123abc123abc123abc123abc123abc123abcd');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected) return;

    if (activeTab === 'deploy') {
      await deploy(issuerSecret);
    } else if (activeTab === 'register') {
      await registerCredential(targetAddress, issuerSecret, certData);
    } else if (activeTab === 'verify') {
      await verifyCredential(targetAddress, issuerSecret, certData);
    }
  };

  return (
    <div className="glass-panel p-6 rounded-2xl border border-slate-800 flex flex-col gap-6 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute -bottom-10 -left-10 w-24 h-24 bg-pink-600 rounded-full blur-3xl opacity-20 pulse-glow"></div>

      <div className="border-b border-slate-800 pb-2">
        <h2 className="text-xl font-bold text-slate-100">Smart Contract & ZK Circuits</h2>
        <p className="text-slate-400 text-xs mt-1">Execute ZK-proofs locally in your browser before committing to Preprod.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/60 p-0.5 rounded-lg bg-slate-950/60">
        <button
          onClick={() => setActiveTab('verify')}
          className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition ${activeTab === 'verify' ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Verify Credential
        </button>
        <button
          onClick={() => setActiveTab('register')}
          className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition ${activeTab === 'register' ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Register Credential
        </button>
        <button
          onClick={() => setActiveTab('deploy')}
          className={`flex-1 text-center py-2 text-sm font-medium rounded-md transition ${activeTab === 'deploy' ? 'bg-violet-600/25 text-violet-300 border border-violet-500/30' : 'text-slate-400 hover:text-slate-200'}`}
        >
          Deploy Contract
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        {/* Target Contract Address (only for register/verify) */}
        {activeTab !== 'deploy' && (
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Contract Address (Preprod)</label>
            <input
              type="text"
              value={targetAddress}
              onChange={(e) => setTargetAddress(e.target.value)}
              placeholder="e.g. 0100000000..."
              className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-violet-500/50 transition"
              required
            />
          </div>
        )}

        {/* Private Issuer Secret (Private Input) */}
        <div className="flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Issuer Secret Key</label>
            <span className="text-[10px] font-bold text-pink-500/80 px-2 py-0.5 rounded bg-pink-500/5 border border-pink-500/10 tracking-widest">PRIVATE WITNESS</span>
          </div>
          <input
            type="password"
            value={issuerSecret}
            onChange={(e) => setIssuerSecret(e.target.value)}
            placeholder="64-character hex secret key"
            className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-violet-500/50 transition"
            required
          />
        </div>

        {/* Private Certificate Data (Private Input) */}
        {activeTab !== 'deploy' && (
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Certificate Data</label>
              <span className="text-[10px] font-bold text-pink-500/80 px-2 py-0.5 rounded bg-pink-500/5 border border-pink-500/10 tracking-widest">PRIVATE WITNESS</span>
            </div>
            <textarea
              value={certData}
              onChange={(e) => setCertData(e.target.value)}
              placeholder="Certificate metadata payload (e.g. name, date of birth, registration code)"
              rows={2}
              className="bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3 text-slate-300 font-mono text-sm focus:outline-none focus:border-violet-500/50 transition resize-none"
              required
            />
          </div>
        )}

        {/* Proved without revealing input label */}
        <div className="p-3 rounded-xl bg-violet-500/5 border border-violet-500/10 text-center">
          <span className="text-xs font-semibold text-violet-400 tracking-wider uppercase block">
            🔒 Proved without revealing your input
          </span>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            The inputs above remain entirely inside the browser's memory and are never transmitted to the blockchain.
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!isConnected || isCalling || isDeploying}
          className="w-full btn-primary text-white font-semibold py-3.5 px-4 rounded-xl flex justify-center items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed disabled:transform-none"
        >
          {isCalling || isDeploying ? (
            <>
              <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isDeploying ? 'Deploying Smart Contract...' : 'Generating Local ZK Proof...'}
            </>
          ) : !isConnected ? (
            'Connect Wallet First'
          ) : activeTab === 'deploy' ? (
            'Deploy Smart Contract'
          ) : activeTab === 'register' ? (
            'Register Credential Circuit'
          ) : (
            'Verify Credential Circuit'
          )}
        </button>
      </form>

      {/* Transaction Result Display */}
      {txResult && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-sm flex flex-col gap-1.5 break-words">
          <strong className="font-bold flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            Transaction Successful
          </strong>
          <span className="font-mono text-xs text-slate-400">{txResult}</span>
        </div>
      )}

      {/* Local Error message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-sm break-words">
          <strong>Transaction Failed:</strong> {error}
        </div>
      )}
    </div>
  );
};
