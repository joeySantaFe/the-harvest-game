import React, { useState, useEffect, useCallback } from 'react';
import { AppState, HighScore, ActUnlocks, ActInfo } from './types';
import { ArcadeButton } from './components/ArcadeButton';
import { ActThumbnail } from './components/ActThumbnail';
import { MenuBackground } from './components/MenuBackground';
import { INITIAL_FUEL, FUEL_TO_LIVES_RATIO, MAX_BONUS_LIVES } from './constants';
import { audioService } from './services/audioService';
import LanderGame from './games/LanderGame';
import RipOffGame from './games/RipOffGame';
import BattlezoneGame from './games/BattlezoneGame';

// Act information for menu thumbnails
const ACT_INFO: ActInfo[] = [
  { actNumber: 1, title: 'THE DESCENT', subtitle: 'Lunar Lander', appState: AppState.ACT_1_LANDER },
  { actNumber: 2, title: 'THE HARVEST', subtitle: 'Rip Off Defense', appState: AppState.ACT_2_HARVEST },
  { actNumber: 3, title: 'THE BATTLE', subtitle: 'Tank Combat', appState: AppState.ACT_3_BATTLE },
];

// Shared Global UI wrapper
const Overlay = ({ children, transparent = false }: { children: React.ReactNode; transparent?: boolean }) => (
    <div className={`absolute top-0 left-0 w-full h-full flex flex-col justify-center items-center z-50 ${
        transparent ? 'bg-black/40' : 'bg-black/85 backdrop-blur-sm'
    }`}>
        {children}
    </div>
);

