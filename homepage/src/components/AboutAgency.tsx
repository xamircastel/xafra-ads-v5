import React from 'react';
import { ShoppingCart, Building2, Clock, Headphones } from 'lucide-react';

const AboutAgency = () => {
  const handleContactClick = () => {
    const subject = encodeURIComponent('Consulta sobre servicios de la agencia');
    const body = encodeURIComponent('Hola, me interesa conocer más sobre los servicios de su agencia.');
    window.location.href = `mailto:comercial@xafra-ads.com?subject=${subject}&body=${body}`;
  };

  const cards = [
    {
      icon: ShoppingCart,
      gradient: "from-blue-500 to-blue-600",
      title: "Ofertas Directas e Indirectas",
      description: "Conectamos marcas con audiencias específicas a través de estrategias de afiliación directa y programas de referidos indirectos para maximizar el alcance y conversión."
    },
    {
      icon: Building2,
      gradient: "from-teal-400 to-cyan-400",
      title: "Pagos",
      description: "Sistema de pagos transparente y puntual. Ofrecemos múltiples métodos de pago con reportes detallados y liquidaciones semanales para nuestros afiliados."
    },
    {
      icon: Clock,
      gradient: "from-orange-400 to-pink-500",
      title: "Herramientas Útiles",
      description: "Plataforma completa con herramientas de tracking, analytics avanzados, creadores de enlaces, y dashboards en tiempo real para optimizar tus campañas."
    },
    {
      icon: Headphones,
      gradient: "from-purple-500 to-indigo-600",
      title: "Soporte 24/7",
      description: "Equipo de soporte técnico disponible las 24 horas del día, los 7 días de la semana. Asistencia inmediata para resolver cualquier consulta o problema técnico."
    }
  ];

  return (
    <section id="nosotros" className="py-20 bg-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-black text-orange-600 mb-4 hero-title">
            Sobre Nuestra Agencia
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Somos líderes en marketing de afiliados con presencia internacional. 
            Nuestro enfoque se basa en resultados medibles y relaciones duraderas.
          </p>
        </div>

        <div className="flex justify-center">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl">
            {cards.map((card, index) => {
              const IconComponent = card.icon;
              return (
                <div key={index} className="relative flex flex-col items-center">
                  {/* Círculo blanco superior */}
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center shadow-lg mb-4 relative z-10">
                    <IconComponent className="w-10 h-10 text-gray-600" />
                  </div>
                  
                  {/* Tarjeta principal */}
                  <div className="bg-gradient-to-b from-orange-600 to-yellow-400 rounded-3xl p-8 pt-12 text-center shadow-xl hover:shadow-2xl hover:transform hover:scale-105 transition-all duration-300 w-full max-w-sm -mt-10">
                    <h3 className="text-lg font-bold text-white mb-4">
                      {card.title}
                    </h3>
                    <p className="text-white/90 text-sm leading-relaxed mb-6 px-2">
                      {card.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-center mt-12">
          <button
            onClick={handleContactClick}
            className="bg-gradient-to-r from-orange-600 to-yellow-400 text-white px-8 py-4 rounded-full font-semibold hover:from-orange-700 hover:to-yellow-500 transition-all duration-300 shadow-lg"
          >
            <span>Contáctanos</span>
          </button>
        </div>
      </div>
    </section>
  );
};

export default AboutAgency;