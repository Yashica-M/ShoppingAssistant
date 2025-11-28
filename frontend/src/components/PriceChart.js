import React from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

const PriceChart = ({ data, prediction }) => {
  if (!data || data.length === 0) return null;

  // FIXED FORMATTER: Handles NaN or undefined safely
  const formatPrice = (price) => {
    if (!price || isNaN(price)) return "Calculated soon...";
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(price);
  };

  return (
    <div className="mt-8 p-6 rounded-2xl border border-white/10 bg-[#1e293b]/50 backdrop-blur-md shadow-xl">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h3 className="text-2xl font-bold text-white">Price History & Forecast</h3>
            <p className="text-gray-400 text-sm">Historical trend analysis based on market data.</p>
        </div>
        
        {/* 🔥 NEW PREDICTION BADGE */}
        {prediction && (
            <div className={`px-6 py-3 rounded-xl border flex flex-col items-end ${
                prediction.advice === "WAIT" 
                ? "bg-orange-500/10 border-orange-500/30 text-orange-300" 
                : "bg-green-500/10 border-green-500/30 text-green-300"
            }`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-80">AI Recommendation</span>
                <span className="text-xl font-extrabold">{prediction.advice}</span>
            </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* CHART SECTION (Takes up 2 columns) */}
        <div className="lg:col-span-2 h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
              <XAxis dataKey="date" stroke="#94a3b8" tickLine={false} axisLine={false} dy={10} />
              <YAxis domain={['auto', 'auto']} stroke="#94a3b8" tickLine={false} axisLine={false} tickFormatter={(val)=>`₹${val/1000}k`} dx={-10}/>
              <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none' }} itemStyle={{ color: '#60a5fa' }} />
              <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* 📊 NEW STATS PANEL (Takes up 1 column) */}
        <div className="bg-white/5 rounded-xl p-6 border border-white/5 flex flex-col justify-center space-y-6">
            
            {/* Predicted Price */}
            <div>
                <p className="text-gray-400 text-sm mb-1">Predicted Minimum Price</p>
                <div className="text-3xl font-bold text-white">
                    {formatPrice(prediction.predictedPrice)}
                </div>
                <p className="text-xs text-gray-500 mt-1">Expected within 7 days</p>
            </div>

            {/* Potential Savings */}
            {prediction.potentialSavings > 0 ? (
                <div>
                    <p className="text-gray-400 text-sm mb-1">Potential Savings</p>
                    <div className="text-2xl font-bold text-green-400">
                        {formatPrice(prediction.potentialSavings)}
                    </div>
                    <p className="text-xs text-green-500/70 mt-1">If you wait for the drop</p>
                </div>
            ) : (
                <div>
                    <p className="text-gray-400 text-sm mb-1">Current Status</p>
                    <div className="text-xl font-bold text-blue-400">Lowest Price</div>
                    <p className="text-xs text-blue-500/70 mt-1">Best time to buy is now</p>
                </div>
            )}

            <div className="h-px bg-white/10 w-full"></div>

            <p className="text-xs text-gray-500 italic">
                "The price is likely to drop. You could save approximately {formatPrice(prediction.potentialSavings)} by waiting."
            </p>
        </div>

      </div>
    </div>
  );
};

export default PriceChart;