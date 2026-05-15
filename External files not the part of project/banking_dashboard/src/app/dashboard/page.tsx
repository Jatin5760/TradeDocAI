import { Metadata } from 'next';
 import DashboardPage from'./DashboardPage';

export const metadata: Metadata = {
  title: 'Dashboard Overview - Banking Dashboard',
  description: 'View comprehensive overview of your banking accounts including credit cards, recent transactions, weekly deposit and withdrawal activity, expense statistics, quick money transfers, and balance history with real-time financial analytics.',
  keywords: 'dashboard overview, account summary, credit cards, transactions, deposits, withdrawals, expense tracking, money transfer, balance history, financial analytics',
  
  openGraph: {
    title: 'Dashboard Overview - Banking Dashboard',
    description: 'Comprehensive banking dashboard with account overview, transaction monitoring, and financial analytics for managing your finances efficiently.',
  }
}

export default function Page() {
  return <DashboardPage />
}