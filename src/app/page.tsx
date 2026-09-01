'use client';

import dynamic from 'next/dynamic';

// Game/index.ts touches `document` at module scope (Stats.js panel) and the whole
// Game/Player/Environment stack is built around window/canvas/WebGL. ssr:false keeps
// that module graph out of the server render entirely instead of guarding every touch point.
const GameApp = dynamic(() => import('@/components/GameApp'), {ssr: false});

export default function Home() {
    return <GameApp />;
}
