import './globals.css';
import ClientLayout from './ClientLayout';

export const metadata = {
    title: 'RoboShop',
    description: 'Your one-stop shop for robotics components',
};

export default function RootLayout({ children }) {
    return (
        <html lang="en">
            <body className="min-h-screen flex flex-col">
                <ClientLayout>{children}</ClientLayout>
            </body>
        </html>
    );
}
