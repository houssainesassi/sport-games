import {EventEmitter} from 'events';
import {FilesetResolver, PoseLandmarker, type PoseLandmarkerResult} from '@mediapipe/tasks-vision';

const WASM_BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL =
    'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task';
// 检测帧率上限，避免姿态推理拖慢主渲染循环的帧率
const MAX_FPS = 24;

// 姿态检测模块：加载MediaPipe Pose Landmarker，并在独立的rAF循环中对视频帧做推理
export class PoseDetector extends EventEmitter {
    private landmarker: PoseLandmarker | null = null;
    private video: HTMLVideoElement | null = null;
    private rafId: number | null = null;
    private lastVideoTime = -1;
    private lastDetectAt = 0;
    private readonly minIntervalMs = 1000 / MAX_FPS;
    private running = false;

    async init() {
        const vision = await FilesetResolver.forVisionTasks(WASM_BASE);
        try {
            this.landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {modelAssetPath: MODEL_URL, delegate: 'GPU'},
                runningMode: 'VIDEO',
                numPoses: 1,
            });
        }
        catch (error) {
            // 部分设备/浏览器不支持GPU delegate，回退到CPU
            this.landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {modelAssetPath: MODEL_URL, delegate: 'CPU'},
                runningMode: 'VIDEO',
                numPoses: 1,
            });
        }
    }

    start(video: HTMLVideoElement) {
        this.video = video;
        this.running = true;
        this.loop();
    }

    stop() {
        this.running = false;
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
    }

    dispose() {
        this.stop();
        this.landmarker?.close();
        this.landmarker = null;
    }

    private loop = () => {
        if (!this.running) {
            return;
        }
        this.rafId = requestAnimationFrame(this.loop);
        const video = this.video;
        const landmarker = this.landmarker;
        if (!video || !landmarker || video.readyState < 2) {
            return;
        }
        const now = performance.now();
        if (now - this.lastDetectAt < this.minIntervalMs) {
            return;
        }
        if (video.currentTime === this.lastVideoTime) {
            return;
        }
        this.lastVideoTime = video.currentTime;
        this.lastDetectAt = now;
        try {
            const result: PoseLandmarkerResult = landmarker.detectForVideo(video, now);
            this.emit('result', result);
        }
        catch (error) {
            console.error('Pose detection error', error);
        }
    };
}
