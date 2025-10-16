import { ControllerConnector } from "@cartridge/connector";

// Contract address from deployed Sepolia manifest
const CONTRACT_ADDRESS_GAME = "0x355a29ca07c0be392b71ae49332e70b2f8e7b38ead32c8b663410587db7d82f";

// Session policies - define allowed contract methods
const policies = {
  contracts: {
    [CONTRACT_ADDRESS_GAME]: {
      methods: [
        { name: "create_match", entrypoint: "create_match" },
        { name: "join_match", entrypoint: "join_match" },
        { name: "commit_action", entrypoint: "commit_action" },
        { name: "reveal_action", entrypoint: "reveal_action" },
      ],
    },
  },
};

// Cartridge controller configuration
const cartridgeConnector = new ControllerConnector({
  policies,
  url: "https://x.cartridge.gg", // Explicitly set keychain URL with valid SSL
});

export default cartridgeConnector;
