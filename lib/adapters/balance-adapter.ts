import { YieldDomainError } from "@/types/errors";

export interface BalanceAdapter {
  getTokenBalance(address: `0x${string}`, token: string): Promise<number>;
  getGasBalance(address: `0x${string}`): Promise<number>;
}

export const MOCK_TOKEN_BALANCE = 2_500;
export const MOCK_GAS_BALANCE = 0.01;
export const MOCK_NETWORK_FEE_ETH = 0.0004;

export class MockBalanceAdapter implements BalanceAdapter {
  async getTokenBalance(address: `0x${string}`, _token: string): Promise<number> {
    if (!address) {
      throw new YieldDomainError("wallet-disconnected", "Connect a wallet to read balances.");
    }
    return MOCK_TOKEN_BALANCE;
  }

  async getGasBalance(address: `0x${string}`): Promise<number> {
    if (!address) {
      throw new YieldDomainError("wallet-disconnected", "Connect a wallet to read gas balance.");
    }
    return MOCK_GAS_BALANCE;
  }
}

export const balanceAdapter = new MockBalanceAdapter();
