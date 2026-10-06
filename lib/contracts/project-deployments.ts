import type { ContractChainId, ContractDeployment } from "./deployments";

/** Preserved legacy graph for rollback and historical provenance. */
export const legacyProjectContractDeployments: Readonly<
  Record<ContractChainId, readonly ContractDeployment[]>
> = {
  "4663": [
    {
      id: "yeltra-access-manager-mainnet",
      name: "CleaveAccessManager",
      category: "core",
      description: "Central YELTRA protocol role authority.",
      runtimeRole:
        "Shared admin, operator, and guardian authorization layer for YELTRA modules.",
      chainId: 4663,
      address: "0x8ba198d9275c65ee208eadd22084f38d0f193395",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x8ba198d9275c65ee208eadd22084f38d0f193395",
      usedByRuntime: false,
      deploymentTx:
        "0xc9b414bdfaa0645096998d509d453c64985961d5473f4ee152453b5e5c28bbe4",
      deploymentBlock: 79841471,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "401762",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-registry-mainnet",
      name: "CleaveRegistry",
      category: "core",
      description: "YELTRA-owned configuration anchor.",
      runtimeRole:
        "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path.",
      chainId: 4663,
      address: "0xaa58afad613b2048ef526325c6989ec74703152b",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xaa58afad613b2048ef526325c6989ec74703152b",
      usedByRuntime: false,
      deploymentTx:
        "0xfb451e91ba18e4bcc841de0d0b43d68c0c7cf7e475349407d3304f7af4d60303",
      deploymentBlock: 79841476,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "283560",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-adapter-registry-mainnet",
      name: "CleaveAdapterRegistry",
      category: "integration",
      description: "Approved external yield protocol integration registry.",
      runtimeRole:
        "Registry-only external adapter configuration; no arbitrary protocol execution.",
      chainId: 4663,
      address: "0xc6a3d3e37f917f971d73f3aa4ec4019a04cb7cac",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xc6a3d3e37f917f971d73f3aa4ec4019a04cb7cac",
      usedByRuntime: false,
      deploymentTx:
        "0xb9992d9eb1a808d2af39d3e954d0a1512acf3a43fb74b3da4e9402564ce06be1",
      deploymentBlock: 79841482,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "464469",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-market-registry-mainnet",
      name: "CleaveMarketRegistry",
      category: "integration",
      description: "Verified external market metadata registry.",
      runtimeRole:
        "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
      chainId: 4663,
      address: "0xf48ac38c6a4342135c3ff4e45c4cd750576fe8e7",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xf48ac38c6a4342135c3ff4e45c4cd750576fe8e7",
      usedByRuntime: false,
      deploymentTx:
        "0x77977580aefbd6a22a015483c6188e82a64b47f8de70e903a93cb07fea6f2065",
      deploymentBlock: 79841487,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "711510",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-risk-guard-mainnet",
      name: "CleaveRiskGuard",
      category: "risk",
      description: "Non-custodial global, market, and adapter pause controls.",
      runtimeRole: "Risk state consumed by the YELTRA execution boundary.",
      chainId: 4663,
      address: "0x4f3e119ddcd8d12b57b7c5b856f40ff85544913b",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x4f3e119ddcd8d12b57b7c5b856f40ff85544913b",
      usedByRuntime: false,
      deploymentTx:
        "0xa090ebf7d0818da896d5be3923dd7430ca20f28b1258f48625e6f94cb6b16f7e",
      deploymentBlock: 79841492,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "502842",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-execution-router-mainnet",
      name: "CleaveExecutionRouter",
      category: "execution",
      description:
        "Validated YELTRA execution boundary without arbitrary external calls.",
      runtimeRole:
        "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
      chainId: 4663,
      address: "0xc392c88a59d129af9a0c8dc2fcaaf9de3f635b03",
      verified: false,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xc392c88a59d129af9a0c8dc2fcaaf9de3f635b03",
      usedByRuntime: false,
      deploymentTx:
        "0x7ba751abb221b7e444c00b077d621a2168fced299752adf3354b4581927fd710",
      deploymentBlock: 79841497,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "489111",
      verificationStatus: "DEPLOYED / NOT VERIFIED",
    },
    {
      id: "yeltra-lifecycle-manager-mainnet",
      name: "CleaveLifecycleManager",
      category: "execution",
      description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
      runtimeRole:
        "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
      chainId: 4663,
      address: "0xc3c60d0680a5db41d68187c62af2dd499220a865",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xc3c60d0680a5db41d68187c62af2dd499220a865",
      usedByRuntime: false,
      deploymentTx:
        "0x3c92a0d114f7cd0806181021706663772330b1a425461738c65445617eee5088",
      deploymentBlock: 79841502,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "269790",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lens-mainnet",
      name: "CleaveLens",
      category: "read",
      description:
        "Read-only aggregation layer for YELTRA modules and market state.",
      runtimeRole:
        "Canonical combined read surface for frontend and deployment diagnostics.",
      chainId: 4663,
      address: "0x8a41d30eb2ea283d12505449a478f20c314c2cf9",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x8a41d30eb2ea283d12505449a478f20c314c2cf9",
      usedByRuntime: false,
      deploymentTx:
        "0x936ff7c4a44838153541927d74915423d500c0a4e9a1f69e13b95c9eeb9e84c2",
      deploymentBlock: 79841507,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "864996",
      verificationStatus: "VERIFIED",
    },
  ],
  "46630": [
    {
      id: "yeltra-registry-testnet",
      name: "CleaveRegistry",
      category: "core",
      description:
        "Existing YELTRA-owned configuration anchor; preserved without redeployment.",
      runtimeRole:
        "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path.",
      chainId: 46630,
      address: "0xa5d21b39258da11152a0e63135936b1e60acfe43",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xa5d21b39258da11152a0e63135936b1e60acfe43",
      usedByRuntime: false,
      deploymentTx:
        "0x4f6105364c255044b1bf4f0e6e92aa204c560ba9ac3107a7f7b38184ad3380ff",
      deploymentBlock: 128282341,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "321865",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-access-manager-testnet",
      name: "CleaveAccessManager",
      category: "core",
      description: "Central YELTRA protocol role authority.",
      runtimeRole:
        "Shared admin, operator, and guardian authorization layer for YELTRA modules.",
      chainId: 46630,
      address: "0x92ba9171bcbd8c03333dad4ea2349816e9378724",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x92ba9171bcbd8c03333dad4ea2349816e9378724",
      usedByRuntime: false,
      deploymentTx:
        "0x5b4d03a08742fc8940cba32539fe4dc8c197f770ae7354e6cb82fed6253c09ba",
      deploymentBlock: 128289567,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "451801",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-adapter-registry-testnet",
      name: "CleaveAdapterRegistry",
      category: "integration",
      description: "Approved external yield protocol integration registry.",
      runtimeRole:
        "Registry-only external adapter configuration; no arbitrary protocol execution.",
      chainId: 46630,
      address: "0xae1daa3deda30d2ea0eb3ffa3c4e1f36b4cd0f37",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xae1daa3deda30d2ea0eb3ffa3c4e1f36b4cd0f37",
      usedByRuntime: false,
      deploymentTx:
        "0xf17c3b47faca6af29aec2b1aedc85edcc1ce6654fd1bbcaafef450cf3c15c0f1",
      deploymentBlock: 128289570,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "524490",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-market-registry-testnet",
      name: "CleaveMarketRegistry",
      category: "integration",
      description: "Verified external market metadata registry.",
      runtimeRole:
        "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
      chainId: 46630,
      address: "0xbdd6fb3dac21effba38fbc8a6c17621cc2c90555",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xbdd6fb3dac21effba38fbc8a6c17621cc2c90555",
      usedByRuntime: false,
      deploymentTx:
        "0x4ce12abc60b2381375a6ec1721740fccc53d8ba113ad0911735b10741cc48c8c",
      deploymentBlock: 128289574,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "792250",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-risk-guard-testnet",
      name: "CleaveRiskGuard",
      category: "risk",
      description: "Non-custodial global, market, and adapter pause controls.",
      runtimeRole: "Risk state consumed by the YELTRA execution boundary.",
      chainId: 46630,
      address: "0xae71f3982621ddd823adc93f51365b30e1e8d171",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xae71f3982621ddd823adc93f51365b30e1e8d171",
      usedByRuntime: false,
      deploymentTx:
        "0x8215b6fcc0d9921d34322db465537679b675fd87a64ee9ce05cdd8e014ca2f44",
      deploymentBlock: 128289577,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "558674",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-execution-router-testnet",
      name: "CleaveExecutionRouter",
      category: "execution",
      description:
        "Validated YELTRA execution boundary without arbitrary external calls.",
      runtimeRole:
        "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
      chainId: 46630,
      address: "0xfcd780963a7e5f60d4f9d1021f3c90f966251a97",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xfcd780963a7e5f60d4f9d1021f3c90f966251a97",
      usedByRuntime: false,
      deploymentTx:
        "0x126e306c63ce20873b3085f57d05a61ed4ad88d47365481af48dbf8eda9b0ee7",
      deploymentBlock: 128289580,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "557553",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lifecycle-manager-testnet",
      name: "CleaveLifecycleManager",
      category: "execution",
      description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
      runtimeRole:
        "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
      chainId: 46630,
      address: "0x10b0aa389232d42d2f5121c9192c241ba30070b2",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x10b0aa389232d42d2f5121c9192c241ba30070b2",
      usedByRuntime: false,
      deploymentTx:
        "0x69296a9f2ecc9a03940901f8b60b10ec711cdbaeb5c9e67957f032f055edc32c",
      deploymentBlock: 128289585,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "312789",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lens-testnet",
      name: "CleaveLens",
      category: "read",
      description:
        "Read-only aggregation layer for YELTRA modules and market state.",
      runtimeRole:
        "Canonical combined read surface for frontend and deployment diagnostics.",
      chainId: 46630,
      address: "0x2323d2c46b497492499bbd4131d50dbe5f305627",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x2323d2c46b497492499bbd4131d50dbe5f305627",
      usedByRuntime: false,
      deploymentTx:
        "0xf786cd6f6af0fb1b057411cfd4852c7a7c64d3f02a89f4b856f0021657405b34",
      deploymentBlock: 128289590,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "958513",
      verificationStatus: "VERIFIED",
    },
  ],
};

