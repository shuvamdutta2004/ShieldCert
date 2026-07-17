import type * as __compactRuntime from '@midnight-ntwrk/compact-runtime';

export type Witnesses<PS> = {
  getCertificateData(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, Uint8Array];
  getIssuerSecret(context: __compactRuntime.WitnessContext<Ledger, PS>): [PS, { bytes: Uint8Array
                                                                              }];
}

export type ImpureCircuits<PS> = {
  registerCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type ProvableCircuits<PS> = {
  registerCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type PureCircuits = {
  deriveIssuerPublicKey(sk_0: { bytes: Uint8Array }): { bytes: Uint8Array };
}

export type Circuits<PS> = {
  deriveIssuerPublicKey(context: __compactRuntime.CircuitContext<PS>,
                        sk_0: { bytes: Uint8Array }): __compactRuntime.CircuitResults<PS, { bytes: Uint8Array
                                                                                          }>;
  registerCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  verifyCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
  revokeCredential(context: __compactRuntime.CircuitContext<PS>): __compactRuntime.CircuitResults<PS, []>;
}

export type Ledger = {
  readonly credentialHash: Uint8Array;
  readonly issuanceCount: bigint;
  readonly issuerPublicKey: { bytes: Uint8Array };
  readonly revokedCount: bigint;
}

export type ContractReferenceLocations = any;

export declare const contractReferenceLocations : ContractReferenceLocations;

export declare class Contract<PS = any, W extends Witnesses<PS> = Witnesses<PS>> {
  witnesses: W;
  circuits: Circuits<PS>;
  impureCircuits: ImpureCircuits<PS>;
  provableCircuits: ProvableCircuits<PS>;
  constructor(witnesses: W);
  initialState(context: __compactRuntime.ConstructorContext<PS>): __compactRuntime.ConstructorResult<PS>;
}

export declare function ledger(state: __compactRuntime.StateValue | __compactRuntime.ChargedState): Ledger;
export declare const pureCircuits: PureCircuits;
