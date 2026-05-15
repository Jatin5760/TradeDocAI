'use client';
import { useState } from 'react';
 import Image from'next/image';

interface Person {
  id: number;
  name: string;
  role: string;
  image: string;
  isGroup?: boolean;
}

export default function QuickTransferSection() {
  const [amount, setAmount] = useState<string>('525.50')
  const [currentIndex, setCurrentIndex] = useState<number>(0)

  const people: Person[] = [
    { 
      id: 1, 
      name: 'Livia Bator', 
      role: 'CEO', 
      image: '/images/img_pexels_julia_volk_5273755.png' 
    },
    { 
      id: 2, 
      name: 'Randy Press', 
      role: 'Director', 
      image: '/images/img_marcel_strauss.png' 
    },
    { 
      id: 3, 
      name: 'Workman', 
      role: 'Designer', 
      image: '/images/img_austin_distel_7.png',
      isGroup: true
    }
  ]

  const handleNext = (): void => {
    setCurrentIndex((prev: number) => (prev + 1) % people.length)
  }

  const handleSend = (): void => {
    // Handle send money logic
  }

  const visiblePeople = [
    people[currentIndex],
    people[(currentIndex + 1) % people.length],
    people[(currentIndex + 2) % people.length]
  ]

  return (
    <div className="flex flex-col gap-5 sm:gap-5 md:gap-5 lg:gap-5 w-full lg:w-[42%]">
      <h2 className="text-[16px] sm:text-[18px] md:text-[20px] lg:text-2xl font-semibold leading-[20px] sm:leading-[22px] md:leading-[25px] lg:leading-3xl text-text-secondary font-inter">
        Quick Transfer
      </h2>

      <div className="flex flex-col gap-[20px] sm:gap-[22px] md:gap-[24px] lg:gap-[26px] w-full bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-6 sm:px-6 md:px-6 lg:px-6 py-[28px] sm:py-[30px] md:py-[32px] lg:py-[34px]">
        {/* People Slider */}
        <div className="flex flex-row justify-center items-center w-full">
          <div className="flex flex-row gap-[24px] sm:gap-[26px] md:gap-[28px] lg:gap-[30px] justify-between items-center w-full">
            {visiblePeople.map((person: Person, index: number) => (
              <div 
                key={person.id}
                className={`flex flex-col gap-[10px] sm:gap-[11px] md:gap-[12px] lg:gap-[14px] justify-start items-start ${
                  index === 0 ? 'w-[34%]' : index === 1 ? 'w-[36%]' : 'w-[28%]'
                }`}
              >
                {person.isGroup ? (
                  <div className="flex flex-col justify-start items-center w-full">
                    <div className="flex flex-col justify-start items-center w-full relative">
                      <Image
                        src="/images/img_austin_distel_7.png"
                        alt="Person 1"
                        width={70}
                        height={70}
                        className="w-[70px] h-[70px] rounded-[34px]"
                      />
                      <Image
                        src="/images/img_emanuel_minca_j.png"
                        alt="Person 2"
                        width={70}
                        height={70}
                        className="w-[70px] h-[70px] rounded-[34px] absolute top-0"
                      />
                    </div>
                  </div>
                ) : (
                  <Image
                    src={person.image}
                    alt={person.name}
                    width={70}
                    height={70}
                    className={`w-[70px] h-[70px] rounded-[34px] ${index === 0 ? 'ml-[4px]' : ''}`}
                  />
                )}
                <div className={`flex flex-col ${person.isGroup ? 'gap-[2px]' : 'gap-[4px]'} justify-start items-center w-full`}>
                  <p className="text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-normal leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-text-primary font-inter">
                    {person.name}
                  </p>
                  <p className="text-sm sm:text-sm md:text-sm lg:text-sm font-normal leading-[17px] sm:leading-[18px] md:leading-[18px] lg:leading-base text-text-tertiary font-inter">
                    {person.role}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={handleNext}
            className="w-[44px] sm:w-[46px] md:w-[48px] lg:w-[50px] h-[44px] sm:h-[46px] md:h-[48px] lg:h-[50px] bg-[#ffffff] rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl flex items-center justify-center p-[14px] sm:p-[16px] md:p-[17px] lg:p-[18px] shadow-[4px_4px_18px_#e6e3e7cc] hover:shadow-lg transition-smooth"
          >
            <Image
              src="/images/img_vector_1.svg"
              alt="Next"
              width={22}
              height={22}
              className="w-[22px] h-[22px]"
            />
          </button>
        </div>

        {/* Amount Input and Send Button */}
        <div className="flex flex-row justify-center items-center w-full">
          <p className="text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-normal leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-text-tertiary font-inter">
            Write Amount
          </p>

          <div className="flex flex-col justify-start items-end w-full ml-[20px] sm:ml-[22px] md:ml-[24px] lg:ml-[26px]">
            <div className="flex flex-row justify-start items-center w-full bg-background-hover rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-[24px] sm:px-[26px] md:px-[28px] lg:px-[30px] py-[10px] sm:py-[11px] md:py-[11px] lg:py-[12px]">
              <input
                type="text"
                value={amount}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAmount(e.target.value)}
                className="w-full bg-transparent text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-normal leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-text-tertiary font-inter outline-none"
              />
            </div>

            <button
              onClick={handleSend}
              className="flex flex-row gap-[10px] items-center bg-primary rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl px-[20px] sm:px-[32px] md:px-[41px] lg:px-[50px] py-[10px] sm:py-[11px] md:py-[11px] lg:py-[12px] shadow-[4px_4px_18px_#e6e3e7cc] hover:bg-opacity-90 transition-smooth -mt-[44px] sm:-mt-[46px] md:-mt-[48px] lg:-mt-[50px] pl-6 sm:pl-6 md:pl-6 lg:pl-6"
            >
              <span className="text-[14px] sm:text-[15px] md:text-[15px] lg:text-base font-medium leading-[18px] sm:leading-[19px] md:leading-[19px] lg:leading-md text-[#ffffff] font-inter">
                Send
              </span>
              <Image
                src="/images/img_vector_white_a700.svg"
                alt="Send"
                width={26}
                height={22}
                className="w-[26px] h-[22px]"
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}