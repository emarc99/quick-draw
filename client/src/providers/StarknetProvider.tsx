import type { PropsWithChildren } from "react";
import { sepolia } from "@starknet-react/chains";
import {
  jsonRpcProvider,
  StarknetConfig,
  starkscan,
} from "@starknet-react/core";
import cartridgeConnector from "../config/cartridgeConnector";

export function StarknetProvider({ children }: PropsWithChildren) {
  // Create JSON-RPC provider with Cartridge RPC URL
  const provider = jsonRpcProvider({
    rpc: () => ({ nodeUrl: "https://api.cartridge.gg/x/starknet/sepolia" }),
  });

  return (
    <StarknetConfig
      autoConnect={true}
      chains={[sepolia]}
      connectors={[cartridgeConnector]}
      explorer={starkscan}
      provider={provider}
    >
      {children}
    </StarknetConfig>
  );
}
