'use client';
import Link from'next/link';
 import Image from'next/image';

interface CardData {
  id: number;
  balance: string;
  cardHolder: string;
  validThru: string;
  cardNumber: string;
  variant: 'gradient' | 'white';
}

export default function MyCardsSection() {
  const cards: CardData[] = [
    {
      id: 1,
      balance: '$5,756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
      variant: 'gradient'
    },
    {
      id: 2,
      balance: '$5,756',
      cardHolder: 'Eddy Cusuma',
      validThru: '12/22',
      cardNumber: '3778 **** **** 1234',
      variant: 'white'
    }
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-5 md:gap-5 lg:gap-5 w-full lg:w-[68%]">
      {/* Header */}
      <div className="flex flex-row justify-between items-center w-full">
        <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-[22px] font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
          My Cards
        </h2>
        <Link 
          href="/credit-cards"
          className="text-[14px] sm:text-[15px] md:text-[16px] lg:text-md font-semibold leading-base sm:leading-base md:leading-md lg:leading-lg text-text-secondary font-inter hover:text-primary transition-smooth"
        >
          See All
        </Link>
      </div>

      {/* Cards List */}
      <div className="flex flex-col sm:flex-col md:flex-row lg:flex-row gap-[20px] sm:gap-[24px] md:gap-[28px] lg:gap-[30px] w-full overflow-x-auto">
        {cards.map((card: CardData) => (
          <div
            key={card.id}
            className={`flex flex-col justify-end items-center w-full sm:w-full md:w-[48%] lg:w-[350px] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl flex-shrink-0 ${
              card.variant === 'gradient' ?'bg-[linear-gradient(135deg,#4c49ed_0%,_#0a06f4_100%)]' :'bg-[#ffffff] border-[1px] border-solid border-[#deeaf2]'
            }`}
          >
            <div className="flex flex-col gap-8 sm:gap-8 md:gap-8 lg:gap-8 w-full pt-[16px] sm:pt-[18px] md:pt-[20px] lg:pt-[22px]">
              {/* Balance and Chip */}
              <div className="flex flex-row justify-start items-center w-full px-6 sm:px-6 md:px-6 lg:px-6">
                <div className="flex flex-col justify-start items-start w-full">
                  <p className={`text-xs font-normal leading-xs font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffff]' : 'text-text-tertiary'
                  }`}>
                    Balance
                  </p>
                  <p className={`text-[16px] sm:text-[18px] md:text-[19px] lg:text-xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[23px] lg:leading-2xl font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffff]' : 'text-text-secondary'
                  }`}>
                    {card.balance}
                  </p>
                </div>
                <Image
                  src="/images/img_chip_card.png"
                  alt="Chip Card"
                  width={34}
                  height={34}
                  className="w-[34px] h-[34px]"
                />
              </div>

              {/* Card Holder and Valid Thru */}
              <div className="flex flex-row justify-between items-center w-full px-6 sm:px-6 md:px-6 lg:px-6">
                <div className="flex flex-col justify-start items-center w-auto">
                  <p className={`text-xs font-normal leading-xs font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffffb2]' : 'text-text-tertiary'
                  }`}>
                    CARD HOLDER
                  </p>
                  <p className={`text-sm sm:text-sm md:text-sm lg:text-sm font-semibold leading-sm font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffff]' : 'text-text-secondary'
                  }`}>
                    {card.cardHolder}
                  </p>
                </div>
                <div className="flex flex-col justify-start items-start w-[46%]">
                  <p className={`text-xs font-normal leading-xs font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffffb2]' : 'text-text-tertiary'
                  }`}>
                    VALID THRU
                  </p>
                  <p className={`text-sm sm:text-sm md:text-sm lg:text-sm font-semibold leading-sm font-lato ${
                    card.variant === 'gradient' ? 'text-[#ffffff]' : 'text-text-secondary'
                  }`}>
                    {card.validThru}
                  </p>
                </div>
              </div>

              {/* Card Number and Logo */}
              <div className={`flex flex-row justify-between items-center w-full px-6 sm:px-6 md:px-6 lg:px-6 py-[14px] sm:py-[16px] md:py-[17px] lg:py-[18px] ${
                card.variant === 'gradient' ?'bg-[linear-gradient(180deg,#ffffff26_0%,_#ffffff26_100%)] rounded-b-xl' :'border-t-[1px] border-solid border-[#dfeaf2] rounded-b-xl'
              }`}>
                <p className={`text-[18px] sm:text-[20px] md:text-[21px] lg:text-2xl font-semibold leading-[22px] sm:leading-[24px] md:leading-[26px] lg:leading-3xl font-lato ${
                  card.variant === 'gradient' ? 'text-[#ffffff]' : 'text-text-secondary'
                }`}>
                  {card.cardNumber}
                </p>
                <Image
                  src={card.variant === 'gradient' ?'/images/img_group_17.svg' :'/images/img_group_17_blue_gray_300.svg'
                  }
                  alt="Card Logo"
                  width={44}
                  height={30}
                  className="w-[44px] h-[30px]"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}