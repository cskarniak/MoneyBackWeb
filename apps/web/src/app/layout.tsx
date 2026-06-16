import type { Metadata } from 'next';
import { ColorSchemeScript } from '@mantine/core';
import { Providers } from '@/providers/Providers';
import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'MoneyBack',
  description: 'Gestion financière et patrimoniale',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
