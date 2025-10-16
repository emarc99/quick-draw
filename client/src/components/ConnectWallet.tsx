import { useAccount, useConnect, useDisconnect } from '@starknet-react/core';
import { Swords } from 'lucide-react';

export function ConnectWallet() {
  const { address } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();

  if (address) {
    return (
      <div className="flex items-center gap-4">
        <span className="text-sm">
          {address.slice(0, 6)}...{address.slice(-4)}
        </span>
        <button
          onClick={() => disconnect()}
          className="px-4 py-2 bg-red-600 rounded-lg hover:bg-red-700"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 p-8">
      <Swords className="w-24 h-24 text-primary" />
      <h1 className="text-4xl font-bold">Quick Draw Arena</h1>
      <p className="text-gray-400">Connect to start dueling</p>
      {connectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => connect({ connector })}
          className="px-6 py-3 bg-primary rounded-lg hover:bg-orange-600 font-semibold"
        >
          Connect with {connector.name}
        </button>
      ))}
    </div>
  );
}
