/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                midnight: '#050c19',
                cardBlue: '#0b162a',
                gold: {
                    DEFAULT: '#d4af37',
                    light: '#f3e5ab',
                    text: '#e6d5a8',
                    glow: 'rgba(212, 175, 55, 0.4)'
                },
                temple: {
                    cream: '#FFF8E7',
                    saffron: '#FF7A00',
                    'saffron-light': '#FF9E40',
                    'saffron-dark': '#CC6200',
                    gold: '#d4af37',
                    'gold-light': '#FFD700',
                    navy: '#0E1A2B',
                    'cosmic-blue': '#4B0082',
                    text: '#1E293B',
                    'text-light': '#F8FAFC',
                }
            },
            fontFamily: {
                sans: ['Inter', 'Noto Sans Telugu', 'sans-serif'],
                serif: ['Playfair Display', 'serif'],
                telugu: ['Noto Sans Telugu', 'Inter', 'sans-serif'],
                mono: ['JetBrains Mono', 'Noto Sans Telugu', 'Menlo', 'monospace']
            },
            animation: {
                'spin-slow': 'spin 12s linear infinite',
                'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
            }
        },
    },
    plugins: [],
};
