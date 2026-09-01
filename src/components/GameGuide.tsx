'use client';

interface GameGuideProps {
    showMask: boolean;
    gameStatus: string;
    onPlayAgain: () => void;
}

export default function GameGuide({showMask, gameStatus, onPlayAgain}: GameGuideProps) {
    if (!showMask || gameStatus !== 'end') {
        return null;
    }
    return (
        <div className="game-over">
            <div className="card">
                <div className="title">Game Over</div>
                <button className="play-again" onClick={onPlayAgain}>
                    Play Again
                </button>
            </div>
            <style jsx>{`
                .game-over {
                    position: fixed;
                    inset: 0;
                    background: rgba(15, 15, 20, 0.72);
                    backdrop-filter: blur(4px);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999;
                }

                .card {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 20px;
                    padding: 40px 56px;
                    background: rgba(30, 32, 40, 0.92);
                    border: 1px solid rgba(255, 255, 255, 0.12);
                    border-radius: 16px;
                    box-shadow: 0 12px 40px rgba(0, 0, 0, 0.45);
                }

                .title {
                    font-size: 32px;
                    font-weight: 700;
                    color: #fff;
                    letter-spacing: 0.02em;
                }

                .play-again {
                    padding: 12px 32px;
                    font-size: 16px;
                    font-weight: 600;
                    color: #fff;
                    background: #3498db;
                    border: none;
                    border-radius: 999px;
                    cursor: pointer;
                    transition: background-color 0.15s ease, transform 0.1s ease;
                }

                .play-again:hover {
                    background: #2f86c2;
                }

                .play-again:active {
                    transform: scale(0.97);
                }
            `}</style>
        </div>
    );
}
