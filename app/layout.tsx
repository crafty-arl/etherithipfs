import './globals.css';
import { ReactNode } from 'react';

export const metadata = {
  title: 'Etherith - Living Archive',
  description: 'A reverent space for cultural preservation. Decentralized memory storage on the eternal web.',
  keywords: 'decentralized storage, IPFS, cultural preservation, digital archive, Web3',
  icons: {
    icon: '/etherith_logo_v2.jpg',
    shortcut: '/etherith_logo_v2.jpg',
    apple: '/etherith_logo_v2.jpg',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/jpeg" href="/etherith_logo_v2.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/etherith_logo_v2.jpg" />
        <link rel="apple-touch-icon" href="/etherith_logo_v2.jpg" />
        <meta name="theme-color" content="#d97706" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&family=Merriweather:wght@700&display=swap" rel="stylesheet" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
