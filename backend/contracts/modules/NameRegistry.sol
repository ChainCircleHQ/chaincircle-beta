// SPDX-License-Identifier: MIT
pragma solidity ^0.8.22;

contract NameRegistry {

    mapping(address => string) public names;
    mapping(string => address) public addresses;

    event NameRegistered(address indexed user, string name);
    event NameUpdated(address indexed user, string oldName, string newName);

    function setName(string calldata name) external {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "Invalid name length");
        require(addresses[name] == address(0) || addresses[name] == msg.sender, "Name already taken");

        string memory oldName = names[msg.sender];
        
        if (bytes(oldName).length > 0) {
            delete addresses[oldName];
        }

        names[msg.sender] = name;
        addresses[name] = msg.sender;

        if (bytes(oldName).length > 0) {
            emit NameUpdated(msg.sender, oldName, name);
        } else {
            emit NameRegistered(msg.sender, name);
        }
    }

    function getName(address user) external view returns (string memory) {
        return names[user];
    }

    function getAddress(string calldata name) external view returns (address) {
        return addresses[name];
    }

    function hasName(address user) external view returns (bool) {
        return bytes(names[user]).length > 0;
    }
}