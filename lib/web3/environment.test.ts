import { describe, expect, it } from "bun:test";
import {
  getConfiguredChainId,
  getConfiguredNetwork,
  getRuntimeEnvironmentValidation,
} from "./environment";

describe("configured Robinhood network", () => {
  it("defaults to mainnet and supports explicit testnet selection", () => {
    const previous = process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
    try {
      delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      expect(getConfiguredNetwork()).toBe("mainnet");
      expect(getConfiguredChainId()).toBe(4663);

      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = "testnet";
      expect(getConfiguredNetwork()).toBe("testnet");
      expect(getConfiguredChainId()).toBe(46630);
    } finally {
      if (previous === undefined) delete process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV;
      else process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = previous;
    }
  });

  it("validates the production public runtime configuration without exposing values", () => {
    const previous = {
      rpc: process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL,
      testnetRpc: process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL,
      network: process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV,
      mode: process.env.NEXT_PUBLIC_YELTRA_DATA_MODE,
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID,
    };
    try {
      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL = "https://mainnet.example/rpc";
      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL = "https://testnet.example/rpc";
      process.env.NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV = "mainnet";
      process.env.NEXT_PUBLIC_YELTRA_DATA_MODE = "live";
      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = "a".repeat(32);

      expect(getRuntimeEnvironmentValidation()).toMatchObject({
        browseChainId: 4663,
        dataMode: "live",
        mainnetRpcConfigured: true,
        walletConnectProjectIdValid: true,
        productionReady: true,
      });

      process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID = "not-a-project-id";
      expect(getRuntimeEnvironmentValidation().walletConnectProjectIdValid).toBe(false);
    } finally {
      for (const [key, value] of Object.entries({
        NEXT_PUBLIC_ROBINHOOD_CHAIN_RPC_URL: previous.rpc,
        NEXT_PUBLIC_ROBINHOOD_CHAIN_TESTNET_RPC_URL: previous.testnetRpc,
        NEXT_PUBLIC_ROBINHOOD_CHAIN_ENV: previous.network,
        NEXT_PUBLIC_YELTRA_DATA_MODE: previous.mode,
        NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID: previous.projectId,
      })) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });
});
