/** @type {import('next').NextConfig} */
const nextConfig = {
    // Game/Player/Environment/ControlPlayer use `static instance` singletons that
    // are only reset by a full page reload, not by React's dev-only double
    // mount/unmount cycle. Strict mode's intentional double-invoke of effects
    // would call `new Game()` -> get back the already-disposed instance from the
    // first (immediately unmounted) pass. Disabling it keeps the existing Three.js
    // architecture untouched instead of reworking it around React's lifecycle.
    reactStrictMode: false,
    agentRules: false,
};

export default nextConfig;
