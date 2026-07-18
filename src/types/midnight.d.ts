interface MidnightWallet {
  connect(networkId: string): Promise<any>;
  enable(): Promise<any>;
  isEnabled(): Promise<boolean>;
}

interface Window {
  midnight?: {
    mnLace?: MidnightWallet;
    lace?: MidnightWallet;
  };
}
