import type { Config } from 'tailwindcss';
const config: Config = { content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'], theme: { extend: { colors: { navy: { DEFAULT: '#071D2D', secondary: '#0B2A42' }, aqua: '#4CC9D8', recovery: { green: '#16A36A' }, soft: { background: '#F3F8FB' }, warning: { amber: '#F4B942' }, critical: { red: '#D95C5C' } } } }, plugins: [] };
export default config;
