import React from 'react';
import { GameActProps } from '../types';
import { ArcadeButton } from '../components/ArcadeButton';

const BattlezoneGame: React.FC<GameActProps> = ({ initialFuel, initialScore, onComplete, onJumpToAct }) => {
  const handleSkip = () => {
    onComplete({
      fuelRemaining: initialFuel,
      scoreGained: 0,
      hullIntegrity: 100
    });
  };

  return (
    <div className="absolute top-0 left-0 w-full h-full bg-black flex flex-col items-center justify-center font-mono">
      <div className="max-w-2xl text-center p-8">
        <h1 className="text-[80px] text-[#0f0] tracking-[8px] uppercase font-bold mb-8 animate-pulse">
          ACT III
        </h1>
        <h2 className="text-[40px] text-[#0af] tracking-[4px] mb-12">
          THE BATTLE
        </h2>

        <div className="text-[#888] text-lg mb-12 leading-relaxed">
          <p className="mb-4">The swarm has been neutralized.</p>
          <p className="mb-4">But deep beneath the surface, something stirs...</p>
          <p className="mb-8">The true conflict is yet to begin.</p>

          <div className="border border-[#0af] p-6 mb-8">
            <p className="text-[#0af] text-2xl mb-4">⚠ COMING SOON ⚠</p>
            <p className="text-sm">
              Act III will feature first-person vector combat inspired by Battlezone.<br/>
              Navigate 3D wireframe battlefields and face the ancient guardians.
            </p>
          </div>
        </div>

        <div className="flex gap-4 justify-center">
          <ArcadeButton onClick={handleSkip}>
            SKIP TO VICTORY
          </ArcadeButton>
        </div>

        {/* Debug: Jump to Act */}
        {onJumpToAct && (
          <div className="mt-8 border-t border-[#333] pt-4">
            <p className="text-[#666] text-sm mb-3 text-center">DEBUG: Jump to Act</p>
            <div className="flex gap-2 justify-center">
              <button
                onClick={() => onJumpToAct(1)}
                className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#0f0] hover:border-[#0f0] transition-colors text-sm"
              >
                ACT I
              </button>
              <button
                onClick={() => onJumpToAct(2)}
                className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#fa0] hover:border-[#fa0] transition-colors text-sm"
              >
                ACT II
              </button>
              <button
                onClick={() => onJumpToAct(3)}
                className="px-4 py-2 bg-[#222] border border-[#444] text-[#888] hover:text-[#0af] hover:border-[#0af] transition-colors text-sm"
              >
                ACT III
              </button>
            </div>
          </div>
        )}

        <div className="mt-12 text-[#444] text-xs">
          <p>Current Score: {initialScore}</p>
          <p>Fuel Remaining: {Math.floor(initialFuel)}</p>
        </div>
      </div>
    </div>
  );
};

export default BattlezoneGame;
