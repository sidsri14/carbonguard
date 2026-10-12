// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CarbonCreditRegistry
/// @notice Minimal on-chain registry for attestation-backed carbon credits.
/// @dev The off-chain MRV gateway supplies deterministic hashes. This contract
///      enforces one mint per attestation and irreversible retirement.
contract CarbonCreditRegistry {
    enum Status {
        None,
        Active,
        Retired
    }

    struct Credit {
        address owner;
        bytes32 attestationHash;
        bytes32 metadataHash;
        uint256 gramsCO2e;
        uint64 issuedAt;
        uint64 retiredAt;
        Status status;
    }

    address public immutable oracle;
    mapping(bytes32 => Credit) private credits;
    mapping(bytes32 => bool) public usedAttestations;

    event CreditMinted(
        bytes32 indexed creditId,
        bytes32 indexed attestationHash,
        address indexed owner,
        uint256 gramsCO2e,
        bytes32 metadataHash
    );
    event CreditRetired(
        bytes32 indexed creditId,
        address indexed owner,
        bytes32 indexed beneficiaryHash,
        bytes32 reasonHash
    );

    error NotOracle();
    error NotCreditOwner();
    error ZeroAddress();
    error ZeroValue();
    error CreditAlreadyExists(bytes32 creditId);
    error CreditNotActive(bytes32 creditId);
    error AttestationAlreadyUsed(bytes32 attestationHash);

    constructor(address oracleAddress) {
        if (oracleAddress == address(0)) revert ZeroAddress();
        oracle = oracleAddress;
    }

    function mint(
        bytes32 creditId,
        bytes32 attestationHash,
        address owner,
        uint256 gramsCO2e,
        bytes32 metadataHash
    ) external {
        if (msg.sender != oracle) revert NotOracle();
        if (owner == address(0)) revert ZeroAddress();
        if (creditId == bytes32(0) || attestationHash == bytes32(0) || gramsCO2e == 0) {
            revert ZeroValue();
        }
        if (credits[creditId].status != Status.None) revert CreditAlreadyExists(creditId);
        if (usedAttestations[attestationHash]) revert AttestationAlreadyUsed(attestationHash);

        usedAttestations[attestationHash] = true;
        credits[creditId] = Credit({
            owner: owner,
            attestationHash: attestationHash,
            metadataHash: metadataHash,
            gramsCO2e: gramsCO2e,
            issuedAt: uint64(block.timestamp),
            retiredAt: 0,
            status: Status.Active
        });

        emit CreditMinted(creditId, attestationHash, owner, gramsCO2e, metadataHash);
    }

    function retire(bytes32 creditId, bytes32 beneficiaryHash, bytes32 reasonHash) external {
        Credit storage credit = credits[creditId];
        if (credit.status != Status.Active) revert CreditNotActive(creditId);
        if (msg.sender != credit.owner) revert NotCreditOwner();
        if (beneficiaryHash == bytes32(0)) revert ZeroValue();

        credit.status = Status.Retired;
        credit.retiredAt = uint64(block.timestamp);
        emit CreditRetired(creditId, credit.owner, beneficiaryHash, reasonHash);
    }

    function getCredit(bytes32 creditId) external view returns (Credit memory) {
        return credits[creditId];
    }
}