const App: React.FC = () => {
    const [appState, setAppState] = useState<AppState>(AppState.MENU);
    
    // Campaign State
    const [campaignFuel, setCampaignFuel] = useState(INITIAL_FUEL);
    const [campaignScore, setCampaignScore] = useState(0);
    const [campaignHull, setCampaignHull] = useState(100);
    
    // Meta State
    const [highScores, setHighScores] = useState<HighScore[]>([]);
    const [nameInput, setNameInput] = useState('');

    // Act unlock persistence
    const [actUnlocks, setActUnlocks] = useState<ActUnlocks>({
        act2Unlocked: false,
        act3Unlocked: false,
    });

    // Debug mode - Option key held
    const [debugMode, setDebugMode] = useState(false);

    useEffect(() => {
        const saved = localStorage.getItem('lunarCommandScores');
        if (saved) setHighScores(JSON.parse(saved));

        // Load act unlocks
        const savedUnlocks = localStorage.getItem('theHarvestUnlocks');
        if (savedUnlocks) {
            setActUnlocks(JSON.parse(savedUnlocks));
        }
    }, []);

    // Listen for Option key to enable debug mode, Option+R to reset progress
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setDebugMode(true);
            }
            // Option+R to reset act unlocks (debug feature)
            if (e.altKey && e.key === 'r') {
                localStorage.removeItem('theHarvestUnlocks');
                setActUnlocks({ act2Unlocked: false, act3Unlocked: false });
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.key === 'Alt') {
                setDebugMode(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, []);

    // Helper to unlock an act and persist to localStorage
    const unlockAct = (act: 2 | 3) => {
        setActUnlocks(prev => {
            const updated = {
                ...prev,
                [`act${act}Unlocked`]: true,
            };
            localStorage.setItem('theHarvestUnlocks', JSON.stringify(updated));
            return updated as ActUnlocks;
        });
    };

    // Check if an act is unlocked (or debug mode is active)
    const isActUnlocked = (actNumber: 1 | 2 | 3): boolean => {
        if (debugMode) return true; // All acts appear unlocked in debug mode
        if (actNumber === 1) return true;
        if (actNumber === 2) return actUnlocks.act2Unlocked;
        if (actNumber === 3) return actUnlocks.act3Unlocked;
        return false;
    };

    // Handle thumbnail click - unlocked acts can be clicked, Option key allows debug jump to any act
    const handleActClick = (act: ActInfo, event: React.MouseEvent) => {
        const unlocked = isActUnlocked(act.actNumber);

        // Map act number to music track
        const actTrack = { 1: 'act1', 2: 'act2', 3: 'act3' } as const;

        // Option/Alt key = debug mode, can jump to any act
        if (event.altKey) {
            setCampaignFuel(INITIAL_FUEL);
            setCampaignScore(0);
            setCampaignHull(100);
            audioService.playMusic(actTrack[act.actNumber]);
            setAppState(act.appState);
            return;
        }

        // Normal click - only works on unlocked acts
        if (!unlocked) return;

        // Start the selected act directly
        setCampaignFuel(INITIAL_FUEL);
        setCampaignScore(0);
        setCampaignHull(100);
        audioService.playMusic(actTrack[act.actNumber]);
        setAppState(act.appState);
    };

    // Music control based on game state
    useEffect(() => {
        const menuStates = [
            AppState.MENU,
            AppState.NARRATIVE,
            AppState.HELP,
            AppState.HIGHSCORES,
            AppState.GAME_OVER,
            AppState.VICTORY,
        ];

        const stateToTrack: Partial<Record<AppState, 'act1' | 'act2' | 'act3'>> = {
            [AppState.ACT_1_LANDER]: 'act1',
            [AppState.ACT_2_HARVEST]: 'act2',
            [AppState.ACT_3_BATTLE]: 'act3',
        };

        if (menuStates.includes(appState)) {
            audioService.playMusic('menu');
        } else if (stateToTrack[appState]) {
            audioService.playMusic(stateToTrack[appState]!);
        }
    }, [appState]);

    // Also trigger music on any keypress (not just mouse click)
    useEffect(() => {
        const onKey = () => {
            audioService.tryStartMusic();
            if (audioService.isMusicPlaying()) {
                window.removeEventListener('keydown', onKey);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, []);

    const startCampaign = () => {
        setCampaignFuel(INITIAL_FUEL);
        setCampaignScore(0);
        setCampaignHull(100);
        setAppState(AppState.NARRATIVE);
    };

    const handleAct1Complete = (results: { fuelRemaining: number, scoreGained: number, hullIntegrity: number }) => {
        setCampaignFuel(results.fuelRemaining);
        setCampaignScore(prev => prev + results.scoreGained);
        setCampaignHull(results.hullIntegrity);

        // Unlock Act 2
        unlockAct(2);

        // Transition to Act II narrative
        setAppState(AppState.NARRATIVE);
    };

    const handleAct2Complete = (results: { fuelRemaining: number, scoreGained: number, hullIntegrity: number }) => {
        setCampaignFuel(results.fuelRemaining);
        setCampaignScore(prev => prev + results.scoreGained);
        setCampaignHull(results.hullIntegrity);

        // Unlock Act 3
        unlockAct(3);

        // Transition to Act III (Battlezone)
        setAppState(AppState.ACT_3_BATTLE);
    };

    // Debug: Jump to specific act
    const handleJumpToAct = (act: 1 | 2 | 3) => {
        switch (act) {
            case 1:
                setCampaignFuel(INITIAL_FUEL);
                setCampaignScore(0);
                setCampaignHull(100);
                setAppState(AppState.ACT_1_LANDER);
                break;
            case 2:
                // Keep current fuel/score or set defaults
                if (campaignFuel <= 0) setCampaignFuel(INITIAL_FUEL);
                setAppState(AppState.ACT_2_HARVEST);
                break;
            case 3:
                setAppState(AppState.ACT_3_BATTLE);
                break;
        }
    };

    const handleGameOver = (finalScore: number) => {
        setCampaignScore(finalScore);
        const isHigh = highScores.length < 10 || finalScore > highScores[highScores.length - 1].score;
        setAppState(isHigh ? AppState.GAME_OVER : AppState.MENU); 
    };

    const submitHighScore = () => {
        const newEntry = { name: (nameInput || 'AAA').toUpperCase(), score: campaignScore, actReached: 1 };
        const newScores = [...highScores, newEntry].sort((a, b) => b.score - a.score).slice(0, 10);
        setHighScores(newScores);
        localStorage.setItem('lunarCommandScores', JSON.stringify(newScores));
        setAppState(AppState.HIGHSCORES);
    };

    // --- State Machine Renders ---

    if (appState === AppState.ACT_1_LANDER) {
        return (
            <LanderGame
                initialFuel={campaignFuel}
                initialScore={campaignScore}
                onComplete={handleAct1Complete}
                onFailure={handleGameOver}
                onJumpToAct={handleJumpToAct}
            />
        );
    }

    if (appState === AppState.ACT_2_HARVEST) {
        return (
            <RipOffGame
                initialFuel={campaignFuel}
                initialScore={campaignScore}
                playerCount={1}
                onComplete={handleAct2Complete}
                onFailure={handleGameOver}
                onJumpToAct={handleJumpToAct}
            />
        );
    }

    if (appState === AppState.ACT_3_BATTLE) {
        return (
            <BattlezoneGame
                initialFuel={campaignFuel}
                initialScore={campaignScore}
                onComplete={(results) => {
                    setCampaignScore(prev => prev + results.scoreGained);
                    setAppState(AppState.VICTORY);
                }}
                onFailure={handleGameOver}
                onJumpToAct={handleJumpToAct}
            />
        );
    }

    // Handle user interaction to start/resume music (browser autoplay policy)
    const handleUserInteraction = () => {
        audioService.tryStartMusic();
    };

    return (
        <div
            className="relative w-screen h-screen bg-black overflow-hidden font-mono text-[#ccc]"
            onClick={handleUserInteraction}
        >
            {/* Background animation for menu screens */}
            {appState === AppState.MENU && <MenuBackground />}

            <Overlay transparent={appState === AppState.MENU}>
                {appState === AppState.MENU && (
                    <>
                        <h1 className="text-[50px] md:text-[80px] text-[#0f0] tracking-[8px] uppercase font-bold text-shadow-glow mb-2 text-center leading-none">
                            THE<br/>HARVEST
                        </h1>
                        <div className="text-[#fd0] text-xl mb-6 animate-glow-gold">HIGH SCORE: {highScores[0]?.score || 0}</div>

                        {/* Act Thumbnails */}
                        <div className="flex gap-4 mb-8 flex-wrap justify-center">
                            {ACT_INFO.map(act => (
                                <ActThumbnail
                                    key={act.actNumber}
                                    act={act}
                                    isUnlocked={isActUnlocked(act.actNumber)}
                                    onClick={(e: React.MouseEvent) => handleActClick(act, e)}
                                />
                            ))}
                        </div>

                        <div className="flex gap-4 flex-wrap justify-center">
                            <ArcadeButton variant="secondary" onClick={() => setAppState(AppState.HELP)}>CONTROLS</ArcadeButton>
                            <ArcadeButton variant="secondary" onClick={() => setAppState(AppState.HIGHSCORES)}>RECORDS</ArcadeButton>
                        </div>

                        {/* Debug: Reset Progress (only show if there's saved progress) */}
                        {(actUnlocks.act2Unlocked || actUnlocks.act3Unlocked) && (
                            <div className="mt-6 text-center">
                                <button
                                    onClick={() => {
                                        localStorage.removeItem('theHarvestUnlocks');
                                        setActUnlocks({ act2Unlocked: false, act3Unlocked: false });
                                            }}
                                    className="text-[#666] text-xs hover:text-[#f04] transition-colors underline"
                                >
                                    Reset Act Progress
                                </button>
                            </div>
                        )}
                    </>
                )}

                {appState === AppState.NARRATIVE && (
                    <>
                        {/* Act I Intro */}
                        {campaignScore === 0 && (
                            <div className="max-w-3xl text-center">
                                <h2 className="text-4xl text-[#0af] mb-8 tracking-[0.5em] animate-pulse">ACT I</h2>
                                <p className="text-xl mb-8 leading-relaxed">
                                    The colony ships have arrived in orbit.<br/><br/>
                                    Your mission is to descend to the surface, locate the ancient fuel depots, and establish a forward command base.<br/><br/>
                                    Fuel is scarce. Conserve it. It must last us through the harvest season.
                                </p>
                                <ArcadeButton onClick={() => { audioService.playMusic('act1'); setAppState(AppState.ACT_1_LANDER); }}>INITIATE DESCENT</ArcadeButton>
                            </div>
                        )}

                        {/* Act II Intro */}
                        {campaignScore > 0 && (
                            <div className="max-w-3xl text-center">
                                <h2 className="text-4xl text-[#0af] mb-8 tracking-[0.5em] animate-pulse">ACT II</h2>
                                <p className="text-xl mb-8 leading-relaxed">
                                    Base secured. Fuel remaining: {Math.floor(campaignFuel)}<br/><br/>
                                    <span className="text-[#f00]">⚠ ALERT: Movement detected on surface.</span><br/><br/>
                                    Autonomous collection units emerging from subsurface structures.<br/>
                                    They are moving toward our fuel reserves.<br/><br/>
                                    <span className="text-[#0f0]">ALL HANDS: DEFENSIVE POSITIONS</span>
                                </p>
                                <ArcadeButton onClick={() => { audioService.playMusic('act2'); setAppState(AppState.ACT_2_HARVEST); }}>DEFEND THE HARVEST</ArcadeButton>
                            </div>
                        )}
                    </>
                )}

                {appState === AppState.VICTORY && (
                    <div className="max-w-3xl text-center">
                         <h2 className="text-4xl text-[#0f0] mb-8 tracking-[0.5em]">MISSION COMPLETE</h2>
                         <p className="text-xl mb-8 leading-relaxed">
                            The harvest has been defended.<br/>
                            The mechanical swarm has been neutralized.<br/><br/>
                            Fuel Secured: {Math.floor(campaignFuel)}<br/>
                            Final Score: {campaignScore}<br/><br/>
                            <span className="text-[#0af]">The colony survives another day.</span>
                         </p>
                         <ArcadeButton onClick={() => setAppState(AppState.MENU)}>RETURN TO MENU</ArcadeButton>
                    </div>
                )}

                {appState === AppState.GAME_OVER && (
                    <div className="flex flex-col items-center">
                        <h2 className="text-[#fd0] text-4xl mb-4 animate-glow-gold">NEW RECORD</h2>
                        <p className="text-white text-2xl mb-8">SCORE: {campaignScore}</p>
                        <input 
                            autoFocus maxLength={3} value={nameInput} onChange={(e) => setNameInput(e.target.value)}
                            className="bg-[#111] border-2 border-[#fd0] text-[#fd0] text-4xl p-4 text-center w-40 outline-none uppercase tracking-[8px] mb-8 focus:shadow-[0_0_20px_rgba(255,221,0,0.5)]"
                            onKeyDown={(e) => e.key === 'Enter' && submitHighScore()}
                        />
                        <ArcadeButton onClick={submitHighScore}>LOG ENTRY</ArcadeButton>
                    </div>
                )}

                {appState === AppState.HIGHSCORES && (
                   <div className="bg-black/90 p-8 min-w-[600px] border border-[#333]">
                       <h2 className="text-[#fd0] text-4xl mb-6 text-center border-b border-[#fd0] pb-4">FLIGHT RECORDS</h2>
                       <table className="w-full text-left border-collapse mb-8">
                           <thead>
                               <tr>
                                   <th className="text-[#0af] py-2 border-b border-[#0af]">#</th>
                                   <th className="text-[#0f0] py-2 border-b border-[#0af]">PILOT</th>
                                   <th className="text-white text-right py-2 border-b border-[#0af]">SCORE</th>
                               </tr>
                           </thead>
                           <tbody>
                               {highScores.map((h, i) => (
                                   <tr key={i} className="text-[#ccc]">
                                       <td className="py-2 border-b border-[#333] w-12">{i + 1}</td>
                                       <td className="py-2 border-b border-[#333] font-bold">{h.name}</td>
                                       <td className="py-2 border-b border-[#333] text-right font-mono">{h.score}</td>
                                   </tr>
                               ))}
                           </tbody>
                       </table>
                       <div className="text-center">
                           <ArcadeButton variant="secondary" onClick={() => setAppState(AppState.MENU)}>BACK</ArcadeButton>
                       </div>
                   </div>
                )}
                
                {appState === AppState.HELP && (
                    <div className="max-w-3xl w-full p-8 relative">
                         <h2 className="text-4xl text-white mb-6 text-shadow-glow border-b border-[#0af] pb-2 text-[#0af]">CONTROLS</h2>
                         <div className="text-[#ccc] font-mono leading-relaxed text-sm">

                            <div className="mb-6">
                                <p className="text-[#0f0] font-bold mb-3">ACT I: THE DESCENT</p>
                                <table className="w-full text-left mb-2">
                                    <tbody>
                                        <tr><td className="text-[#0af] pr-4 py-1 w-36">THRUST</td><td>W / Space / Up Arrow / Left Click</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">ROTATE LEFT</td><td>A / Left Arrow</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">ROTATE RIGHT</td><td>D / Right Arrow</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">PAUSE</td><td>Escape</td></tr>
                                    </tbody>
                                </table>
                            </div>

                            <div className="mb-6">
                                <p className="text-[#fa0] font-bold mb-3">ACT II: THE HARVEST</p>
                                <table className="w-full text-left mb-2">
                                    <tbody>
                                        <tr><td className="text-[#0af] pr-4 py-1 w-36">FORWARD</td><td>W</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">REVERSE</td><td>S</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">ROTATE LEFT</td><td>A</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">ROTATE RIGHT</td><td>D</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">FIRE</td><td>Space / Left Click</td></tr>
                                        <tr><td className="text-[#0af] pr-4 py-1">PAUSE</td><td>Escape</td></tr>
                                    </tbody>
                                </table>
                                <p className="text-[#666] text-xs mt-2">Player 2: Arrow Keys + Numpad 0 (fire) &middot; Gamepad supported</p>
                            </div>

                            <div className="mb-6 border-t border-[#333] pt-4">
                                <p className="text-[#f00]">All acts share FUEL. Conserve it in Act I for bonus lives in Act II.</p>
                            </div>

                         </div>
                         <div className="mt-4 text-center">
                             <ArcadeButton variant="secondary" onClick={() => setAppState(AppState.MENU)}>BACK</ArcadeButton>
                         </div>
                    </div>
                )}
            </Overlay>
        </div>
    );
};

export default App;