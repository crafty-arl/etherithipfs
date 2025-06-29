import './globals.css';
import { ReactNode } from 'react';
import { Inter, Merriweather } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const merriweather = Merriweather({
  subsets: ['latin'],
  weight: ['300', '400', '700'],
  variable: '--font-merriweather',
});

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
    <html lang="en" className={`${inter.variable} ${merriweather.variable}`}>
      <head>
        <link rel="icon" type="image/jpeg" href="/etherith_logo_v2.jpg" />
        <link rel="shortcut icon" type="image/jpeg" href="/etherith_logo_v2.jpg" />
        <link rel="apple-touch-icon" href="/etherith_logo_v2.jpg" />
        <meta name="theme-color" content="#d97706" />
      </head>
      <body>
        {children}
      </body>
    </html>
  );
}
