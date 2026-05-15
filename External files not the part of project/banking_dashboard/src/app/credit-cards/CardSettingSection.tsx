'use client';

import Image from 'next/image';

interface SettingItem {
  id: number;
  icon: string;
  iconBg: string;
  title: string;
  description: string;
}

export default function CardSettingSection() {
  const settings: SettingItem[] = [
    {
      id: 1,
      icon: '/images/img_001_block_credit_card.svg',
      iconBg: '#fff5d9',
      title: 'Block Card',
      description: 'Instantly block your card'
    },
    {
      id: 2,
      icon: '/images/img_002_padlock.svg',
      iconBg: '#e7edff',
      title: 'Change Pin Code',
      description: 'Choose another pin code'
    },
    {
      id: 3,
      icon: '/images/img_003_google_glass_logo.svg',
      iconBg: '#ffe0eb',
      title: 'Add to Google Pay',
      description: 'Withdraw without any card'
    },
    {
      id: 4,
      icon: '/images/img_apple_2_1.svg',
      iconBg: '#dcfaf8',
      title: 'Add to Apple Pay',
      description: 'Withdraw without any card'
    },
    {
      id: 5,
      icon: '/images/img_apple_2_1.svg',
      iconBg: '#dcfaf8',
      title: 'Add to Apple Store',
      description: 'Withdraw without any card'
    }
  ];

  const handleSettingClick = (title: string): void => {
    // Handle setting action
  };

  return (
    <section className="w-full lg:w-[32%]">
      <h2 className="text-[16px] sm:text-[20px] lg:text-2xl font-semibold font-inter text-[#333b69] mb-4 sm:mb-5">
        Card Setting
      </h2>
      
      <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-8">
        <div className="space-y-4 sm:space-y-5">
          {settings.map((setting) => (
            <button
              key={setting.id}
              onClick={() => handleSettingClick(setting.title)}
              className="w-full flex items-center gap-4 sm:gap-5 hover:bg-gray-50 p-2 rounded-lg transition-colors"
            >
              {/* Icon */}
              <div
                className="w-[50px] h-[50px] sm:w-[56px] sm:h-[56px] lg:w-[60px] lg:h-[60px] rounded-lg sm:rounded-xl lg:rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: setting.iconBg }}
              >
                <Image
                  src={setting.icon}
                  alt={setting.title}
                  width={28}
                  height={28}
                  className="w-[24px] h-[24px] sm:w-[26px] sm:h-[26px] lg:w-[28px] lg:h-[28px]"
                />
              </div>
              
              {/* Text */}
              <div className="flex-1 text-left">
                <h3 className="text-[14px] sm:text-base font-medium font-inter text-[#232323] mb-1">
                  {setting.title}
                </h3>
                <p className="text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf]">
                  {setting.description}
                </p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}