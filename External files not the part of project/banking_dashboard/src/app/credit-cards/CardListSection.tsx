'use client';

import Image from 'next/image';

interface CardItem {
  id: number;
  icon: string;
  iconBg: string;
  type: string;
  bank: string;
  number: string;
  name: string;
}

export default function CardListSection() {
  const cards: CardItem[] = [
    {
      id: 1,
      icon: '/images/img_group_5.svg',
      iconBg: '#e7edff',
      type: 'Secondary',
      bank: 'DBL Bank',
      number: '**** **** 5600',
      name: 'William'
    },
    {
      id: 2,
      icon: '/images/img_group_6.svg',
      iconBg: '#ffe0eb',
      type: 'Secondary',
      bank: 'BRC Bank',
      number: '**** **** 4300',
      name: 'Michel'
    },
    {
      id: 3,
      icon: '/images/img_group_7.svg',
      iconBg: '#fff5d9',
      type: 'Secondary',
      bank: 'ABM Bank',
      number: '**** **** 7560',
      name: 'Edward'
    }
  ];

  return (
    <section className="w-full lg:flex-1">
      <h2 className="text-[16px] sm:text-[20px] lg:text-2xl font-semibold font-inter text-[#333b69] mb-4 sm:mb-5">
        Card List
      </h2>
      
      <div className="flex flex-col gap-4 sm:gap-5">
        {cards.map((card) => (
          <article
            key={card.id}
            className="bg-white rounded-lg sm:rounded-xl lg:rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-0"
          >
            {/* Icon */}
            <div
              className="w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] lg:w-[60px] lg:h-[60px] rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: card.iconBg }}
            >
              <Image
                src={card.icon}
                alt={`${card.bank} icon`}
                width={28}
                height={28}
                className="w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] lg:w-[28px] lg:h-[28px]"
              />
            </div>
            
            {/* Card Info Grid */}
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 sm:ml-4">
              {/* Card Type */}
              <div>
                <p className="text-[14px] sm:text-base font-medium font-inter text-[#232323] mb-1">
                  Card Type
                </p>
                <p className="text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf]">
                  {card.type}
                </p>
              </div>
              
              {/* Bank */}
              <div>
                <p className="text-[14px] sm:text-base font-medium font-inter text-[#232323] mb-1">
                  Bank
                </p>
                <p className="text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf]">
                  {card.bank}
                </p>
              </div>
              
              {/* Card Number */}
              <div>
                <p className="text-[14px] sm:text-base font-medium font-inter text-[#232323] mb-1">
                  Card Number
                </p>
                <p className="text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf]">
                  {card.number}
                </p>
              </div>
              
              {/* Name */}
              <div>
                <p className="text-[14px] sm:text-base font-medium font-inter text-[#232323] mb-1">
                  Namain Card
                </p>
                <p className="text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf]">
                  {card.name}
                </p>
              </div>
            </div>
            
            {/* View Details */}
            <button className="text-[13px] sm:text-sm lg:text-sm font-medium font-inter text-[#1814f3] hover:underline sm:ml-4 self-start sm:self-center">
              View Details
            </button>
          </article>
        ))}
      </div>
    </section>
  );
}