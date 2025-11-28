import React from 'react';
import { motion } from 'framer-motion';

const FinancialInsights = ({ data }) => {
    if (!data) return null;

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumSignificantDigits: 3
        }).format(amount);
    };

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="mt-8 bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl"
        >
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-white">💰 True Cost of Ownership</h3>
                {data.isHighResale && (
                    <span className="px-4 py-1 rounded-full bg-yellow-500/20 text-yellow-300 border border-yellow-500/30 text-sm font-bold">
                        ⭐ High Resale Value Item
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                
                {/* DAILY COST CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Real Daily Cost</p>
                    <div className="text-3xl font-bold text-white mb-1">
                        {formatCurrency(data.dailyCost)}<span className="text-lg text-slate-500 font-normal">/day</span>
                    </div>
                    <p className="text-xs text-slate-500">
                        Based on 2-year usage & resale value. Cheaper than a coffee! ☕
                    </p>
                </div>

                {/* RESALE VALUE CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Est. Resale Value (2 Years)</p>
                    <div className="text-3xl font-bold text-green-400 mb-1">
                        {formatCurrency(data.resaleValue)}
                    </div>
                    <div className="w-full bg-slate-700 h-2 rounded-full mt-3 overflow-hidden">
                        <div 
                            className="bg-green-500 h-full rounded-full" 
                            style={{ width: `${(1 - (data.depreciationRate / 100)) * 100}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                        Retains ~{100 - data.depreciationRate}% of value
                    </p>
                </div>

                {/* EMI CARD */}
                <div className="bg-slate-700/30 rounded-xl p-6 border border-slate-600/50">
                    <p className="text-slate-400 text-sm mb-2">Estimated EMI (12 Months)</p>
                    <div className="text-3xl font-bold text-blue-400 mb-1">
                        {formatCurrency(data.monthlyEMI)}<span className="text-lg text-slate-500 font-normal">/mo</span>
                    </div>
                    <p className="text-xs text-slate-500">
                        Approx. @ 14% p.a. interest
                    </p>
                </div>

            </div>
        </motion.div>
    );
};

export default FinancialInsights;