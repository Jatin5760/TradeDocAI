'use client';

 
 
 import Header from'@/components/common/Header';
 import Sidebar from'@/components/common/Sidebar';
 import MyCardsSection from'./MyCardsSection';
 import RecentTransactionSection from'./RecentTransactionSection';
 import WeeklyActivitySection from'./WeeklyActivitySection';
 import ExpenseStatisticsSection from'./ExpenseStatisticsSection';
 import QuickTransferSection from'./QuickTransferSection';
 import BalanceHistorySection from'./BalanceHistorySection';

export default function DashboardPage() {
  return (
    <div className="flex flex-row justify-start items-center w-full bg-[#ffffff]">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-col justify-start items-center w-full lg:w-[84%]">
        {/* Header */}
        <Header pageTitle="Overview" />

        {/* Dashboard Content */}
        <main className="w-full bg-background-main px-4 sm:px-6 md:px-6 lg:px-6 py-6 sm:py-6 md:py-6 lg:py-6">
          <div className="w-full max-w-[1440px] mx-auto flex flex-col gap-6 sm:gap-6 md:gap-6 lg:gap-6">
            {/* My Cards & Recent Transaction Section */}
            <section className="flex flex-col lg:flex-row gap-6 sm:gap-6 md:gap-6 lg:gap-6 w-full">
              <MyCardsSection />
              <RecentTransactionSection />
            </section>

            {/* Weekly Activity & Expense Statistics Section */}
            <section className="flex flex-col lg:flex-row gap-6 sm:gap-6 md:gap-6 lg:gap-6 w-full">
              <WeeklyActivitySection />
              <ExpenseStatisticsSection />
            </section>

            {/* Quick Transfer & Balance History Section */}
            <section className="flex flex-col lg:flex-row gap-6 sm:gap-6 md:gap-6 lg:gap-6 w-full">
              <QuickTransferSection />
              <BalanceHistorySection />
            </section>
          </div>
        </main>
      </div>
    </div>
  )
}