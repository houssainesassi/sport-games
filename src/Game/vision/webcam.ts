import {EventEmitter} from 'events';

// 摄像头模块：负责申请权限、创建video元素、管理媒体流的生命周期
export class Webcam extends EventEmitter {
    video: HTMLVideoElement;
    stream: MediaStream | null = null;

    constructor() {
        super();
        this.video = document.createElement('video');
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;
    }

    async start(): Promise<HTMLVideoElement> {
        if (!navigator.mediaDevices?.getUserMedia) {
            const error = new Error('getUserMedia is not supported in this browser');
            this.emit('error', error);
            throw error;
        }
        try {
            this.stream = await navigator.mediaDevices.getUserMedia({
                video: {width: 480, height: 360, facingMode: 'user'},
                audio: false,
            });
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
        this.video.srcObject = this.stream;
        await new Promise<void>(resolve => {
            this.video.onloadedmetadata = () => {
                this.video.play().catch(() => {});
                resolve();
            };
        });
        this.emit('started');
        return this.video;
    }

    stop() {
        this.stream?.getTracks().forEach(track => track.stop());
        this.stream = null;
        this.video.srcObject = null;
    }
}
