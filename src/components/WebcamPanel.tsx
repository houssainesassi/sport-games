'use client';

import {useEffect, useRef, useState} from 'react';
import type Game from '@/Game';
import type {ControlPlayer} from '@/Game/contorlPlayer';
import {PoseInputSystem, type LaneState} from '@/Game/vision';

type UiState =
    | 'requesting-camera'
    | 'camera-denied'
    | 'loading-model'
    | 'waiting-for-person'
    | 'calibrating'
    | 'ready'
    | 'tracking';

export default function WebcamPanel({game}: {game: Game}) {
    const videoContainerRef = useRef<HTMLDivElement>(null);
    const [uiState, setUiState] = useState<UiState>('requesting-camera');
    const [laneIndicator, setLaneIndicator] = useState<LaneState>('CENTER');

    useEffect(() => {
        let controlPlayer: ControlPlayer | null = game.player?.controlPlayer ?? null;
        let wasPlayingBeforeLost = false;
        let readyTimer: ReturnType<typeof setTimeout> | undefined;

        const onControlPlayerReady = (cp: ControlPlayer) => {
            controlPlayer = cp;
        };
        game.player?.on('controlPlayerReady', onControlPlayerReady);

        const poseSystem = new PoseInputSystem();
        if (videoContainerRef.current) {
            poseSystem.videoElement.classList.add('webcam-panel__video-el');
            videoContainerRef.current.appendChild(poseSystem.videoElement);
        }

        poseSystem.on('cameraError', () => setUiState('camera-denied'));
        poseSystem.on('modelLoading', () => setUiState('loading-model'));
        poseSystem.on('modelReady', () => setUiState('waiting-for-person'));
        poseSystem.on('personDetected', () => {
            setUiState(prev => (prev === 'waiting-for-person' ? 'calibrating' : prev));
        });
        poseSystem.on('personLost', () => {
            setUiState('waiting-for-person');
            clearTimeout(readyTimer);
            if (controlPlayer && controlPlayer.gameStart) {
                wasPlayingBeforeLost = true;
                controlPlayer.gameStart = false;
            }
        });
        poseSystem.on('calibrated', () => {
            setUiState('ready');
            clearTimeout(readyTimer);
            readyTimer = setTimeout(() => {
                setUiState('tracking');
                if (!controlPlayer) {
                    return;
                }
                if (wasPlayingBeforeLost) {
                    controlPlayer.gameStart = true;
                    wasPlayingBeforeLost = false;
                }
                else {
                    controlPlayer.triggerStart();
                }
            }, 1200);
        });
        poseSystem.on('lane', (lane: LaneState) => {
            setLaneIndicator(lane);
            controlPlayer?.setLaneTarget(lane === 'LEFT' ? 1 : lane === 'RIGHT' ? 3 : 2);
        });
        poseSystem.on('jump', () => controlPlayer?.triggerJump());
        poseSystem.on('crouch', () => controlPlayer?.triggerCrouch());

        poseSystem.start().catch(() => {
            // 已经通过cameraError事件切换到camera-denied状态
        });

        return () => {
            clearTimeout(readyTimer);
            game.player?.off('controlPlayerReady', onControlPlayerReady);
            poseSystem.dispose();
        };
    }, [game]);

    return (
        <div className="webcam-panel">
            <div
                ref={videoContainerRef}
                className={`webcam-panel__video${uiState === 'camera-denied' ? ' webcam-panel__video--hidden' : ''}`}
            ></div>
            {uiState === 'tracking' && (
                <div className={`webcam-panel__badge webcam-panel__badge--${laneIndicator.toLowerCase()}`}>
                    {laneIndicator}
                </div>
            )}
            {uiState !== 'tracking' && (
                <div className="webcam-panel__status">
                    {uiState === 'requesting-camera' && <span>Requesting camera access…</span>}
                    {uiState === 'camera-denied' && (
                        <span>
                            Camera access denied. Please allow camera access and reload to play with body controls
                            (keyboard P/R still work as fallback).
                        </span>
                    )}
                    {uiState === 'loading-model' && <span>Loading pose detection model…</span>}
                    {uiState === 'waiting-for-person' && <span>Please stand in front of the camera.</span>}
                    {uiState === 'calibrating' && <span>Hold still… calibrating.</span>}
                    {uiState === 'ready' && <span>READY!</span>}
                </div>
            )}
            <style jsx>{`
                .webcam-panel {
                    position: fixed;
                    right: 20px;
                    bottom: 20px;
                    z-index: 500;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 8px;
                    font-family: sans-serif;
                }

                .webcam-panel__video {
                    width: 200px;
                    height: 150px;
                    border-radius: 12px;
                    overflow: hidden;
                    border: 2px solid rgba(255, 255, 255, 0.8);
                    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
                    background: #111;
                }

                .webcam-panel__video--hidden {
                    visibility: hidden;
                }

                .webcam-panel__status {
                    max-width: 220px;
                    text-align: center;
                    color: #fff;
                    background: rgba(0, 0, 0, 0.65);
                    padding: 6px 10px;
                    border-radius: 8px;
                    font-size: 13px;
                    line-height: 1.4;
                }

                .webcam-panel__badge {
                    padding: 4px 14px;
                    border-radius: 20px;
                    color: #fff;
                    font-weight: bold;
                    font-size: 13px;
                    background: rgba(52, 152, 219, 0.85);
                    transition: background-color 0.2s ease;
                }

                .webcam-panel__badge--left,
                .webcam-panel__badge--right {
                    background: rgba(231, 76, 60, 0.85);
                }
            `}</style>
            <style jsx global>{`
                .webcam-panel__video-el {
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                    transform: scaleX(-1);
                }
            `}</style>
        </div>
    );
}
