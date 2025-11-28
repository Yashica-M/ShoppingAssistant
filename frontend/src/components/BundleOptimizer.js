import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';

const API_BASE_URL = 'http://localhost:5000/api';

const BundleOptimizer = () => {
    const [items, setItems] = useState(['', '', '']);
    const [results, setResults] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleItemChange = (index, value) => {
        const newItems = [...items];
        newItems[index] = value;
        setItems(newItems);
    };

    const addItem = () => setItems([...items, '']);
    const removeItem = (index) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleOptimize = async () => {
        const validItems = items.filter(i => i.trim() !== '');
        if (validItems.length === 0) return;

        setLoading(true);
        setResults(null);

        try {
            const response = await axios.post(`${API_BASE_URL}/search/bundle`, { items: validItems });
            setResults(response.data);
        } catch (error) {
            console.error("Bundle Search Failed:", error);
        } finally {
            setLoading(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount === 'N/A') return 'N/A';
        return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumSignificantDigits: 3 }).format(amount);
    };

    const PriceDisplay = ({ title, amount, color, children }) => (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 text-center">
            <p className="text-slate-400 text-sm">{title}</p>
            {typeof amount === 'number' ? (
                <p className="text-2xl font-bold" style={{ color }}>{formatCurrency(amount)}</p>
            ) : (
                <p className="text-xl font-bold text-red-400">⚠️ {String(amount)}</p>
            )}
            {children}
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-900 text-white p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-4xl font-extrabold text-center mb-8 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-400"
                >
                    📦 Smart Bundle Optimizer
                </motion.h1>

                {/* INPUT SECTION */}
                <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 mb-8 shadow-xl">
                    <h3 className="text-xl font-bold mb-4 text-slate-300">Build Your Cart</h3>
                    <div className="space-y-4">
                        {items.map((item, index) => (
                            <div key={index} className="flex gap-4">
                                <input 
                                    type="text" 
                                    value={item}
                                    onChange={(e) => handleItemChange(index, e.target.value)}
                                    placeholder={`Item ${index + 1} (e.g. Mouse)`}
                                    className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-4 py-3 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                />
                                {items.length > 1 && (
                                    <button 
                                        onClick={() => removeItem(index)}
                                        className="px-4 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                                    >
                                        ✕
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-4 mt-6">
                        <button 
                            onClick={addItem}
                            className="px-6 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg font-semibold transition-colors"
                        >
                            + Add Item
                        </button>
                        <button 
                            onClick={handleOptimize}
                            disabled={loading}
                            className="flex-1 px-6 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold shadow-lg shadow-purple-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Optimizing Bundle...' : '🚀 Optimize My Savings'}
                        </button>
                    </div>
                </div>

                {/* RESULTS SECTION */}
                {results && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        {/* SUMMARY CARDS */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <PriceDisplay title="Amazon Total" amount={typeof results.amazonTotal === 'number' ? results.amazonTotal : results.amazonTotal} color="#f97316" />
                            <PriceDisplay title="Flipkart Total" amount={typeof results.flipkartTotal === 'number' ? results.flipkartTotal : results.flipkartTotal} color="#3b82f6" />
                            <PriceDisplay title="Smart Split (Cheapest)" amount={typeof results.smartSplitTotal === 'number' ? results.smartSplitTotal : results.smartSplitTotal} color="#a855f7">
                                {results.savings > 0 && typeof results.savings === 'number' && (
                                    <div className="mt-2 inline-block px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-bold">
                                        Save {formatCurrency(results.savings)}!
                                    </div>
                                )}
                            </PriceDisplay>
                        </div>

                        {/* STRATEGY TABLE */}
                        <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-700/50 text-slate-300">
                                        <th className="p-4 font-semibold">Item</th>
                                        <th className="p-4 font-semibold">Best Store</th>
                                        <th className="p-4 font-semibold">Price</th>
                                        <th className="p-4 font-semibold">Link</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-700">
                                    {results.strategy.map((row, i) => (
                                        <tr key={i} className="hover:bg-slate-700/30 transition-colors">
                                            <td className="p-4 font-medium">{row.item}</td>
                                            <td className={`p-4 ${row.buyFrom === 'Amazon' ? 'text-orange-300 font-bold' : row.buyFrom === 'Flipkart' ? 'text-blue-300 font-bold' : 'text-slate-400'}`}>
                                                {row.buyFrom}
                                            </td>
                                            <td className="p-4">
                                                {typeof row.price === 'number' ? `₹${row.price.toLocaleString('en-IN')}` : String(row.price)}
                                            </td>
                                            <td className="p-4">
                                                {row.link ? (
                                                    <a href={row.link} target="_blank" rel="noreferrer" className="text-indigo-300 hover:underline">View</a>
                                                ) : (
                                                    '—'
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};

export default BundleOptimizer;