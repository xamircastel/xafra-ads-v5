import React from 'react';
import Header from './components/Header';
import Hero from './components/Hero';
import AboutAgency from './components/AboutAgency';
import OurServices from './components/OurServices';
import GlobalPresence from './components/GlobalPresence';
import Footer from './components/Footer';

function App() {
  return (
    <div className="min-h-screen bg-white">
      <Header />
      <Hero />
      <AboutAgency />
      <OurServices />
      <GlobalPresence />
      <Footer />
    </div>
  );
}

export default App;