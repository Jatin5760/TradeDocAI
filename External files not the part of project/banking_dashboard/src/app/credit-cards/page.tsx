import { Metadata } from 'next';
import CreditCardsPage from './CreditCardsPage';

export const metadata: Metadata = {
  title: 'Credit Cards Management - Banking Dashboard',
  description: 'Manage your credit cards, view expense statistics, add new cards, and configure card settings. Block cards, change PIN codes, and add cards to digital wallets like Google Pay, Apple Pay, and Apple Store.',
  keywords: 'credit cards, card management, expense statistics, add card, block card, change PIN, Google Pay, Apple Pay, digital wallet, banking',
  
  openGraph: {
    title: 'Credit Cards Management - Banking Dashboard',
    description: 'Manage your credit cards, view expense statistics, add new cards, and configure card settings. Block cards, change PIN codes, and add cards to digital wallets.',
  }
};

export default function Page() {
  return <CreditCardsPage />;
}