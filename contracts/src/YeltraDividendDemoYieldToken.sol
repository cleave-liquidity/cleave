// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYeltraDividendDemoAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraDividendDemoYieldToken
/// @notice Non-transferable, fixed-supply Testnet exposure marker for the Dividend Earn demo.
/// @dev This is synthetic development collateral, not NVDA, a Pendle YT, or a claim on value.
contract YeltraDividendDemoYieldToken {
    uint256 public constant TESTNET_CHAIN_ID = 46630;
    uint256 public constant DEMO_SUPPLY = 2 ether;
    bytes32 public constant OPERATOR_ROLE = keccak256("CLEAVE_OPERATOR");

    string public constant name = "YELTRA NVDA Development Yield Token";
    string public constant symbol = "yNVDA-DEV";
    uint8 public constant decimals = 18;
    bool public constant developmentOnly = true;

    IYeltraDividendDemoAccess public immutable accessManager;
    address public immutable designatedWallet;
    uint256 public totalSupply;
    mapping(address account => uint256 balance) public balanceOf;
    bool public developmentPositionMinted;

    error WrongChain(uint256 actualChainId);
    error InvalidAddress();
    error Unauthorized(address caller);
    error AlreadyMinted();
    error NonTransferable();

    event DevelopmentPositionMinted(address indexed wallet, uint256 amount);

    constructor(address accessManagerAddress, address demoWallet) {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        if (accessManagerAddress == address(0) || accessManagerAddress.code.length == 0 || demoWallet == address(0)) {
            revert InvalidAddress();
        }
        accessManager = IYeltraDividendDemoAccess(accessManagerAddress);
        designatedWallet = demoWallet;
    }

    /// @notice Mint the only demo exposure to the constructor-bound demo wallet.
    function mintDevelopmentPosition() external {
        if (block.chainid != TESTNET_CHAIN_ID) revert WrongChain(block.chainid);
        if (!accessManager.hasRole(OPERATOR_ROLE, msg.sender)) revert Unauthorized(msg.sender);
        if (developmentPositionMinted) revert AlreadyMinted();
        developmentPositionMinted = true;
        totalSupply = DEMO_SUPPLY;
        balanceOf[designatedWallet] = DEMO_SUPPLY;
        emit DevelopmentPositionMinted(designatedWallet, DEMO_SUPPLY);
    }

    /// @dev These ERC20-shaped methods fail closed so registered exposure cannot be transferred.
    function transfer(address, uint256) external pure returns (bool) {
        revert NonTransferable();
    }

    function approve(address, uint256) external pure returns (bool) {
        revert NonTransferable();
    }

    function transferFrom(address, address, uint256) external pure returns (bool) {
        revert NonTransferable();
    }
}
