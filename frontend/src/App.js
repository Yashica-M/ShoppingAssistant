import React, { useState } from 'react';
import ProductSearch from './components/ProductSearch';
// import BundleOptimizer from './components/BundleOptimizer';

function App() {
  const [view, setView] = useState('search');

  return (
    <div className="bg-slate-900 min-h-screen text-white">
      {/* Navigation Removed */}
      {/* <nav className="p-4 border-b border-slate-700 bg-slate-800/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
            PriceAggregator Pro
          </div>
          <div className="flex gap-4">
            <button 
              onClick={() => setView('search')}
              className={`px-4 py-2 rounded-lg transition-all ${view === 'search' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              Single Search
            </button>
            <button 
              onClick={() => setView('bundle')}
              className={`px-4 py-2 rounded-lg transition-all ${view === 'bundle' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
            >
              Bundle Optimizer
            </button>
          </div>
        </div>
      </nav> */}

      {/* Main Content */}
      <main>
        {/* {view === 'search' ? <ProductSearch /> : <BundleOptimizer />} */}
        <ProductSearch />
      </main>
    </div>
  );
}

export default App;
