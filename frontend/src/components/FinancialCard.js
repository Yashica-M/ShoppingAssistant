import React from 'react';
import { motion } from 'framer-motion';

const FinancialCard = ({ data }) => {
    if (!data) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumSignificantDigits: 3
        }).format(amount);
    };

    // Calculate retained percentage for the progress bar
    const retainedPercentage = 100 - data.depreciationRate;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">💰 True Cost Analysis</h3>
                {data.isHighResale && (
                    <span className="px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-sm font-bold">
                        💎 High Resale Value Item
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* RESALE VALUE CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Resale Value (2yr)</p>
                    <div className="text-3xl font-bold text-green-400 mb-1">
                        {formatCurrency(data.resaleValue)}
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-green-500 h-full rounded-full" 
                            style={{ width: `${retainedPercentage}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Retains ~{retainedPercentage}% of value
                    </p>
                </div>

                {/* NET OWNERSHIP COST CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Net Ownership Cost</p>
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                        {formatCurrency(data.netCost)}
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Total cost after resale
                    </p>
                </div>

                {/* REAL COST PER DAY CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Real Cost Per Day</p>
                    <div className="text-3xl font-bold text-white mb-1">
                        {formatCurrency(data.dailyCost)}<span className="text-lg text-slate-500 font-normal">/day</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Based on 2-year usage
                    </p>
                </div>

            </div>
        </motion.div>
    );
};

export default FinancialCard;
