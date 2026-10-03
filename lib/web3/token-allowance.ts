import {
  erc20Abi,
  isAddress,
  type Address,
  type Hex,
  type PublicClient,
  type WalletClient,
} from "viem";
import { normalizeYieldError, YieldDomainError } from "@/types/errors";
import type { TokenApprovalRequest } from "@/types/transaction";

export interface TokenAllowanceAdapter {
  getAllowance(
    tokenAddress: Address,
    owner: Address,
    spender: Address,
    chainId: number,
  ): Promise<bigint>;
  approve(request: TokenApprovalRequest): Promise<Hex>;
}

export class ViemTokenAllowanceAdapter implements TokenAllowanceAdapter {
  constructor(
    private readonly publicClient: PublicClient,
    private readonly walletClient?: WalletClient,
  ) {}

  private assertRequest(tokenAddress: Address, owner: Address, spender: Address, chainId: number): void {
    if (!isAddress(tokenAddress) || !isAddress(owner) || !isAddress(spender)) {
      throw new YieldDomainError("invalid-token-metadata", "A token or spender address is invalid.");
    }
    if (this.publicClient.chain?.id && this.publicClient.chain.id !== chainId) {
      throw new YieldDomainError("wrong-network", "The RPC client is connected to a different network.");
    }
    if (this.walletClient?.chain?.id && this.walletClient.chain.id !== chainId) {
      throw new YieldDomainError("wrong-network", "The wallet is connected to a different network.");
    }
  }

  async getAllowance(
    tokenAddress: Address,
    owner: Address,
    spender: Address,
    chainId: number,
  ): Promise<bigint> {
    this.assertRequest(tokenAddress, owner, spender, chainId);
    try {
      return await this.publicClient.readContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: "allowance",
        args: [owner, spender],
      });
    } catch (error) {
      throw normalizeYieldError(error);
    }
  }

  async approve(request: TokenApprovalRequest): Promise<Hex> {
    this.assertRequest(request.tokenAddress, request.owner, request.spender, request.chainId);
    if (request.amount <= BigInt(0)) {
      throw new YieldDomainError("invalid-amount", "Approval amount must be greater than zero.");
    }
    const walletClient = this.walletClient;
    if (!walletClient) {
      throw new YieldDomainError("wallet-disconnected", "Connect a wallet to approve this token.");
    }

    try {
      return await walletClient.writeContract({
        account: request.owner,
        address: request.tokenAddress,
        abi: erc20Abi,
        functionName: "approve",
        args: [request.spender, request.amount],
        chain: walletClient.chain,
      });
    } catch (error) {
      throw normalizeYieldError(error);
    }
  }
}
