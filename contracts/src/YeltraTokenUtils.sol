// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

library YeltraTokenUtils {
    error TokenCallFailed(address token, bytes4 selector);
    error TokenReturnedFalse(address token, bytes4 selector);
    error MulDivOverflow();

    function safeTransfer(address token, address to, uint256 amount) internal {
        _call(token, abi.encodeWithSelector(bytes4(keccak256("transfer(address,uint256)")), to, amount));
    }

    function safeTransferFrom(address token, address from, address to, uint256 amount) internal {
        _call(
            token, abi.encodeWithSelector(bytes4(keccak256("transferFrom(address,address,uint256)")), from, to, amount)
        );
    }

    function safeApprove(address token, address spender, uint256 amount) internal {
        _call(token, abi.encodeWithSelector(bytes4(keccak256("approve(address,uint256)")), spender, amount));
    }

    function balanceOf(address token, address account) internal view returns (uint256 balance) {
        (bool success, bytes memory result) =
            token.staticcall(abi.encodeWithSelector(bytes4(keccak256("balanceOf(address)")), account));
        if (!success || result.length < 32) revert TokenCallFailed(token, bytes4(keccak256("balanceOf(address)")));
        balance = abi.decode(result, (uint256));
    }

    function decimals(address token) internal view returns (uint8 value) {
        (bool success, bytes memory result) = token.staticcall(abi.encodeWithSelector(bytes4(keccak256("decimals()"))));
        if (!success || result.length < 32) revert TokenCallFailed(token, bytes4(keccak256("decimals()")));
        value = abi.decode(result, (uint8));
    }

    /// @dev Full-precision floor(x * y / denominator), adapted for the
    ///      native market's loss pro-rata redemption path.
    function mulDivDown(uint256 x, uint256 y, uint256 denominator) internal pure returns (uint256 result) {
        if (denominator == 0) revert MulDivOverflow();

        uint256 prod0;
        uint256 prod1;
        assembly {
            let mm := mulmod(x, y, not(0))
            prod0 := mul(x, y)
            prod1 := sub(sub(mm, prod0), lt(mm, prod0))
        }

        if (prod1 == 0) return prod0 / denominator;
        if (prod1 >= denominator) revert MulDivOverflow();

        uint256 remainder;
        assembly {
            remainder := mulmod(x, y, denominator)
            prod1 := sub(prod1, gt(remainder, prod0))
            prod0 := sub(prod0, remainder)
        }

        uint256 twos = denominator & (~denominator + 1);
        assembly {
            denominator := div(denominator, twos)
            prod0 := div(prod0, twos)
            twos := add(div(sub(0, twos), twos), 1)
            prod0 := or(prod0, mul(prod1, twos))
        }

        uint256 inverse = (3 * denominator) ^ 2;
        inverse *= 2 - denominator * inverse;
        inverse *= 2 - denominator * inverse;
        inverse *= 2 - denominator * inverse;
        inverse *= 2 - denominator * inverse;
        inverse *= 2 - denominator * inverse;
        inverse *= 2 - denominator * inverse;
        result = prod0 * inverse;
    }

    function _call(address token, bytes memory data) private {
        bytes4 selector;
        assembly {
            selector := mload(add(data, 32))
        }
        (bool success, bytes memory result) = token.call(data);
        if (!success) revert TokenCallFailed(token, selector);
        if (result.length > 0 && !abi.decode(result, (bool))) revert TokenReturnedFalse(token, selector);
    }
}
