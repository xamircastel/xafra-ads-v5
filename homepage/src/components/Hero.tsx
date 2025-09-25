import React from 'react';
import { ArrowRight } from 'lucide-react';

export default function Hero() {
  const handleContactClick = () => {
    const subject = encodeURIComponent('Consulta sobre servicios de marketing digital');
    const body = encodeURIComponent('Hola, me interesa conocer más sobre sus servicios de marketing digital.');
    window.location.href = `mailto:comercial@xafra-ads.com?subject=${subject}&body=${body}`;
  };

  return (
    <section className="relative py-20 overflow-hidden">
      {/* Background Image */}
      <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url("/Orange Modern Strategic Planning Presentation (1).png")',
        }}
      >
        <div className="absolute inset-0 bg-white/10"></div>
      </div>
      
      {/* Decorative gradient lines */}
      <div className="absolute top-20 left-0 w-80 h-2 bg-gradient-to-r from-orange-600 to-yellow-400 opacity-60"></div>
      <div className="absolute top-32 left-10 w-60 h-2 bg-gradient-to-r from-orange-600 to-yellow-400 opacity-40"></div>
      <div className="absolute bottom-40 right-0 w-96 h-2 bg-gradient-to-r from-orange-600 to-yellow-400 opacity-50"></div>
      <div className="absolute bottom-28 right-20 w-72 h-2 bg-gradient-to-r from-orange-600 to-yellow-400 opacity-30"></div>
      <div className="absolute top-1/2 left-1/4 w-48 h-2 bg-gradient-to-r from-orange-600 to-yellow-400 opacity-25 transform -rotate-12"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative z-10 flex flex-col min-h-[80vh]">
          <div className="grid lg:grid-cols-2 gap-12 items-center flex-1">
            <div className="space-y-8 mt-16">
              <h1 className="text-5xl lg:text-7xl font-black leading-none tracking-tight">
                <span className="text-black block drop-shadow-lg">DIGITAL</span>
                <span className="text-orange-600 block">MARKETING</span>
                <span className="text-black block drop-shadow-lg">AGENCY</span>
              </h1>
              <p className="text-xl text-black leading-relaxed drop-shadow-md max-w-lg">
                Expertos en marketing de afiliados.<br/>
                Conectamos marcas con audiencias<br/>
                globales mediante campañas efectivas.
              </p>
            </div>
            <div className="relative lg:flex lg:justify-end">
              <div className="bg-orange-600 p-6 rounded-xl shadow-lg max-w-xs">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 font-bold text-xl">+</span>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-white">500+</p>
                    <p className="text-white">Campañas Exitosas</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-center pt-8 pb-2">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={handleContactClick}
                className="bg-gradient-to-r from-orange-600 to-yellow-400 text-white px-8 py-4 rounded-full font-semibold hover:from-orange-700 hover:to-yellow-500 transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg"
              >
                <span>Contáctanos</span>
                <ArrowRight size={20} />
              </button>
              <button className="bg-gradient-to-r from-orange-600 to-yellow-400 text-white px-8 py-4 rounded-full font-semibold hover:from-orange-700 hover:to-yellow-500 transition-all duration-300 shadow-lg">
                Ver Servicios
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}