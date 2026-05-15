'use client';
import { useState } from 'react';
 import Link from'next/link';
import { usePathname } from 'next/navigation';
 import Image from'next/image';

interface MenuItem {
  id: string;
  icon: string;
  label: string;
  path: string;
}

export default function Sidebar() {
  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false)

  const menuItems: MenuItem[] = [
    { id: '1', icon: '/images/img_vector_blue_a700.svg', label: 'Dashboard', path: '/dashboard' },
    { id: '2', icon: '/images/img_glyph.svg', label: 'Transactions', path: '/transactions' },
    { id: '3', icon: '/images/img_user_3_1.svg', label: 'Accounts', path: '/accounts' },
    { id: '4', icon: '/images/img_group.svg', label: 'Investments', path: '/investments' },
    { id: '5', icon: '/images/img_credit_card_1_gray_400.svg', label: 'Credit Cards', path: '/credit-cards' },
    { id: '6', icon: '/images/img_loan_1.svg', label: 'Loans', path: '/loans' },
    { id: '7', icon: '/images/img_service_1.svg', label: 'Services', path: '/services' },
    { id: '8', icon: '/images/img_econometrics_1.svg', label: 'My Privileges', path: '/privileges' },
    { id: '9', icon: '/images/img_vector_gray_400.svg', label: 'Setting', path: '/settings' }
  ]

  return (
    <>
      {/* Hamburger Menu (Mobile) */}
      <button 
        className="fixed top-4 left-4 z-50 lg:hidden p-3 bg-sidebar-background rounded-lg shadow-lg"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        aria-label="Toggle menu"
      >
        <div className="w-6 h-0.5 bg-text-secondary mb-1"></div>
        <div className="w-6 h-0.5 bg-text-secondary mb-1"></div>
        <div className="w-6 h-0.5 bg-text-secondary"></div>
      </button>

      {/* Sidebar */}
      <aside 
        className={`${
          isMenuOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:translate-x-0 fixed lg:static w-[250px] lg:w-[16%] h-screen bg-sidebar-background transition-transform duration-300 ease-in-out z-40 pt-[12px] overflow-y-auto`}
      >
        {/* Logo (Desktop) */}
        <div className="hidden lg:flex justify-center items-center px-6 py-8 mb-6">
          <Image
            src="/images/img_header_logo.png"
            alt="BankDash Logo"
            width={182}
            height={36}
            className="w-[182px] h-auto"
          />
        </div>

        {/* Menu Items */}
        <nav className="flex flex-col justify-start items-center w-full pt-[90px] lg:pt-0">
          {menuItems.map((item: MenuItem) => {
            const isActive = pathname === item.path
            
            return (
              <Link
                key={item.id}
                href={item.path}
                onClick={() => setIsMenuOpen(false)}
                className={`flex flex-row items-center w-full px-[14px] sm:px-[16px] md:px-[17px] lg:px-[18px] py-[14px] sm:py-[16px] md:py-[17px] lg:py-[18px] transition-smooth hover:bg-background-hover ${
                  isActive ? 'border-l-4 border-primary bg-background-hover' : ''
                }`}
              >
                <Image
                  src={item.icon}
                  alt={item.label}
                  width={24}
                  height={24}
                  className="w-[24px] h-[24px] ml-[20px] sm:ml-[21px] md:ml-[21px] lg:ml-[22px]"
                />
                <span className={`ml-[20px] sm:ml-[22px] md:ml-[24px] lg:lg-[26px] text-[16px] sm:text-[17px] md:text-[17px] lg:text-lg font-medium leading-[20px] sm:leading-[21px] md:leading-[21px] lg:leading-xl font-inter ${
                  isActive ? 'text-primary' : 'text-text-disabled'
                }`}>
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Overlay (Mobile) */}
      {isMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30 lg:hidden"
          onClick={() => setIsMenuOpen(false)}
        />
      )}
    </>
  )
}