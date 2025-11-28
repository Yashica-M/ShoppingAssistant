const express = require('express');
const router = express.Router();
const { getYouTubeReview } = require('../services/youtubeService');

router.get('/', async (req, res) => {
    const { query } = req.query;
    if (!query) return res.status(400).json({ error: 'Query required' });

    try {
        const reviewData = await getYouTubeReview(query);
        if (!reviewData) {
            return res.status(404).json({ message: 'No review found' });
        }
        res.json(reviewData);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch review' });
    }
});

module.exports = router;
