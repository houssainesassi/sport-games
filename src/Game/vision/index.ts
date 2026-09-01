import {EventEmitter} from 'events';
import {Webcam} from './webcam';
import {PoseDetector} from './poseDetector';
import {PoseController, type LaneState} from './poseController';

export type {LaneState};

// 汇总摄像头 + 姿态检测 + 姿态状态机三个模块，对外只暴露简单事件：
// cameraError / modelLoading / modelReady / personDetected / personLost / calibrated / lane / jump / crouch
export class PoseInputSystem extends EventEmitter {
    webcam = new Webcam();
    detector = new PoseDetector();
    controller = new PoseController();
    private started = false;

    get videoElement() {
        return this.webcam.video;
    }

    async start(): Promise<HTMLVideoElement> {
        this.emit('modelLoading');
        let video: HTMLVideoElement;
        try {
            [video] = await Promise.all([this.webcam.start(), this.detector.init()]);
        }
        catch (error) {
            this.emit('cameraError', error);
            throw error;
        }
        this.emit('modelReady');

        this.detector.on('result', result => this.controller.processResult(result));
        this.controller.on('lane', (lane: LaneState) => this.emit('lane', lane));
        this.controller.on('jump', () => this.emit('jump'));
        this.controller.on('crouch', () => this.emit('crouch'));
        this.controller.on('personDetected', () => this.emit('personDetected'));
        this.controller.on('personLost', () => this.emit('personLost'));
        this.controller.on('calibrated', () => this.emit('calibrated'));

        this.detector.start(video);
        this.started = true;
        return video;
    }

    dispose() {
        if (!this.started) {
            return;
        }
        this.detector.dispose();
        this.webcam.stop();
        this.started = false;
    }
}
