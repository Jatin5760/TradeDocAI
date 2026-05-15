'use client';

import { useState } from 'react';
import Header from '@/components/common/Header';
import Sidebar from '@/components/common/Sidebar';
import MyCardsSection from './MyCardsSection';
import CardStatisticsSection from './CardStatisticsSection';
import CardListSection from './CardListSection';
import AddNewCardSection from './AddNewCardSection';
import CardSettingSection from './CardSettingSection';

export default function CreditCardsPage() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex flex-row w-full min-h-screen bg-background-main">
      <Sidebar 
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      
      <div className="flex flex-col w-full lg:ml-[16%]">
        <Header 
          title="Credit Cards"
          onMenuClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />
        
        <main className="flex-1 bg-background-main">
          <div className="w-full px-4 sm:px-6 lg:px-10 py-6 lg:py-8">
            <div className="w-full max-w-[1352px] mx-auto">
              {/* Divider Line */}
              <div className="w-full h-[1px] bg-[#e6eff5] mb-6" />
              
              {/* My Cards Section */}
              <MyCardsSection />
              
              {/* Statistics and List Section */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-6">
                <CardStatisticsSection />
                <CardListSection />
              </div>
              
              {/* Add Card and Settings Section */}
              <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 mt-6 mb-8">
                <AddNewCardSection />
                <CardSettingSection />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}