// 轻量提示条：ControlPlayer是纯TS类而非React组件，这里用原生DOM实现，
// 避免在游戏逻辑里挂载/卸载React树。样式与原来的Toast组件保持一致。
let toastEl: HTMLDivElement | null = null;
let hideTimer: ReturnType<typeof setTimeout> | null = null;

const ensureToastEl = () => {
    if (toastEl) {
        return toastEl;
    }
    const el = document.createElement('div');
    el.style.cssText = `
        position: fixed;
        top: 200px;
        left: 50%;
        transform: translateX(-50%);
        padding: 4px 8px;
        background-color: rgba(0, 0, 0, .8);
        font-size: 24px;
        border-radius: 4px;
        color: white;
        z-index: 9999;
        display: none;
    `;
    document.body.appendChild(el);
    toastEl = el;
    return el;
};

const showToast = (msg: string, options: {duration?: number} = {}) => {
    if (typeof document === 'undefined') {
        return;
    }
    const {duration = 1500} = options;
    const el = ensureToastEl();
    el.textContent = msg;
    el.style.display = 'block';
    if (hideTimer) {
        clearTimeout(hideTimer);
    }
    hideTimer = setTimeout(() => {
        el.style.display = 'none';
    }, duration);
};

export default showToast;