/** Generated only from confirmed YELTRA Foundry broadcasts. */
export const projectContractDeployments: Readonly<
  Record<ContractChainId, readonly ContractDeployment[]>
> = {
  "4663": [
    {
      id: "yeltra-access-manager-mainnet",
      name: "YeltraAccessManager",
      description: "Central YELTRA protocol role authority.",
      chainId: 4663,
      category: "core",
      address: "0xb12c7112446bfe88d6e82b516f5df90449fa3dc4",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0xb12c7112446bfe88d6e82b516f5df90449fa3dc4",
      usedByRuntime: true,
      runtimeRole:
        "Shared admin, operator, and guardian authorization layer for YELTRA modules.",
      deploymentTx:
        "0x48c436982fc25e3ca197da8b3aa8468d54030dbb3fb88f6edd406da2ddb7a73b",
      deploymentBlock: 81667857,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "410229",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-registry-mainnet",
      name: "YeltraRegistry",
      description: "YELTRA-owned configuration anchor.",
      chainId: 4663,
      category: "core",
      address: "0x98ad9f5a69ae5b6400847f98181b4d917d9c32b9",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x98ad9f5a69ae5b6400847f98181b4d917d9c32b9",
      usedByRuntime: true,
      runtimeRole:
        "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path.",
      deploymentTx:
        "0xc6172a6e6b97e39168216005e52212c88e49070792c2dddff4142b2dd3242e13",
      deploymentBlock: 81667864,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "290449",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-adapter-registry-mainnet",
      name: "YeltraAdapterRegistry",
      description: "Approved external yield protocol integration registry.",
      chainId: 4663,
      category: "integration",
      address: "0x1c6827d9997f224df8b6a356fa5024c1458ac2fe",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x1c6827d9997f224df8b6a356fa5024c1458ac2fe",
      usedByRuntime: true,
      runtimeRole:
        "Registry-only external adapter configuration; no arbitrary protocol execution.",
      deploymentTx:
        "0x7a99865c204711a95cc515cb7337285596305e3f350035836e83d26351712396",
      deploymentBlock: 81667872,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "474501",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-market-registry-mainnet",
      name: "YeltraMarketRegistry",
      description: "Verified external market metadata registry.",
      chainId: 4663,
      category: "integration",
      address: "0x68d468a6b13b1123ff21d21e0f7aaf0a9c8d7e98",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x68d468a6b13b1123ff21d21e0f7aaf0a9c8d7e98",
      usedByRuntime: true,
      runtimeRole:
        "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
      deploymentTx:
        "0x725869e08a7bfc18007435ad314ae282b7e47e23b72f442b2bdab360d7022ae4",
      deploymentBlock: 81667883,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "724745",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-risk-guard-mainnet",
      name: "YeltraRiskGuard",
      description: "Non-custodial global, market, and adapter pause controls.",
      chainId: 4663,
      category: "risk",
      address: "0x0b40937337dd65bae64c260164e303c6c8184a48",
      verified: false,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x0b40937337dd65bae64c260164e303c6c8184a48",
      usedByRuntime: true,
      runtimeRole: "Risk state consumed by the YELTRA execution boundary.",
      deploymentTx:
        "0xc06f21d56a3b154083ea09a72e2d35d5057177a7f09773d0a16975e70425b1ab",
      deploymentBlock: 81667910,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "512106",
      verificationStatus: "DEPLOYED / NOT VERIFIED",
    },
    {
      id: "yeltra-execution-router-mainnet",
      name: "YeltraExecutionRouter",
      description:
        "Validated YELTRA execution boundary without arbitrary external calls.",
      chainId: 4663,
      category: "execution",
      address: "0x51892704370a3b9246de5ba71d572abdf20b42a1",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x51892704370a3b9246de5ba71d572abdf20b42a1",
      usedByRuntime: true,
      runtimeRole:
        "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
      deploymentTx:
        "0x6aa5cee2fd44298987334f61a7bdcc89802209454692866deb6a07a815e7fef3",
      deploymentBlock: 81667923,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "500619",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lifecycle-manager-mainnet",
      name: "YeltraLifecycleManager",
      description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
      chainId: 4663,
      category: "execution",
      address: "0x3ba49c7d18d0741c1808f46e085c9f049fdfaee2",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x3ba49c7d18d0741c1808f46e085c9f049fdfaee2",
      usedByRuntime: true,
      runtimeRole:
        "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
      deploymentTx:
        "0x894f3e4605d4a8fb014a4cdfd8f573e314b2c981dafb1c1f58d9a05044de1949",
      deploymentBlock: 81667930,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "276654",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lens-mainnet",
      name: "YeltraLens",
      description:
        "Read-only aggregation layer for YELTRA modules and market state.",
      chainId: 4663,
      category: "read",
      address: "0x37a1aa4ce1ab0c05d033ac13d3e51e5f72dfeb82",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://robinhoodchain.blockscout.com/address/0x37a1aa4ce1ab0c05d033ac13d3e51e5f72dfeb82",
      usedByRuntime: true,
      runtimeRole:
        "Canonical combined read surface for frontend and deployment diagnostics.",
      deploymentTx:
        "0xcad16cb31329d6032ab338c756e18076c762578ab8d60f3d18ee7c226fce09d1",
      deploymentBlock: 81667938,
      deployer: "0x67214bdf8597d46aaef7110983e2276dd2235f6e",
      gasUsed: "879786",
      verificationStatus: "VERIFIED",
    },
  ],
  "46630": [
    {
      id: "yeltra-access-manager-testnet",
      name: "YeltraAccessManager",
      description: "Central YELTRA protocol role authority.",
      chainId: 46630,
      category: "core",
      address: "0x3aab079e0017af37c15c7ab11e319995cf426097",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x3aab079e0017af37c15c7ab11e319995cf426097",
      usedByRuntime: true,
      runtimeRole:
        "Shared admin, operator, and guardian authorization layer for YELTRA modules.",
      deploymentTx:
        "0xb116a91187c98c1915714fa020d9dfef1d92d29b16aba0bbaad6d28743f96626",
      deploymentBlock: 129892824,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "441004",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-registry-testnet",
      name: "YeltraRegistry",
      description: "YELTRA-owned configuration anchor.",
      chainId: 46630,
      category: "core",
      address: "0x7f3a593071d8b09247cb5cccacd438b25a3d172b",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x7f3a593071d8b09247cb5cccacd438b25a3d172b",
      usedByRuntime: true,
      runtimeRole:
        "Top-level YELTRA discovery/configuration anchor; not part of the Pendle trade execution path.",
      deploymentTx:
        "0x7ec81f98c567b9c465844c8d6a1d23e3cad715d92fe2e0bb915a2212bbd0bc8f",
      deploymentBlock: 129892828,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "315402",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-adapter-registry-testnet",
      name: "YeltraAdapterRegistry",
      description: "Approved external yield protocol integration registry.",
      chainId: 46630,
      category: "integration",
      address: "0xdcf68ffc0e74dfa8d5c682de843fc988a1d3838c",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xdcf68ffc0e74dfa8d5c682de843fc988a1d3838c",
      usedByRuntime: true,
      runtimeRole:
        "Registry-only external adapter configuration; no arbitrary protocol execution.",
      deploymentTx:
        "0x083a3ab17f6628cc933edf5e5cf6017eb250232e1d531ac2d9fa3816906dd2e9",
      deploymentBlock: 129892834,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "511146",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-market-registry-testnet",
      name: "YeltraMarketRegistry",
      description: "Verified external market metadata registry.",
      chainId: 46630,
      category: "integration",
      address: "0x770dcf7927b42448bd52de6643c5d617ed0dfd45",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x770dcf7927b42448bd52de6643c5d617ed0dfd45",
      usedByRuntime: true,
      runtimeRole:
        "Registry-only market, PT, YT, SY, underlying, maturity, and adapter metadata.",
      deploymentTx:
        "0xee55cec83ab0281d70504ad729e46d444c6969ee6b63a7b339940c2e699134b6",
      deploymentBlock: 129892842,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "773893",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-risk-guard-testnet",
      name: "YeltraRiskGuard",
      description: "Non-custodial global, market, and adapter pause controls.",
      chainId: 46630,
      category: "risk",
      address: "0x431478e35e5ca3f979f46c82126a6fa277f35a7a",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x431478e35e5ca3f979f46c82126a6fa277f35a7a",
      usedByRuntime: true,
      runtimeRole: "Risk state consumed by the YELTRA execution boundary.",
      deploymentTx:
        "0x20864379156212beb3570b2b12328074582dc8d3bfc06c5d24ae9aa7dffe8197",
      deploymentBlock: 129892851,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "545996",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-execution-router-testnet",
      name: "YeltraExecutionRouter",
      description:
        "Validated YELTRA execution boundary without arbitrary external calls.",
      chainId: 46630,
      category: "execution",
      address: "0xfd52dddf0217927e692d5cee849240258790f575",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0xfd52dddf0217927e692d5cee849240258790f575",
      usedByRuntime: true,
      runtimeRole:
        "Validates market, adapter, and risk state; current frontend Pendle execution remains direct.",
      deploymentTx:
        "0x163b23e404bae694c9ae0acc8fc97d67a7a62ce64c09ee1fba0ada69a3e5781f",
      deploymentBlock: 129892860,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "542517",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lifecycle-manager-testnet",
      name: "YeltraLifecycleManager",
      description: "Fixed Yield and Trading Yield lifecycle eligibility rules.",
      chainId: 46630,
      category: "execution",
      address: "0x7b55b6679914c14294c01f5ba99da4f98464928c",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x7b55b6679914c14294c01f5ba99da4f98464928c",
      usedByRuntime: true,
      runtimeRole:
        "Read-only sell, maturity, expiry, and yield-claim eligibility rules; no settlement or amount fabrication.",
      deploymentTx:
        "0x55e85a2d3c135112fff86c6ea6f1a1e0053168120ebd424c6b8535f53c018a8d",
      deploymentBlock: 129892867,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "302974",
      verificationStatus: "VERIFIED",
    },
    {
      id: "yeltra-lens-testnet",
      name: "YeltraLens",
      description:
        "Read-only aggregation layer for YELTRA modules and market state.",
      chainId: 46630,
      category: "read",
      address: "0x523a97092fb58df2d220b22c69b3e6836ae19495",
      verified: true,
      ownership: "project",
      explorerUrl:
        "https://explorer.testnet.chain.robinhood.com/address/0x523a97092fb58df2d220b22c69b3e6836ae19495",
      usedByRuntime: true,
      runtimeRole:
        "Canonical combined read surface for frontend and deployment diagnostics.",
      deploymentTx:
        "0x39da31874394874a9c573173392e4f01958e726f87166e6d2c291a45498cf08f",
      deploymentBlock: 129892875,
      deployer: "0x1e1ad136fb877ab473834e869407c7ae59fcfe8b",
      gasUsed: "937813",
      verificationStatus: "VERIFIED",
    },
  ],
};

export function getProjectContractDeployments(
  chainId: ContractChainId,
): readonly ContractDeployment[] {
  return projectContractDeployments[chainId];
}
