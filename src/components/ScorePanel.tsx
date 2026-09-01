'use client';

interface ScorePanelProps {
    score?: number;
    coin?: number;
    mistake?: number;
}

export default function ScorePanel({score = 0, coin = 0, mistake = 0}: ScorePanelProps) {
    return (
        <div className="score_container">
            <div className="score_panel">
                <div>
                    <span style={{fontWeight: 700}}>分数:{score}</span>
                </div>
                <div>
                    <span style={{fontWeight: 700}}>金币数:{coin}</span>
                </div>
                <div>
                    <span style={{fontWeight: 700}}>错误次数:{mistake}</span>
                </div>
            </div>
            <style jsx>{`
                .score_container {
                    width: 100vw;
                    height: 100vh;
                    position: relative;
                    z-index: 999;
                }

                .score_panel {
                    height: 100px;
                    width: 300px;
                    position: absolute;
                    right: 0;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    background-color: #333;
                    color: #fff;
                    border-radius: 5px;
                    box-shadow: 0 0 10px rgba(0, 0, 0, 0.3);
                }
            `}</style>
        </div>
    );
}
