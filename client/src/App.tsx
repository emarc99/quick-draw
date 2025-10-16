import { useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { ConnectWallet } from './components/ConnectWallet';
import { BattleArena } from './components/BattleArena';

function App() {
  const { address, account } = useAccount();
  const [activeMatchId, setActiveMatchId] = useState<number | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [waitingMatchId, setWaitingMatchId] = useState<number | null>(null);

  // Demo mode address
  const displayAddress = demoMode ? '0x1234...5678' : address;

  const createMatch = async () => {
    if (!account) return;

    setIsCreatingMatch(true);
    try {
      const tx = await account.execute({
        contractAddress: '0x355a29ca07c0be392b71ae49332e70b2f8e7b38ead32c8b663410587db7d82f',
        entrypoint: 'create_match',
        calldata: ['0', '0'], // wager_amount as u256 (low, high)
      });

      console.log('Match created:', tx.transaction_hash);

      // Use timestamp-based match ID (same as contract logic)
      const matchId = Math.floor(Date.now() / 1000) % 1000000;
      setWaitingMatchId(matchId); // Show waiting screen instead of going straight to arena
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Failed to create match: ' + (error as Error).message);
    } finally {
      setIsCreatingMatch(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl font-bold bg-gradient-to-r from-orange-400 to-purple-600 bg-clip-text text-transparent">
              Quick Draw Arena
            </h1>
            <p className="text-gray-400 mt-2">1v1 Commit-Reveal Dueling Game</p>
          </div>
          <ConnectWallet />
        </header>

        {/* Main Content */}
        <main>
          {!displayAddress ? (
            <div className="text-center py-20">
              <div className="bg-gray-800/50 rounded-xl p-12 max-w-md mx-auto border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Welcome to Quick Draw Arena</h2>
                <p className="text-gray-400 mb-6">
                  Connect your wallet to start dueling in epic 1v1 battles with rock-paper-scissors style combat!
                </p>
                <div className="flex flex-col gap-3 items-center">
                  <ConnectWallet />
                  <button
                    onClick={() => setDemoMode(true)}
                    className="px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                  >
                    Try Demo Mode
                  </button>
                </div>
              </div>
            </div>
          ) : waitingMatchId ? (
            <div className="text-center py-20">
              <div className="bg-gray-800/50 rounded-xl p-12 max-w-lg mx-auto border border-gray-700">
                <div className="mb-6">
                  <div className="inline-block p-4 bg-orange-500/20 rounded-full mb-4">
                    <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                  </div>
                </div>
                <h2 className="text-3xl font-bold mb-4">Match Created!</h2>
                <p className="text-gray-400 mb-8">Waiting for opponent to join...</p>

                <div className="bg-gray-900 rounded-lg p-6 mb-8">
                  <p className="text-sm text-gray-400 mb-2">Share this Match ID:</p>
                  <div className="flex items-center gap-3 justify-center">
                    <code className="text-3xl font-bold text-orange-400">{waitingMatchId}</code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(waitingMatchId.toString());
                        alert('Match ID copied to clipboard!');
                      }}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <div className="space-y-3 text-sm text-gray-400">
                  <p>📋 Share this ID with a friend to start the duel</p>
                  <p>⚔️ Best of 3 rounds - winner takes all!</p>
                  <p>🎯 Use Attack, Defend, or Special moves</p>
                </div>

                <div className="mt-6 p-4 bg-yellow-900/20 border border-yellow-700/50 rounded-lg text-sm text-yellow-200">
                  <p className="font-bold mb-1">⚠️ Important:</p>
                  <p>Your opponent must use a <span className="font-bold">different wallet account</span> to join. You cannot play against yourself!</p>
                </div>

                <button
                  onClick={() => {
                    setWaitingMatchId(null);
                    setActiveMatchId(null);
                  }}
                  className="mt-8 px-6 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm transition-colors"
                >
                  Cancel Match
                </button>
              </div>
            </div>
          ) : activeMatchId ? (
            <BattleArena matchId={activeMatchId} />
          ) : (
            <div className="text-center py-20">
              <div className="bg-gray-800/50 rounded-xl p-12 max-w-md mx-auto border border-gray-700">
                <h2 className="text-2xl font-bold mb-4">Ready to Battle?</h2>
                <p className="text-gray-400 mb-6">
                  Create a new match or join an existing one to start your duel!
                </p>
                <div className="space-y-4">
                  <button
                    onClick={createMatch}
                    disabled={isCreatingMatch || !address}
                    className="w-full py-4 bg-orange-500 hover:bg-orange-600 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingMatch ? 'Creating Match...' : 'Create Match'}
                  </button>
                  <button
                    onClick={async () => {
                      if (!account) return;
                      const matchId = prompt('Enter match ID to join (e.g., 642498):');
                      if (!matchId) return;

                      setIsCreatingMatch(true);
                      try {
                        const tx = await account.execute({
                          contractAddress: '0x355a29ca07c0be392b71ae49332e70b2f8e7b38ead32c8b663410587db7d82f',
                          entrypoint: 'join_match',
                          calldata: [matchId],
                        });

                        console.log('Joined match:', tx.transaction_hash);
                        alert('Successfully joined match! Waiting for confirmation...');
                        setActiveMatchId(parseInt(matchId));
                      } catch (error) {
                        console.error('Error joining match:', error);
                        alert('Failed to join match: ' + (error as Error).message);
                      } finally {
                        setIsCreatingMatch(false);
                      }
                    }}
                    disabled={!address || isCreatingMatch}
                    className="w-full py-4 bg-purple-500 hover:bg-purple-600 rounded-lg font-bold text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isCreatingMatch ? 'Joining...' : 'Join Match'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="mt-20 text-center text-gray-500 text-sm">
          <p>Built on Starknet with Dojo Engine</p>
          <p className="mt-2">
            Contract: 0x040903830c65eadc55dcf65845901c0597eca313fbd462e516bc72c86ef87ef7
          </p>
        </footer>
      </div>
    </div>
  );
}

export default App;
