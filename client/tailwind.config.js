/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                black: '#000000',
                gold: {
                    light: '#FCEebb',
                    DEFAULT: '#FFD700',
                    dark: '#B8860B',
                }
            },
            fontFamily: {
                sans: ['Outfit', 'Inter', 'sans-serif'],
                serif: ['Outfit', 'serif'], // Outfit works well as a display font too
            }
        },
    },
    plugins: [],
}
