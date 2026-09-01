import {EventEmitter} from 'events';
import type {NormalizedLandmark, PoseLandmarkerResult} from '@mediapipe/tasks-vision';

export type LaneState = 'LEFT' | 'CENTER' | 'RIGHT';

const LANDMARK = {
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
};

interface Point {
    x: number;
    y: number;
}

// 姿态控制模块：把关键点转换为稳定的移动状态(LEFT/CENTER/RIGHT/JUMP/CROUCH)
// 使用平滑滤波 + 校准基线 + 滞回阈值 + 冷却时间，避免噪声导致的抖动或连续误触发
export class PoseController extends EventEmitter {
    // 平滑后的身体中心点
    private smoothedX: number | null = null;
    private smoothedY: number | null = null;
    private readonly smoothingAlpha = 0.35;

    // 校准基线（用户站定后采集的中心位置，作为CENTER的参照系）
    private baselineX: number | null = null;
    private baselineY: number | null = null;
    private baselineScale: number | null = null;
    private calibrationSamples: Point[] = [];
    private readonly calibrationFrameCount = 20;
    calibrated = false;

    // 左右车道状态机（进入/退出使用不同阈值，防止在临界点反复横跳）
    laneState: LaneState = 'CENTER';
    private readonly laneEnterThreshold = 0.32;
    private readonly laneExitThreshold = 0.14;
    private lastLaneChangeAt = 0;
    private readonly laneCooldownMs = 450;

    // 跳跃/下蹲：瞬时动作，需要冷却时间与“已在该姿态”标记，防止逐帧重复触发
    private readonly jumpThreshold = 0.3;
    private readonly crouchThreshold = 0.28;
    private inJumpPose = false;
    private inCrouchPose = false;
    private lastJumpAt = 0;
    private lastCrouchAt = 0;
    private readonly actionCooldownMs = 700;

    // 置信度与人物存在检测
    private readonly visibilityThreshold = 0.5;
    personPresent = false;
    private missingFrameCount = 0;
    private readonly missingFrameLimit = 8;

    processResult(result: PoseLandmarkerResult) {
        const landmarks = result.landmarks?.[0];
        const ls = landmarks?.[LANDMARK.LEFT_SHOULDER];
        const rs = landmarks?.[LANDMARK.RIGHT_SHOULDER];
        if (!landmarks || !ls || !rs || !this.isVisible(ls) || !this.isVisible(rs)) {
            this.handleNoPerson();
            return;
        }
        this.missingFrameCount = 0;
        if (!this.personPresent) {
            this.personPresent = true;
            this.emit('personDetected');
        }

        // 坐标映射说明（LEFT/RIGHT车道方向的唯一来源，出问题只需改这一行）：
        // MediaPipe用的是摄像头原始画面（未镜像）坐标：x=0是画面左边，x=1是画面右边。
        // 人和摄像头面对面，人物身体整体往自己的右边移动时，在原始画面里是往左边移动的
        // （landmark x变小），所以这里用 `1 - x` 翻转一次，使得"身体往自己右边移动"
        // 对应 rawX 变大 -> normalizedX为正 -> LaneState.RIGHT，与游戏画面里角色向右对应。
        // 如果实际测试中发现方向相反（部分浏览器/摄像头驱动会预先镜像画面），
        // 把 `1 - (ls.x + rs.x) / 2` 改成 `(ls.x + rs.x) / 2` 即可反转左右映射。
        const rawX = 1 - (ls.x + rs.x) / 2;
        const rawY = (ls.y + rs.y) / 2;
        const shoulderWidth = Math.max(Math.abs(ls.x - rs.x), 0.05);

        const lh = landmarks[LANDMARK.LEFT_HIP];
        const rh = landmarks[LANDMARK.RIGHT_HIP];
        const torsoHeight =
            lh && rh && this.isVisible(lh) && this.isVisible(rh)
                ? Math.max(Math.abs((lh.y + rh.y) / 2 - rawY), 0.05)
                : shoulderWidth * 1.2;

        this.smoothedX = this.smoothedX === null ? rawX : this.smoothedX + (rawX - this.smoothedX) * this.smoothingAlpha;
        this.smoothedY = this.smoothedY === null ? rawY : this.smoothedY + (rawY - this.smoothedY) * this.smoothingAlpha;

        if (!this.calibrated) {
            this.runCalibration(this.smoothedX, this.smoothedY, shoulderWidth);
            return;
        }

        const normalizedX = (this.smoothedX - (this.baselineX as number)) / (this.baselineScale || shoulderWidth);
        const normalizedY = (this.smoothedY - (this.baselineY as number)) / torsoHeight;

        this.updateLaneState(normalizedX);
        this.updateVerticalActions(normalizedY);
    }

