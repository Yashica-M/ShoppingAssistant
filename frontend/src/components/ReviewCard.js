import React from 'react';
import YouTube from 'react-youtube';
import { motion } from 'framer-motion';

const ReviewCard = ({ review }) => {
    if (!review) return null;

    const opts = {
        height: '100%',
        width: '100%',
        playerVars: {
            autoplay: 0,
        },
    };

    const sentimentColor = 
        review.sentiment === 'Positive' ? 'border-green-500 shadow-green-500/20' :
        review.sentiment === 'Negative' ? 'border-red-500 shadow-red-500/20' :
        'border-yellow-500 shadow-yellow-500/20';

    const sentimentText = 
        review.sentiment === 'Positive' ? 'text-green-400' :
        review.sentiment === 'Negative' ? 'text-red-400' :
        'text-yellow-400';

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="mt-12 bg-slate-800/50 backdrop-blur-lg border border-slate-700 rounded-2xl overflow-hidden shadow-2xl"
        >
            <div className="flex flex-col md:flex-row">
                {/* VIDEO SECTION */}
                <div className="w-full md:w-2/3 aspect-video bg-black">
                    <YouTube videoId={review.videoId} opts={opts} className="w-full h-full" />
                </div>

                {/* AI VERDICT SECTION */}
                <div className="w-full md:w-1/3 p-8 flex flex-col justify-center relative overflow-hidden">
                    {/* Background Glow */}
                    <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${
                        review.sentiment === 'Positive' ? 'from-green-500 to-transparent' :
                        review.sentiment === 'Negative' ? 'from-red-500 to-transparent' :
                        'from-yellow-500 to-transparent'
                    }`}></div>

                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <span className="text-2xl">🤖</span>
                            <h3 className="text-xl font-bold text-white">AI Summarized Verdict</h3>
                        </div>

                        <div className={`p-6 rounded-xl border bg-slate-900/50 backdrop-blur-sm shadow-lg ${sentimentColor}`}>
                            <p className={`text-lg font-bold mb-2 ${sentimentText}`}>
                                {review.sentiment} Sentiment
                            </p>
                            <p className="text-slate-300 italic leading-relaxed">
                                "{review.ai_summary}"
                            </p>
                        </div>

                        <div className="mt-6">
                            <p className="text-sm text-slate-500 mb-1">Video Title</p>
                            <p className="text-slate-300 text-sm line-clamp-2">{review.title}</p>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};

export default ReviewCard;
