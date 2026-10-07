// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

abstract contract YeltraSplitToken {
    error AlreadyConfigured();
    error InvalidAddress();
    error InsufficientBalance();
    error InsufficientAllowance();
    error NonTransferable();
    error Unauthorized(address caller);

    string public name;
    string public symbol;
    uint8 public immutable decimals;
    uint256 public totalSupply;
    address public immutable controller;
    address public market;
    bool public immutable transferable;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
    event MarketConfigured(address indexed market);

    constructor(string memory name_, string memory symbol_, uint8 decimals_, address controller_, bool transferable_) {
        if (controller_ == address(0)) revert InvalidAddress();
        name = name_;
        symbol = symbol_;
        decimals = decimals_;
        controller = controller_;
        transferable = transferable_;
    }

    function setMarket(address market_) external {
        if (msg.sender != controller) revert Unauthorized(msg.sender);
        if (market != address(0)) revert AlreadyConfigured();
        if (market_ == address(0)) revert InvalidAddress();
        market = market_;
        emit MarketConfigured(market_);
    }

    function mint(address to, uint256 amount) external {
        _onlyMarket();
        if (to == address(0)) revert InvalidAddress();
        totalSupply += amount;
        balanceOf[to] += amount;
        emit Transfer(address(0), to, amount);
    }

    function burn(address from, uint256 amount) external {
        _onlyMarket();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
            totalSupply -= amount;
        }
        emit Transfer(from, address(0), amount);
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        if (!transferable) revert NonTransferable();
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (!transferable) revert NonTransferable();
        _transfer(msg.sender, to, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (!transferable) revert NonTransferable();
        uint256 permitted = allowance[from][msg.sender];
        if (permitted < amount) revert InsufficientAllowance();
        if (permitted != type(uint256).max) {
            unchecked {
                allowance[from][msg.sender] = permitted - amount;
            }
            emit Approval(from, msg.sender, allowance[from][msg.sender]);
        }
        _transfer(from, to, amount);
        return true;
    }

    function _transfer(address from, address to, uint256 amount) internal {
        if (to == address(0)) revert InvalidAddress();
        if (balanceOf[from] < amount) revert InsufficientBalance();
        unchecked {
            balanceOf[from] -= amount;
            balanceOf[to] += amount;
        }
        emit Transfer(from, to, amount);
    }

    function _onlyMarket() internal view {
        if (msg.sender != market || market == address(0)) revert Unauthorized(msg.sender);
    }
}
