import { useState } from 'react';
import { useAccount } from '@starknet-react/core';
import { Sword, Shield, Zap } from 'lucide-react';
import { hash } from 'starknet';

type Action = 'attack' | 'defend' | 'special';

export function BattleArena({ matchId }: { matchId: number }) {
  const { account } = useAccount();
  const [selectedAction, setSelectedAction] = useState<Action | null>(null);
  const [hasCommitted, setHasCommitted] = useState(false);
  const [hasRevealed, setHasRevealed] = useState(false);

  const commitAction = async () => {
    if (!account || !selectedAction) return;

    try {
      const actionNum = selectedAction === 'attack' ? 1 : selectedAction === 'defend' ? 2 : 3;
      const salt = BigInt(Math.floor(Math.random() * 1e18));
      const commitment = hash.computePoseidonHash(actionNum.toString(), salt.toString());

      localStorage.setItem(`match_${matchId}_salt`, salt.toString());
      localStorage.setItem(`match_${matchId}_action`, actionNum.toString());

      const tx = await account.execute({
        contractAddress: '0x355a29ca07c0be392b71ae49332e70b2f8e7b38ead32c8b663410587db7d82f',
        entrypoint: 'commit_action',
        calldata: [matchId.toString(), commitment],
      });

      setHasCommitted(true);
      console.log('Action committed:', tx.transaction_hash);
      alert('Action committed! Wait for your opponent to commit, then click Reveal Action.');
    } catch (error) {
      console.error('Error committing:', error);
      alert('Error committing action. Check console for details.');
    }
  };

  const revealAction = async () => {
    if (!account) return;

    try {
      const salt = localStorage.getItem(`match_${matchId}_salt`);
      const action = localStorage.getItem(`match_${matchId}_action`);

      if (!salt || !action) {
        alert('No commitment found! You must commit an action first.');
        return;
      }

      const tx = await account.execute({
        contractAddress: '0x355a29ca07c0be392b71ae49332e70b2f8e7b38ead32c8b663410587db7d82f',
        entrypoint: 'reveal_action',
        calldata: [matchId.toString(), action, salt],
      });

      setHasRevealed(true);
      console.log('Action revealed:', tx.transaction_hash);
      alert('Action revealed! Wait for your opponent to reveal.');
    } catch (error: any) {
      console.error('Error revealing:', error);

      // Check if error is because opponent hasn't committed yet
      if (error?.message?.includes('Invalid commitment') || error?.message?.includes('Match not in progress')) {
        alert('Error: Make sure both players have committed their actions before revealing!');
      } else {
        alert('Error revealing action. Check console for details.');
      }
    }
  };

  const ActionButton = ({ action, icon: Icon, label }: any) => (
    <button
      onClick={() => setSelectedAction(action)}
      disabled={hasCommitted}
      className={`flex flex-col items-center p-6 rounded-lg border-2 transition-all ${
        selectedAction === action
          ? 'border-orange-500 bg-orange-500/20'
          : 'border-gray-600 hover:border-gray-400'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Icon className="w-12 h-12" />
      <span className="font-bold">{label}</span>
    </button>
  );

  return (
    <div className="max-w-4xl mx-auto p-8">
      <div className="bg-gray-800 rounded-xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-center">
          Match #{matchId}
        </h2>

        {/* Game Instructions */}
        <div className="bg-gray-900 rounded-lg p-4 mb-6 text-sm text-gray-300">
          <p className="font-bold mb-2">How to Play:</p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Choose your action (Attack, Defend, or Special)</li>
            <li>Click "Commit Action" to lock in your choice</li>
            <li>Wait for your opponent to commit their action</li>
            <li>Click "Reveal Action" to show your move</li>
            <li>First to win 2 rounds takes all!</li>
          </ol>
        </div>

        {/* Status Display */}
        <div className="mb-6 text-center">
          {!hasCommitted && <p className="text-orange-400">Choose your action below</p>}
          {hasCommitted && !hasRevealed && (
            <p className="text-yellow-400">Committed! Now wait for opponent, then reveal.</p>
          )}
          {hasRevealed && <p className="text-green-400">Revealed! Waiting for opponent...</p>}
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          <ActionButton action="attack" icon={Sword} label="Attack" />
          <ActionButton action="defend" icon={Shield} label="Defend" />
          <ActionButton action="special" icon={Zap} label="Special" />
        </div>

        <div className="space-y-3">
          <button
            onClick={commitAction}
            disabled={!selectedAction || hasCommitted}
            className="w-full py-4 bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
          >
            {hasCommitted ? 'Action Committed ✓' : 'Commit Action'}
          </button>

          <button
            onClick={revealAction}
            disabled={!hasCommitted || hasRevealed}
            className="w-full py-4 bg-blue-500 rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg"
          >
            {hasRevealed ? 'Action Revealed ✓' : 'Reveal Action'}
          </button>
        </div>
      </div>
    </div>
  );
}
