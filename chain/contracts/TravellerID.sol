// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract TravellerID {
    struct Record {
        bytes32 profileHash;
        uint256 createdAt;
        address issuer;
    }

    mapping(string => Record) private records;

    event IdCreated(string blockchainId, bytes32 profileHash, address issuer);

    function createId(string calldata blockchainId, bytes32 profileHash) external {
        require(records[blockchainId].createdAt == 0, "ID already exists");

        records[blockchainId] = Record({
            profileHash: profileHash,
            createdAt: block.timestamp,
            issuer: msg.sender
        });

        emit IdCreated(blockchainId, profileHash, msg.sender);
    }

    function getRecord(string calldata blockchainId)
        external
        view
        returns (bytes32, uint256, address)
    {
        Record memory r = records[blockchainId];
        require(r.createdAt != 0, "ID not found");
        return (r.profileHash, r.createdAt, r.issuer);
    }
}
