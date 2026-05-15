'use client';

import Image from 'next/image';

interface CreditCard {
  id: number;
  balance: string;
  cardHolder: string;
  validThru: string;
  cardNumber: string;
  chipImage: string;
  logoImage: string;
  gradient: string;
  textColor: string;
}

export default function MyCardsSection() {
  const cards: CreditCard[] = [
    {
      id: 1,
      balance: '$5,756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
      chipImage: '/images/img_chip_card.png',
      logoImage: '/images/img_group_17.svg',
      gradient: 'linear-gradient(135deg,#2d60ff 0%, #529aff 100%)',
      textColor: 'text-white'
    },
    {
      id: 2,
      balance: '$5,756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
      chipImage: '/images/img_chip_card.png',
      logoImage: '/images/img_group_17.svg',
      gradient: 'linear-gradient(135deg,#4c49ed 0%, #0a06f4 100%)',
      textColor: 'text-white'
    },
    {
      id: 3,
      balance: '$5,756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
      chipImage: '/images/img_chip_card.png',
      logoImage: '/images/img_group_17_blue_gray_300.svg',
      gradient: 'linear-gradient(135deg,#2d60ff 0%, #529aff 100%)',
      textColor: 'text-[#343c6a]'
    }
  ];

  return (
    <section>
      <h2 className="text-[16px] sm:text-[20px] lg:text-2xl font-semibold font-inter text-[#333b69] mb-5 sm:mb-6">
        My Cards
      </h2>
      
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-6 lg:gap-[30px] overflow-x-auto pb-4 sm:pb-0">
        {cards.map((card) => (
          <div
            key={card.id}
            className="flex-shrink-0 w-full sm:w-[300px] lg:w-[350px] rounded-xl sm:rounded-2xl lg:rounded-3xl overflow-hidden"
            style={{ background: card.gradient }}
          >
            {/* Card Content */}
            <div className="p-5 sm:p-6">
              {/* Balance and Chip */}
              <div className="flex justify-between items-start mb-6 sm:mb-7 lg:mb-9">
                <div>
                  <p className="text-[10px] sm:text-xs font-lato text-white mb-1 sm:mb-2">Balance</p>
                  <p className="text-[16px] sm:text-lg lg:text-xl font-semibold font-lato text-white">
                    {card.balance}
                  </p>
                </div>
                <Image
                  src={card.chipImage}
                  alt="Card chip"
                  width={34}
                  height={34}
                  className="w-[28px] h-[28px] sm:w-[30px] sm:h-[30px] lg:w-[34px] lg:h-[34px]"
                />
              </div>
              
              {/* Card Holder and Valid Thru */}
              <div className="flex justify-between mb-4 sm:mb-5">
                <div>
                  <p className="text-[10px] sm:text-xs font-lato text-white text-opacity-70 mb-1">
                    CARD HOLDER
                  </p>
                  <p className="text-[13px] sm:text-sm lg:text-sm font-semibold font-lato text-white">
                    {card.cardHolder}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] sm:text-xs font-lato text-white text-opacity-70 mb-1">
                    VALID THRU
                  </p>
                  <p className="text-[13px] sm:text-sm lg:text-sm font-semibold font-lato text-white">
                    {card.validThru}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Card Number Section */}
            <div 
              className="bg-white bg-opacity-15 px-5 sm:px-6 py-4 sm:py-5 flex justify-between items-center rounded-b-xl sm:rounded-b-2xl lg:rounded-b-3xl"
            >
              <p className={`text-[16px] sm:text-lg lg:text-2xl font-semibold font-lato ${card.textColor}`}>
                {card.cardNumber}
              </p>
              <Image
                src={card.logoImage}
                alt="Card logo"
                width={44}
                height={30}
                className="w-[36px] h-[24px] sm:w-[40px] sm:h-[28px] lg:w-[44px] lg:h-[30px]"
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}