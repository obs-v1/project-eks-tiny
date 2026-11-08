/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{js,jsx}'],
    theme: {
        extend: {
            colors: {
                primary: '#2563eb',
                accent: '#06b6d4',
                dark: '#0f172a',
                card: '#1e293b',
            },
        },
    },
    plugins: [],
};
