'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function AddNewCardSection() {
  const [formData, setFormData] = useState({
    cardType: '',
    nameOnCard: '',
    cardNumber: '',
    expirationDate: ''
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <section className="w-full lg:flex-1">
      <h2 className="text-[16px] sm:text-[20px] lg:text-2xl font-semibold font-inter text-[#333b69] mb-4 sm:mb-5">
        Add New Card
      </h2>
      
      <div className="bg-white rounded-xl sm:rounded-2xl lg:rounded-3xl p-5 sm:p-6 lg:p-8">
        <p className="text-[14px] sm:text-base font-inter text-[#718ebf] leading-relaxed mb-6 sm:mb-7 lg:mb-8">
          Credit Card generally means a plastic card issued by Scheduled Commercial Banks assigned to a Cardholder, with a credit limit, that can be used to purchase goods and services on credit or obtain cash advances.
        </p>
        
        <form onSubmit={handleSubmit} className="space-y-5 sm:space-y-6">
          {/* Row 1: Card Type and Name On Card */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-[30px]">
            <div>
              <label className="block text-[14px] sm:text-base font-inter text-[#232323] mb-2">
                Card Type
              </label>
              <input
                type="text"
                name="cardType"
                value={formData.cardType}
                onChange={handleInputChange}
                placeholder="Classic"
                className="w-full px-4 sm:px-5 py-3 text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf] bg-white border border-[#dfeaf2] rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-[14px] sm:text-base font-inter text-[#232323] mb-2">
                Name On Card
              </label>
              <input
                type="text"
                name="nameOnCard"
                value={formData.nameOnCard}
                onChange={handleInputChange}
                placeholder="My Cards"
                className="w-full px-4 sm:px-5 py-3 text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf] bg-white border border-[#dfeaf2] rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
          
          {/* Row 2: Card Number and Expiration Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6 lg:gap-[30px]">
            <div>
              <label className="block text-[14px] sm:text-base font-inter text-[#232323] mb-2">
                Card Number
              </label>
              <input
                type="password"
                name="cardNumber"
                value={formData.cardNumber}
                onChange={handleInputChange}
                placeholder="**** **** **** ****"
                maxLength={16}
                className="w-full px-4 sm:px-5 py-3 text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf] bg-white border border-[#dfeaf2] rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
            
            <div>
              <label className="block text-[14px] sm:text-base font-inter text-[#232323] mb-2">
                Expiration Date
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="expirationDate"
                  value={formData.expirationDate}
                  onChange={handleInputChange}
                  placeholder="25 January 2025"
                  className="w-full px-4 sm:px-5 py-3 pr-12 text-[13px] sm:text-sm lg:text-sm font-inter text-[#718ebf] bg-white border border-[#dfeaf2] rounded-xl sm:rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <Image
                  src="/images/img_arrowdown.svg"
                  alt="Dropdown arrow"
                  width={12}
                  height={16}
                  className="absolute right-4 sm:right-5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
              </div>
            </div>
          </div>
          
          {/* Submit Button */}
          <button
            type="submit"
            className="bg-[#1814f3] text-white text-[16px] sm:text-lg font-medium font-inter px-7 sm:px-8 lg:px-9 py-3 sm:py-3.5 rounded-lg hover:bg-[#1410d0] transition-colors"
          >
            Add Card
          </button>
        </form>
      </div>
    </section>
  );
}