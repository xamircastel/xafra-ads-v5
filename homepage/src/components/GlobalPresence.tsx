import React from 'react';

const GlobalPresence = () => {
  const countries = [
    { 
      name: 'Colombia', 
      code: 'CO',
      position: { top: '45%', left: '32%' }, 
      campaigns: 50,
      bgColor: 'bg-orange-500',
    },
    { 
      name: 'Ecuador', 
      code: 'EC',
      position: { top: '50%', left: '30%' }, 
      campaigns: 29,
      bgColor: 'bg-pink-500',
    },
    { 
      name: 'Perú', 
      code: 'PE',
      position: { top: '58%', left: '28%' }, 
      campaigns: 54,
      bgColor: 'bg-purple-500',
    },
    { 
      name: 'Chile', 
      code: 'CL',
      position: { top: '75%', left: '30%' }, 
      campaigns: 57,
      bgColor: 'bg-blue-500',
    },
    { 
      name: 'Costa Rica', 
      code: 'CR',
      position: { top: '38%', left: '28%' }, 
      campaigns: 31,
      bgColor: 'bg-orange-500',
    },
    { 
      name: 'México', 
      code: 'MX',
      position: { top: '25%', left: '25%' }, 
      campaigns: 42,
      bgColor: 'bg-pink-500',
    }
  ];

  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Nuestra Presencia Global
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Operamos en 6 países de Latinoamérica, conectando marcas con audiencias locales 
            a través de estrategias culturalmente relevantes.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Mapa */}
          <div className="relative bg-gradient-to-br from-blue-50 to-indigo-100 rounded-3xl p-8">
            <div className="relative w-full h-[500px] bg-white rounded-2xl overflow-hidden flex items-center justify-center">
              <img 
                src="/16839355-continentes-e-oceanos-simples-e-coloridos-do-mapa-do-mundo-gratis-vetor.jpg" 
                alt="Mapa Mundial" 
                className="w-full h-full object-contain"
              />

              {/* Country markers */}
              {countries.map((country, index) => (
                <div
                  key={index}
                  className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                  style={{ top: country.position.top, left: country.position.left }}
                >
                  <div className="relative">
                    {/* Pin marker */}
                    <div className="w-6 h-8 bg-gradient-to-b from-orange-400 to-orange-600 rounded-t-full rounded-b-sm shadow-lg relative">
                      <div className="absolute top-1.5 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    {/* Tooltip */}
                    <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-white px-3 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap z-10">
                      <span className="text-sm font-semibold text-gray-800">{country.name}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tarjetas de países con diseño de la imagen */}
          <div className="grid grid-cols-2 gap-6">
            {countries.map((country, index) => (
              <div key={index} className="bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center justify-center min-h-[280px]">
                {/* Gráfico circular */}
                <div className="relative w-32 h-32 mb-6">
                  {/* Círculo de fondo */}
                  <div className="absolute inset-0 rounded-full border-8 border-gray-200"></div>
                  {/* Círculo de progreso */}
                  <div 
                    className={`absolute inset-0 rounded-full border-8 border-transparent`}
                    style={{
                      borderTopColor: country.bgColor.includes('orange') ? '#f97316' : 
                                    country.bgColor.includes('pink') ? '#ec4899' :
                                    country.bgColor.includes('purple') ? '#a855f7' :
                                    country.bgColor.includes('blue') ? '#3b82f6' : '#f97316',
                      transform: `rotate(-90deg)`,
                      borderRightColor: country.bgColor.includes('orange') ? '#f97316' : 
                                      country.bgColor.includes('pink') ? '#ec4899' :
                                      country.bgColor.includes('purple') ? '#a855f7' :
                                      country.bgColor.includes('blue') ? '#3b82f6' : '#f97316',
                    }}
                  ></div>
                  {/* Porcentaje en el centro */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold text-gray-800">
                      {Math.round((country.campaigns / 60) * 100)}%
                    </span>
                  </div>
                </div>
                
                {/* Contenido */}
                <div className="text-center">
                  <h3 className="font-bold text-xl text-gray-800 mb-2">{country.name}</h3>
                  <p className="text-gray-500 text-sm mb-2">Campañas Activas</p>
                  <p className="text-3xl font-bold text-gray-800">{country.campaigns}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 text-center">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">6</div>
              <div className="text-gray-600">Países</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">50M+</div>
              <div className="text-gray-600">Usuarios Alcanzados</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600 mb-2">1000+</div>
              <div className="text-gray-600">Campañas Activas</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobalPresence;