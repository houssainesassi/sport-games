import type {Metadata} from 'next';
import type {ReactNode} from 'react';
import './globals.css';

export const metadata: Metadata = {
    title: 'SUBWAYS SURFERS',
    icons: {
        icon: '/favicon.ico',
    },
};

export default function RootLayout({children}: {children: ReactNode}) {
    return (
        <html lang="en">
            <body>{children}</body>
        </html>
    );
}
