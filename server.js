const express = require('express');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// CORS configuration
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST'],
    allowedHeaders: ['Content-Type'],
    credentials: true
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        error: 'Server Error',
        message: 'Something went wrong! Please try again later.'
    });
});

// Function to clean song title
function cleanSongTitle(title) {
    return title
        .replace(/\([^)]*\)/g, '') // Remove anything in parentheses
        .replace(/\[[^\]]*\]/g, '') // Remove anything in square brackets
        .replace(/[^\w\s]/g, '') // Remove special characters
        .trim();
}

// API endpoint to fetch lyrics
app.post('/api/lyrics', async (req, res) => {
    try {
        const { song } = req.body;
        
        if (!song || typeof song !== 'string') {
            return res.status(400).json({
                error: 'Invalid input',
                message: 'Please provide a valid song name'
            });
        }

        const cleanedSong = cleanSongTitle(song);
        
        // First, search for the song to get artist and title
        const searchResponse = await axios.get(`https://api.lyrics.ovh/suggest/${encodeURIComponent(cleanedSong)}`, {
            timeout: 10000, // 10 second timeout
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LyricalAI/1.0'
            }
        });
        
        if (!searchResponse.data || !searchResponse.data.data || searchResponse.data.data.length === 0) {
            return res.json({ 
                error: 'Song not found',
                message: 'Sorry, I couldn\'t find that song. Please try another one.'
            });
        }

        const firstResult = searchResponse.data.data[0];
        const artist = encodeURIComponent(firstResult.artist.name);
        const title = encodeURIComponent(cleanSongTitle(firstResult.title));
        
        // Now fetch the lyrics using the correct format
        const lyricsResponse = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${title}`, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LyricalAI/1.0'
            }
        });
        
        if (lyricsResponse.data.lyrics) {
            return res.json({ 
                lyrics: lyricsResponse.data.lyrics,
                artist: firstResult.artist.name,
                title: firstResult.title
            });
        }

        // Try alternative search if first attempt fails
        const alternativeResponse = await axios.get(`https://api.lyrics.ovh/v1/${artist}/${encodeURIComponent(firstResult.title)}`, {
            timeout: 10000,
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'LyricalAI/1.0'
            }
        });
        
        if (alternativeResponse.data.lyrics) {
            return res.json({ 
                lyrics: alternativeResponse.data.lyrics,
                artist: firstResult.artist.name,
                title: firstResult.title
            });
        }

        return res.json({ 
            error: 'Lyrics not found',
            message: 'Sorry, I couldn\'t find the lyrics for this song. Please try another one.'
        });

    } catch (error) {
        console.error('Error fetching lyrics:', error);
        
        if (error.code === 'ECONNABORTED') {
            return res.status(504).json({ 
                error: 'Timeout',
                message: 'The request took too long. Please try again.'
            });
        }

        if (error.response) {
            return res.status(error.response.status).json({ 
                error: 'API Error',
                message: 'There was an error with the lyrics service. Please try again later.'
            });
        }

        return res.status(500).json({ 
            error: 'Server Error',
            message: 'There was an error processing your request. Please try again.'
        });
    }
});

// Serve the main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
});
