import React, { useState } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import PriceChart from './PriceChart';
import FinancialCard from './FinancialCard';
import ReviewCard from './ReviewCard';

const API_BASE_URL = 'http://localhost:5000/api';

// --- COMPONENTS ---

const CircularProgress = ({ score, color }) => {
    const radius = 30;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center w-20 h-20">
            <svg className="transform -rotate-90 w-20 h-20">
                <circle cx="40" cy="40" r={radius} stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-700" />
                <circle cx="40" cy="40" r={radius} stroke={color} strokeWidth="8" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} className="transition-all duration-1000 ease-out" />
            </svg>
            <span className="absolute text-lg font-bold text-white">{score}%</span>
        </div>
    );
};

const SkeletonCard = () => (
    <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-6 w-full max-w-sm animate-pulse">
        <div className="h-6 bg-gray-600 rounded w-3/4 mb-4"></div>
        <div className="h-10 bg-gray-600 rounded w-1/2 mb-6"></div>
        <div className="h-10 bg-gray-600 rounded w-full"></div>
    </div>
);

const ProductSearch = () => {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState(null);
    const [aiAdvice, setAiAdvice] = useState(null);
    const [historyData, setHistoryData] = useState(null);
    const [financialData, setFinancialData] = useState(null);
    const [reviewData, setReviewData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploading(true);
        const formData = new FormData();
        formData.append('image', file);

        try {
            const res = await axios.post(`${API_BASE_URL}/search/visual`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (res.data.success) {
                setQuery(res.data.detectedQuery);
                // Automatically trigger search with the new query
                // We need to call the search logic, but handleSearch expects an event.
                // So we'll extract the search logic or just call it manually.
                // For simplicity, we'll just set the query and let the user click search, 
                // OR we can refactor handleSearch. 
                // Let's just trigger it by creating a synthetic event or refactoring.
                // Refactoring is better, but for now let's just call the API directly here to save time.
                
                // Trigger search immediately
                setLoading(true);
                setResults(null);
                setAiAdvice(null);
                setHistoryData(null);
                setFinancialData(null);
                setReviewData(null);
                setError('');

                const newQuery = res.data.detectedQuery;
                
                const response = await axios.get(`${API_BASE_URL}/search/live`, { params: { query: newQuery } });
                setResults(response.data.products || []);
                setAiAdvice(response.data.ai_advice);
                setFinancialData(response.data.financials);

                const historyRes = await axios.get(`${API_BASE_URL}/search/history`, { params: { query: newQuery } });
                setHistoryData(historyRes.data);

                // Fetch Review Data
                try {
                    const reviewRes = await axios.get(`${API_BASE_URL}/review`, { params: { query: newQuery } });
                    setReviewData(reviewRes.data);
                } catch (e) {
                    console.error("Review fetch failed", e);
                }
            }
        } catch (err) {
            console.error("Visual Search Failed", err);
            setError("Failed to identify image.");
        } finally {
            setUploading(false);
            setLoading(false);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        setLoading(true);
        setResults(null);
        setAiAdvice(null);
        setHistoryData(null);
        setFinancialData(null);
        setReviewData(null);
        setError('');
        
        try {
            const response = await axios.get(`${API_BASE_URL}/search/live`, { params: { query } });
            setResults(response.data.products || []);
            setAiAdvice(response.data.ai_advice);
            setFinancialData(response.data.financials);

            // Fetch History Data
            const historyRes = await axios.get(`${API_BASE_URL}/search/history`, { params: { query } });
            setHistoryData(historyRes.data);

            // Fetch Review Data
            try {
                const reviewRes = await axios.get(`${API_BASE_URL}/review`, { params: { query } });
                setReviewData(reviewRes.data);
            } catch (e) {
                console.error("Review fetch failed", e);
            }

        } catch (error) {
            console.error("API Call Failed:", error);
            setError('Failed to fetch results. Please try again.');
        } finally {
            setLoading(false);
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-900 text-white font-sans selection:bg-indigo-500 selection:text-white">
            
            {/* HERO SECTION */}
            <div className="flex flex-col items-center justify-center pt-20 pb-10 px-4">
                <motion.h1 
                    initial={{ opacity: 0, y: -20 }} 
                    animate={{ opacity: 1, y: 0 }} 
                    className="text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400 mb-8"
                >
                    ShopRadar AI
                </motion.h1>

                <form onSubmit={handleSearch} className="relative w-full max-w-2xl">
                    <input 
                        type="text" 
                        value={query} 
                        onChange={(e) => setQuery(e.target.value)} 
                        placeholder="Search for a product (e.g. iPhone 15, Dell Laptop)..."
                        className="w-full py-4 pl-6 pr-32 rounded-full bg-slate-800 border border-slate-600 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 outline-none text-lg shadow-xl transition-all placeholder-slate-400"
                    />
                    
                    {/* Visual Search Button */}
                    <label className="absolute right-28 top-2 bottom-2 flex items-center justify-center px-3 cursor-pointer text-slate-400 hover:text-indigo-400 transition-colors" title="Visual Search">
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading || loading} />
                        {uploading ? (
                            <div className="animate-spin h-5 w-5 border-2 border-indigo-500 border-t-transparent rounded-full"></div>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                        )}
                    </label>

                    <button 
                        type="submit" 
                        disabled={loading || uploading}
                        className="absolute right-2 top-2 bottom-2 px-6 bg-indigo-600 hover:bg-indigo-500 rounded-full font-semibold transition-colors shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Scanning...' : 'Search'}
                    </button>
                </form>
            </div>

            {/* ERROR MESSAGE */}
            {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-red-400 mb-8">
                    {error}
                </motion.div>
            )}

            {/* MAIN CONTENT */}
            <div className="max-w-7xl mx-auto px-4 pb-20">
                
                {/* LOADING SKELETONS */}
                {loading && (
                    <div className="flex flex-wrap justify-center gap-8 mt-10">
                        <SkeletonCard />
                        <SkeletonCard />
                    </div>
                )}

                {/* RESULTS */}
                {!loading && results && (
                    <AnimatePresence>
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            transition={{ duration: 0.5 }}
                            className="space-y-12"
                        >
                            
                            {/* AI DASHBOARD */}
                            {aiAdvice && (
                                <div className="bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl p-8 shadow-2xl">
                                    <div className="flex flex-col md:flex-row gap-8 items-center">
                                        
                                        {/* TRUST SCORES */}
                                        <div className="flex gap-8">
                                            <div className="flex flex-col items-center gap-2">
                                                <CircularProgress score={aiAdvice.amazon_trust_score || 0} color={aiAdvice.amazon_trust_score > 80 ? "#4ade80" : "#f87171"} />
                                                <span className="text-sm font-medium text-slate-400">Amazon Trust</span>
                                            </div>
                                            <div className="flex flex-col items-center gap-2">
                                                <CircularProgress score={aiAdvice.flipkart_trust_score || 0} color={aiAdvice.flipkart_trust_score > 80 ? "#4ade80" : "#f87171"} />
                                                <span className="text-sm font-medium text-slate-400">Flipkart Trust</span>
                                            </div>
                                        </div>

                                        {/* VERDICT */}
                                        <div className="flex-1 border-l border-slate-700 pl-8">
                                            <h2 className="text-2xl font-bold text-white mb-2">{aiAdvice.verdict_title}</h2>
                                            <p className="text-indigo-300 text-lg mb-4">{aiAdvice.recommendation}</p>
                                            
                                            <div className="space-y-2">
                                                {aiAdvice.key_differences && aiAdvice.key_differences.map((diff, i) => (
                                                    <div key={i} className="flex items-start gap-2 text-slate-300">
                                                        <span className="text-green-400 mt-1">✓</span>
                                                        <span>{diff}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* PRODUCT CARDS */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* AMAZON CARD */}
                                <ProductCard 
                                    product={results[0]} 
                                    retailer="Amazon" 
                                    color="text-orange-400" 
                                    btnColor="bg-orange-500 hover:bg-orange-600"
                                />
                                {/* FLIPKART CARD */}
                                <ProductCard 
                                    product={results[1]} 
                                    retailer="Flipkart" 
                                    color="text-blue-400" 
                                    btnColor="bg-blue-600 hover:bg-blue-700"
                                />
                            </div>

                            {/* PRICE HISTORY CHART */}
                            {historyData && (
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    <PriceChart data={historyData.graphData} prediction={historyData.prediction} />
                                </motion.div>
                            )}

                            {/* FINANCIAL INSIGHTS */}
                            {financialData && (
                                <FinancialCard data={financialData} />
                            )}

                            {/* YOUTUBE REVIEW & SENTIMENT */}
                            {reviewData && (
                                <ReviewCard review={reviewData} />
                            )}

                        </motion.div>
                    </AnimatePresence>
                )}
            </div>
        </div>
    );
};

const ProductCard = ({ product, retailer, color, btnColor }) => {
    if (!product) return null;
    const isFound = product.status !== 'error' && product.price !== 0;

    return (
        <motion.div 
            whileHover={{ scale: 1.02 }}
            className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl flex flex-col h-full relative overflow-hidden group"
        >
            {/* GLOW EFFECT */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-indigo-500/20"></div>

            <h3 className={`text-xl font-bold ${color} mb-4`}>{retailer}</h3>
            
            {isFound ? (
                <>
                    <h4 className="text-lg text-slate-200 font-medium leading-snug mb-4 flex-grow">
                        {product.title.length > 80 ? product.title.substring(0, 80) + '...' : product.title}
                    </h4>
                    
                    <div className="mt-auto">
                        <div className="flex flex-col mb-4">
                            <div className="flex items-baseline gap-2">
                                <span className="text-4xl font-bold text-white">₹{product.price.toLocaleString()}</span>
                            </div>
                            
                            {/* 🔥 EFFECTIVE PRICE SCANNER */}
                            {product.effective_price && product.effective_price < product.price && (
                                <motion.div 
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className="mt-2"
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-green-400 font-bold text-lg">
                                            Effective: ₹{product.effective_price.toLocaleString()}*
                                        </span>
                                        <span className="animate-pulse bg-green-500/20 text-green-300 text-xs px-2 py-0.5 rounded-full border border-green-500/30">
                                            Deal Detected
                                        </span>
                                    </div>
                                    <div className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                                        <span>🏷️</span>
                                        <span>{product.offer_text}</span>
                                    </div>
                                </motion.div>
                            )}
                        </div>

                        {/* TREND BADGE */}
                        {product.trend && (
                            <div className="inline-block px-3 py-1 rounded-md bg-slate-700 text-sm text-indigo-300 mb-6 border border-slate-600">
                                {product.trend}
                            </div>
                        )}

                        <a 
                            href={product.link} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className={`block w-full py-3 rounded-xl text-center font-bold text-white transition-all shadow-lg ${btnColor}`}
                        >
                            Buy Now
                        </a>
                    </div>
                </>
            ) : (
                <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                    <span className="text-4xl mb-2">😕</span>
                    <p>Product not found</p>
                </div>
            )}
        </motion.div>
    );
};

export default ProductSearch;