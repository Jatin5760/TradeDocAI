'use client';
import Image from'next/image';

interface Transaction {
  id: number;
  icon: string;
  iconBg: string;
  title: string;
  date: string;
  amount: string;
  amountColor: string;
}

export default function RecentTransactionSection() {
  const transactions: Transaction[] = [
    {
      id: 1,
      icon: '/images/img_iconfinder_busi.svg',
      iconBg: '#fff5d9',
      title: 'Deposit from my Card',
      date: '28 January 2021',
      amount: '-$850',
      amountColor: '#ff4b4a'
    },
    {
      id: 2,
      icon: '/images/img_iconfinder_payp.svg',
      iconBg: '#e7edff',
      title: 'Deposit Paypal',
      date: '25 January 2021',
      amount: '+$2,500',
      amountColor: '#41d4a8'
    },
    {
      id: 3,
      icon: '/images/img_iconfinder_6_4753731.svg',
      iconBg: '#dcfaf8',
      title: 'Jemi Wilson',
      date: '21 January 2021',
      amount: '+$5,400',
      amountColor: '#41d4a8'
    }
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-5 md:gap-5 lg:gap-5 w-full lg:w-[32%]">
      <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-2xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
        Recent Transaction
      </h2>

      <div className="flex flex-col w-full bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-6 sm:px-6 md:px-6 lg:px-6 py-6 sm:py-6 md:py-6 lg:py-6">
        <div className="flex flex-col gap-[8px] sm:gap-[9px] md:gap-[9px] lg:gap-[10px] w-full">
          {transactions.map((transaction: Transaction) => (
            <div key={transaction.id} className="flex flex-row justify-center items-center w-full">
              <button
                className="w-[44px] sm:w-[48px] md:w-[52px] lg:w-[54px] h-[44px] sm:h-[48px] md:h-[52px] lg:h-[54px] rounded-[22px] sm:rounded-[24px] md:rounded-[25px] lg:rounded-[26px] flex items-center justify-center p-[10px] sm:p-[11px] md:p-[11px] lg:p-[12px]"
                style={{ backgroundColor: transaction.iconBg }}
              >
                <Image
                  src={transaction.icon}
                  alt={transaction.title}
                  width={30}
                  height={30}
                  className="w-[30px] h-[30px]"
                />
              </button>

              <div className="flex flex-row justify-center items-start self-end w-full ml-4 sm:ml-4 md:ml-4 lg:ml-4">
                <div className="flex flex-col gap-[2px] justify-start items-start self-center w-full">
                  <p className="text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-medium leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-text-primary font-inter">
                    {transaction.title}
                  </p>
                  <p className="text-sm sm:text-sm md:text-sm lg:text-sm font-normal leading-base text-text-tertiary font-inter">
                    {transaction.date}
                  </p>
                </div>
                <p
                  className="text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-medium leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-right font-inter mt-[8px] sm:mt-[9px] md:mt-[9px] lg:mt-[10px]"
                  style={{ color: transaction.amountColor }}
                >
                  {transaction.amount}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}