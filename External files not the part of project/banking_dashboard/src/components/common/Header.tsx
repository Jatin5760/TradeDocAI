'use client';
import { useState } from 'react';
 import Image from'next/image';
 import Link from'next/link';

interface HeaderProps {
  pageTitle: string;
}

export default function Header({ pageTitle }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState<string>('')

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setSearchQuery(e.target.value)
  }

  return (
    <header className="w-full bg-header-background">
      <div className="flex flex-col justify-center items-end w-full">
        <div className="flex flex-col gap-5 sm:gap-5 md:gap-5 lg:gap-5 justify-start items-end w-[96%] mt-5 sm:mt-5 md:mt-5 lg:mt-5 mx-4 sm:mx-6 md:mx-7 lg:mx-[38px]">
          {/* Header Top Bar */}
          <div className="flex flex-row justify-between items-center w-full max-w-[1352px]">
            {/* Logo (Mobile Only) */}
            <div className="block lg:hidden">
              <Image
                src="/images/img_header_logo.png"
                alt="Logo"
                width={182}
                height={36}
                className="w-[140px] sm:w-[160px] h-auto"
              />
            </div>

            {/* Page Title */}
            <h1 className="hidden lg:block text-[20px] sm:text-[22px] md:text-[25px] lg:text-3xl font-semibold leading-[24px] sm:leading-[26px] md:leading-[30px] lg:leading-5xl text-text-secondary font-inter">
              {pageTitle}
            </h1>

            {/* Right Section */}
            <div className="flex flex-row gap-[20px] sm:gap-[22px] md:gap-[26px] lg:gap-[30px] justify-center items-center w-auto lg:w-[46%]">
              {/* Search Bar (Desktop) */}
              <div className="hidden lg:flex flex-row gap-[14px] items-center w-full bg-background-search rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl pl-[48px] sm:pl-[50px] md:pl-[54px] lg:pl-[56px] pr-[18px] sm:pr-[19px] md:pr-[20px] lg:pr-[22px] py-[12px] sm:py-[13px] md:py-[13px] lg:py-[14px]">
                <Image
                  src="/images/img_search.svg"
                  alt="Search"
                  width={20}
                  height={16}
                  className="w-[20px] h-[16px] absolute ml-[-32px]"
                />
                <input
                  type="text"
                  placeholder="Search for something"
                  value={searchQuery}
                  onChange={handleSearch}
                  className="w-full bg-transparent text-sm sm:text-sm md:text-sm lg:text-sm font-normal leading-base text-text-muted font-inter outline-none placeholder:text-text-muted"
                />
              </div>

              {/* Settings Icon */}
              <Link 
                href="/settings"
                className="w-[44px] sm:w-[46px] md:w-[48px] lg:w-[50px] h-[44px] sm:h-[46px] md:h-[48px] lg:h-[50px] bg-background-search rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl flex items-center justify-center p-[10px] sm:p-[11px] md:p-[11px] lg:p-[12px] hover:bg-background-hover transition-smooth"
              >
                <Image
                  src="/images/img_settings_1.svg"
                  alt="Settings"
                  width={26}
                  height={26}
                  className="w-[26px] h-[26px]"
                />
              </Link>

              {/* Notifications Icon */}
              <Link 
                href="/notifications"
                className="w-[44px] sm:w-[46px] md:w-[48px] lg:w-[50px] h-[44px] sm:h-[46px] md:h-[48px] lg:h-[50px] bg-background-search rounded-xl sm:rounded-xl md:rounded-2xl lg:rounded-xl flex items-center justify-center p-[10px] sm:p-[11px] md:p-[11px] lg:p-[12px] hover:bg-background-hover transition-smooth"
              >
                <Image
                  src="/images/img_002_notification_1.svg"
                  alt="Notifications"
                  width={26}
                  height={26}
                  className="w-[26px] h-[26px]"
                />
              </Link>

              {/* Profile Image */}
              <Link href="/profile">
                <Image
                  src="/images/img_pexels_christin.png"
                  alt="Profile"
                  width={60}
                  height={60}
                  className="w-[50px] sm:w-[54px] md:w-[57px] lg:w-[60px] h-[50px] sm:h-[54px] md:h-[57px] lg:h-[60px] rounded-[25px] sm:rounded-[27px] md:rounded-[28px] lg:rounded-[30px] hover:opacity-90 transition-smooth"
                />
              </Link>
            </div>
          </div>

          {/* Divider Line */}
          <div className="w-[84%] h-[1px] bg-background-lighter mx-auto hidden lg:block" />
        </div>
      </div>
    </header>
  )
}