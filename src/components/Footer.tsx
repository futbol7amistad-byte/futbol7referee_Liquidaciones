import React from 'react';

export default function Footer() {
  return (
    <footer className="w-full py-8 px-4 mt-auto border-t border-gray-100 bg-white/50">
      <div className="max-w-7xl mx-auto text-center">
        <p className="text-[10px] md:text-xs font-bold text-gray-400 tracking-widest leading-relaxed">
          LiquidF7 Pro Ver. 2.0 <span className="mx-1 md:mx-2 text-gray-200">|</span> 
          Elaborado por Frank González <span className="mx-1 md:mx-2 text-gray-200">|</span> 
          Propiedad de Futbol 7 La Amistad <span className="mx-1 md:mx-2 text-gray-200">|</span> 
          SC de Tenerife <span className="mx-1 md:mx-2 text-gray-200">|</span> 
          © Derechos Reservados
        </p>
      </div>
    </footer>
  );
}
