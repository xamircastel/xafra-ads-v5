import React from 'react';
import { useEffect, useState } from 'react';
import { Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const totalImages = 5;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % totalImages);
    }, 3000); // Cambia cada 3 segundos

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const images = document.querySelectorAll('.carousel-image');
    images.forEach((img, index) => {
      if (index === currentImageIndex) {
        img.classList.remove('opacity-0');
        img.classList.add('opacity-100');
      } else {
        img.classList.remove('opacity-100');
        img.classList.add('opacity-0');
      }
    });
  }, [currentImageIndex]);

  return (
    <footer className="relative text-white py-16 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/Group 3 (10).png")',
        }}
      ></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 min-h-[500px] flex flex-col justify-between">
          {/* Company message */}
          <div className="space-y-6 max-w-lg ml-auto mr-8 mt-8">
            <p className="text-lg leading-relaxed text-gray-800 font-medium">
              Somos tus arquitectos de crecimiento digital, diseñamos estrategias personalizadas 
              que no solo aumentan tu visibilidad, sino que también impulsan tus ventas y 
              fortalecen tu marca. ¡Tu éxito en línea comienza aquí!
            </p>
          </div>

          {/* Contact information */}
          <div className="space-y-6 max-w-md mr-8 mb-8 ml-auto">
            <h3 className="text-3xl font-bold mb-8 text-gray-800">Datos de Contacto</h3>
            <div className="space-y-6">
              <div className="flex items-center space-x-8">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-xl">
                  <Mail size={20} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-800 mb-1">Email</p>
                  <a 
                    href="mailto:comercial@xafra-ads.com" 
                    className="text-orange-600 hover:text-orange-700 transition-colors text-lg font-medium"
                  >
                    comercial@xafra-ads.com
                  </a>
                </div>
              </div>
              
              <div className="flex items-center space-x-8">
                <div className="w-16 h-16 bg-orange-600 rounded-full flex items-center justify-center shadow-xl">
                  <Phone size={20} />
                </div>
                <div>
                  <p className="font-bold text-lg text-gray-800 mb-1">Teléfono</p>
                  <a 
                    href="tel:+51937203591" 
                    className="text-orange-600 hover:text-orange-700 transition-colors text-lg font-medium"
                  >
                    +51 937203591
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center pb-4">
          <p className="text-gray-600 font-medium">
            © 2024 Xafra Ads. Todos los derechos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;