'use client';

interface GameGuideProps {
    showMask: boolean;
    gameStatus: string;
}

interface GuideText {
    key: string;
    text: string;
}

const keyMap: Record<string, GuideText> = {
    ready: {
        key: '',
        text: '请站到摄像头前，身体将自动开始游戏（或按 P 键作为备用方式）',
    },
    end: {
        key: 'R',
        text: '重新开始游戏',
    },
};

export default function GameGuide({showMask, gameStatus}: GameGuideProps) {
    const textCompute = keyMap[gameStatus];
    if (!showMask || !textCompute) {
        return null;
    }
    return (
        <div className="game-mask">
            <div className="message">
                {textCompute.key ? (
                    <>
                        请按下<span className="key">{textCompute.key}</span>
                        {textCompute.text}
                    </>
                ) : (
                    textCompute.text
                )}
            </div>
            <style jsx>{`
                .game-mask {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.6);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 999;
                }

                .message {
                    font-size: 24px;
                    color: white;
                    text-align: center;
                }

                .key {
                    background-color: #3498db;
                    color: white;
                    padding: 5px 10px;
                    border-radius: 5px;
                }
            `}</style>
        </div>
    );
}
