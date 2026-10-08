// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IYeltraDevelopmentCollateralAccess {
    function hasRole(bytes32 role, address account) external view returns (bool);
}

/// @title YeltraTestnetDevelopmentCollateral
/// @notice Isolated, mintable collateral for the Yield Rate Options Testnet
///         demonstration. This token is not USDG, USDC, or production money.
/// @dev This contract must never be deployed to Mainnet.
contract YeltraTestnetDevelopmentCollateral {
    bytes32 public constant ADMIN_ROLE = keccak256("CLEAVE_ADMIN");
    string public constant name = "YELTRA Testnet Development Collateral";
    string public constant symbol = "yDEVUSD";
    uint8 public constant decimals = 6;
    bool public constant DEVELOPMENT_ONLY = true;

    IYeltraDevelopmentCollateralAccess public immutable accessManager;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    error InvalidAddress();
    error InvalidAmount();
    error WrongChain(uint256 actualChainId);
    error InsufficientBalance(uint256 available, uint256 requested);
    error InsufficientAllowance(uint256 available, uint256 requested);
    error Unauthorized(address caller);

    event Transfer(address indexed from, address indexed to, uint256 amount);
    event Approval(address indexed owner, address indexed spender, uint256 amount);
    event DevelopmentMint(address indexed recipient, uint256 amount, address indexed minter);

    constructor(address accessManagerAddress) {
        if (block.chainid != 46630) revert WrongChain(block.chainid);
        if (accessManagerAddress == address(0)) revert InvalidAddress();
        accessManager = IYeltraDevelopmentCollateralAccess(accessManagerAddress);
    }

    function mint(address recipient, uint256 amount) external onlyAdmin {
        if (recipient == address(0)) revert InvalidAddress();
        if (amount == 0) revert InvalidAmount();
        totalSupply += amount;
        balanceOf[recipient] += amount;
        emit Transfer(address(0), recipient, amount);
        emit DevelopmentMint(recipient, amount, msg.sender);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (spender == address(0)) revert InvalidAddress();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address recipient, uint256 amount) external returns (bool) {
        _transfer(msg.sender, recipient, amount);
        return true;
    }

    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool) {
        uint256 permitted = allowance[sender][msg.sender];
        if (permitted < amount) revert InsufficientAllowance(permitted, amount);
        if (permitted != type(uint256).max) {
            allowance[sender][msg.sender] = permitted - amount;
            emit Approval(sender, msg.sender, permitted - amount);
        }
        _transfer(sender, recipient, amount);
        return true;
    }

    modifier onlyAdmin() {
        if (!accessManager.hasRole(ADMIN_ROLE, msg.sender)) revert Unauthorized(msg.sender);
        _;
    }

    function _transfer(address sender, address recipient, uint256 amount) internal {
        if (recipient == address(0)) revert InvalidAddress();
        uint256 available = balanceOf[sender];
        if (available < amount) revert InsufficientBalance(available, amount);
        balanceOf[sender] = available - amount;
        balanceOf[recipient] += amount;
        emit Transfer(sender, recipient, amount);
    }
}
