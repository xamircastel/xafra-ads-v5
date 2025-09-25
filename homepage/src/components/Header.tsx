import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [activeMenu, setActiveMenu] = useState('Nosotros');

  const menuItems = [
    { name: 'Nosotros', href: '#nosotros' },
    { name: 'Ofertas', href: '#ofertas' },
    { name: 'Contáctanos', href: '#contactanos' }
  ];

  return (
    <header className="bg-gray-600 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <img 
              src="/xafra-logo.svg" 
              alt="Xafra Ads Logo" 
              className="h-10 w-auto"
            />
            <h1 className="text-xl font-bold text-white">
              AFFILIATE MARKETING AGENCY
            </h1>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center bg-gray-500 rounded-full p-1">
            {menuItems.map((item) => (
              <a
                key={item.name}
                href={item.href}
                onClick={() => setActiveMenu(item.name)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 ${
                  activeMenu === item.name
                    ? 'bg-gradient-to-r from-orange-600 to-yellow-400 text-white shadow-lg'
                    : 'text-gray-200 hover:text-white hover:bg-gray-400'
                }`}
              >
                {item.name}
              </a>
            ))}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-300 hover:text-white"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-500">
            <div className="flex flex-col space-y-4">
              {menuItems.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  onClick={() => {
                    setActiveMenu(item.name);
                    setIsMenuOpen(false);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                    activeMenu === item.name
                      ? 'bg-gradient-to-r from-orange-600 to-yellow-400 text-white'
                      : 'text-gray-200 hover:text-white hover:bg-gray-500'
                  }`}
                >
                  {item.name}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;