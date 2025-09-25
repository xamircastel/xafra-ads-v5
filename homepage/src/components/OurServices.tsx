import React from 'react';
import { Smartphone, Users, DollarSign, Award, Megaphone } from 'lucide-react';

const OurServices = () => {
  const services = [
    {
      icon: Smartphone,
      circleColor: "bg-orange-500",
      title: "Contenido Móvil MVAS",
      description: "Servicios de valor agregado móvil con contenido premium y suscripciones optimizadas para diferentes operadores.",
    },
    {
      icon: Users,
      circleColor: "bg-yellow-400",
      title: "Videos",
      description: "Producción y distribución de contenido audiovisual para campañas publicitarias y marketing de contenidos.",
    },
    {
      icon: DollarSign,
      circleColor: "bg-orange-500",
      title: "Juegos",
      description: "Marketing especializado en gaming, desde juegos móviles hasta plataformas de entretenimiento interactivo.",
    },
    {
      icon: Award,
      circleColor: "bg-yellow-400",
      title: "Venta de Bienes Raíces",
      description: "Estrategias digitales especializadas para el sector inmobiliario, generando leads calificados y ventas efectivas.",
    },
    {
      icon: Megaphone,
      circleColor: "bg-orange-500",
      title: "Entretenimiento",
      description: "Campañas para la industria del entretenimiento, música, eventos y plataformas de streaming.",
    }
  ];

  return (
    <section id="ofertas" className="py-20 bg-gray-600 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-white mb-4">
            Nuestros Servicios
          </h2>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Ofrecemos soluciones especializadas en diferentes verticales de marketing digital, 
            adaptadas a las necesidades específicas de cada industria.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {services.map((service, index) => {
            const IconComponent = service.icon;
            return (
              <div key={index} className="relative group flex flex-col items-center">
                {/* Círculo superior */}
                <div className={`w-20 h-20 ${service.circleColor} rounded-full flex items-center justify-center shadow-lg mb-4 relative z-10`}>
                  <IconComponent className="w-8 h-8 text-white" />
                </div>
                
                {/* Tarjeta rectangular */}
                <div className="bg-gradient-to-br from-orange-600 to-yellow-400 rounded-2xl p-6 text-white shadow-xl hover:shadow-2xl transition-all duration-300 group-hover:transform group-hover:scale-105 w-full max-w-sm">
                  <h3 className="text-xl font-bold text-white mb-4">
                    {service.title}
                  </h3>
                  <p className="text-orange-100 leading-relaxed mb-6 text-sm">
                    {service.description}
                  </p>
                  <button className="bg-gradient-to-r from-orange-600 to-yellow-400 text-white px-6 py-2 rounded-full font-semibold hover:from-orange-700 hover:to-yellow-500 transition-all duration-300 shadow-lg flex items-center space-x-2">
                    <span>Saber más</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default OurServices;