    // 允许用户重新校准中心位置（例如站位发生变化时）
    recalibrate() {
        this.calibrated = false;
        this.calibrationSamples = [];
    }

    private isVisible(landmark: NormalizedLandmark) {
        return (landmark.visibility ?? 1) >= this.visibilityThreshold;
    }

    private runCalibration(x: number, y: number, scale: number) {
        this.calibrationSamples.push({x, y});
        if (this.calibrationSamples.length < this.calibrationFrameCount) {
            return;
        }
        const n = this.calibrationSamples.length;
        this.baselineX = this.calibrationSamples.reduce((sum, p) => sum + p.x, 0) / n;
        this.baselineY = this.calibrationSamples.reduce((sum, p) => sum + p.y, 0) / n;
        this.baselineScale = scale;
        this.calibrated = true;
        this.calibrationSamples = [];
        this.laneState = 'CENTER';
        this.emit('calibrated');
    }

    private updateLaneState(normalizedX: number) {
        const now = performance.now();
        let target: LaneState = this.laneState;
        if (this.laneState === 'CENTER') {
            if (normalizedX < -this.laneEnterThreshold) {
                target = 'LEFT';
            }
            else if (normalizedX > this.laneEnterThreshold) {
                target = 'RIGHT';
            }
        }
        else if (Math.abs(normalizedX) < this.laneExitThreshold) {
            target = 'CENTER';
        }
        else if (this.laneState === 'LEFT' && normalizedX > this.laneEnterThreshold) {
            target = 'RIGHT';
        }
        else if (this.laneState === 'RIGHT' && normalizedX < -this.laneEnterThreshold) {
            target = 'LEFT';
        }
        if (target !== this.laneState && now - this.lastLaneChangeAt > this.laneCooldownMs) {
            this.laneState = target;
            this.lastLaneChangeAt = now;
            this.emit('lane', target);
        }
    }

    private updateVerticalActions(normalizedY: number) {
        const now = performance.now();
        // 肩部相对基线上移（数值变小）视为跳跃
        if (normalizedY < -this.jumpThreshold) {
            if (!this.inJumpPose && now - this.lastJumpAt > this.actionCooldownMs) {
                this.inJumpPose = true;
                this.lastJumpAt = now;
                this.emit('jump');
            }
        }
        else {
            this.inJumpPose = false;
        }
        // 肩部相对基线下移（数值变大）视为下蹲
        if (normalizedY > this.crouchThreshold) {
            if (!this.inCrouchPose && now - this.lastCrouchAt > this.actionCooldownMs) {
                this.inCrouchPose = true;
                this.lastCrouchAt = now;
                this.emit('crouch');
            }
        }
        else {
            this.inCrouchPose = false;
        }
    }

    private handleNoPerson() {
        this.missingFrameCount += 1;
        if (this.personPresent && this.missingFrameCount > this.missingFrameLimit) {
            this.personPresent = false;
            this.calibrated = false;
            this.calibrationSamples = [];
            this.smoothedX = null;
            this.smoothedY = null;
            this.laneState = 'CENTER';
            this.emit('personLost');
        }
    }
}
