import React from 'react';
import '../styles/index.css';

export const viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata = {
  title: {
    default: 'Banking Dashboard',
    template: 'Banking Dashboard | %s',
  },
  description: 'Comprehensive banking dashboard for managing accounts, credit cards, transactions, and expenses. Track your financial activities, monitor spending patterns, and perform secure money transfers with real-time analytics and insights.',
  keywords: 'banking dashboard, financial management, credit cards, account overview, transactions, money transfer, expense tracking, financial analytics, secure banking',
  
  openGraph: {
    type: 'website',
    title: {
      default: 'Banking Dashboard',
      template: 'Banking Dashboard | %s',
    },
    description: 'Take control of your finances with our comprehensive banking dashboard. Monitor accounts, manage credit cards, track expenses, and transfer money securely with intuitive charts and real-time updates.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}
</body>
    </html>
  );
}