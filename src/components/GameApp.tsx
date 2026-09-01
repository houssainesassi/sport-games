'use client';

import {useEffect, useRef, useState} from 'react';
import ScorePanel from './ScorePanel';
import GameGuide from './GameGuide';
import WebcamPanel from './WebcamPanel';
import Game from '@/Game';

interface LoadingData {
    type?: string;
    url?: string;
    itemsLoaded?: number;
    itemsTotal?: number;
}

export default function GameApp() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const gameRef = useRef<Game | undefined>(undefined);
    const [game, setGame] = useState<Game>();
    const [isReady, setIsReady] = useState(false);
    const [score, setScore] = useState(0);
    const [coin, setCoin] = useState(0);
    const [mistake, setMistake] = useState(0);
    const [gameStatus, setGameStatus] = useState('ready');
    const [loadingData, setLoadingData] = useState<LoadingData>({});

    useEffect(() => {
        if (!canvasRef.current) {
            return;
        }
        const gameInstance = new Game(canvasRef.current);
        gameRef.current = gameInstance;
        setGame(gameInstance);

        gameInstance.on('progress', (data: any) => {
            const {type} = data;
            if (type === 'successLoad') {
                setLoadingData(prev => ({...prev, type: 'successLoad'}));
                setIsReady(true);
            }
            else {
                setLoadingData(data);
            }
        });
        gameInstance.on('gameStatus', (data: any) => {
            setGameStatus(data);
        });
        gameInstance.on('gameData', (data: any) => {
            setScore(data.score);
            setCoin(data.coin);
            setMistake(data.mistake);
        });

        return () => {
            gameRef.current?.disposeGame();
        };
    }, []);

    const showGuide = gameStatus !== 'start';

    return (
        <div>
            {!isReady && (
                <div className="loading">
                    <div className="loading-anima aaa">
                        <div></div>
                        <div></div>
                        <div></div>
                    </div>
                    <div>正在加载资源：{loadingData.url}</div>
                    <div>
                        已加载{loadingData.itemsLoaded || 0}/{loadingData.itemsTotal || 0}
                    </div>
                    {loadingData.type === 'successLoad' && <div>加载成功， 稍等片刻</div>}
                </div>
            )}
            <GameGuide showMask={isReady && showGuide} gameStatus={gameStatus} />
            <ScorePanel score={score} coin={coin} mistake={mistake} />
            <div className="experience">
                <canvas ref={canvasRef} className="experience__canvas"></canvas>
            </div>
            {isReady && game && <WebcamPanel game={game} />}
            <style jsx>{`
                .loading {
                    position: fixed;
                    height: 100vh;
                    width: 100vw;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    z-index: 999;
                    background-color: #fff;
                }

                .loading-anima,
                .loading-anima > div {
                    position: relative;
                    box-sizing: border-box;
                }

                .aaa {
                    display: block;
                    font-size: 0;
                    color: white;
                }

                .loading-anima {
                    width: 54px;
                    height: 18px;
                }

                .loading-anima > div {
                    display: inline-block;
                    float: none;
                    background-color: black;
                    border: 0 solid black;
                }

                .aaa > div {
                    width: 10px;
                    height: 10px;
                    margin: 4px;
                    border-radius: 100%;
                    animation: ball-pulse-sync 0.6s infinite ease-in-out;
                }

                .loading-anima > div:nth-child(1) {
                    animation-delay: -0.14s;
                }

                .loading-anima > div:nth-child(2) {
                    animation-delay: -0.07s;
                }

                .loading-anima > div:nth-child(3) {
                    animation-delay: 0s;
                }

                @keyframes ball-pulse-sync {
                    33% {
                        transform: translateY(100%);
                    }

                    66% {
                        transform: translateY(-100%);
                    }

                    100% {
                        transform: translateY(0);
                    }
                }

                .experience {
                    position: fixed;
                    height: 100vh;
                    width: 100vw;
                }

                .experience__canvas {
                    height: 100%;
                    width: 100%;
                }

                canvas {
                    width: 100vw;
                    height: 100vh;
                    position: fixed;
                    left: 0;
                    top: 0;
                }
            `}</style>
        </div>
    );
}
