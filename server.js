require('dotenv').config();
const express = require('express');
const axios = require('axios');
const app = express();

// --- CONFIGURATION ---
// Using process.env.PORT is mandatory for Render deployment
const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GOOGLE_BOOKS_API_KEY;

app.set('view engine', 'ejs');
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

/**
 * HOME ROUTE
 * Fetches multiple genres in parallel.
 */
app.get('/', async (req, res) => {
    // Safety check for Render Environment Variables
    if (!API_KEY) {
        console.error("CRITICAL: GOOGLE_BOOKS_API_KEY is missing!");
        return res.render('index', { 
            genreData: {}, 
            books: null, 
            error: "API Key is missing. Please check Render Environment Variables.", 
            isHomePage: true 
        });
    }

    const genres = ['Fiction', 'Technology', 'Science', 'History', 'Business', 'Philosophy'];
    const genreData = {};

    try {
        // Parallel execution for high performance
        await Promise.all(genres.map(async (genre) => {
            const url = `https://www.googleapis.com/books/v1/volumes?q=subject:${genre}&maxResults=4&key=${API_KEY}`;
            const response = await axios.get(url, { timeout: 4000 });
            genreData[genre] = response.data.items || [];
        }));

        res.render('index', { 
            genreData: genreData, 
            books: null, 
            error: null, 
            isHomePage: true 
        });
    } catch (error) {
        console.error("Home Page API Error:", error.message);
        res.render('index', { 
            genreData: {}, 
            books: null, 
            error: "Failed to load featured books. Please try again later.", 
            isHomePage: true 
        });
    }
});

/**
 * SEARCH ROUTE
 */
app.post('/search', async (req, res) => {
    const bookName = req.body.book_name;
    
    if (!bookName || bookName.trim() === "") {
        return res.render('index', { books: null, error: "Please enter a search term.", isHomePage: false });
    }

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(bookName)}&maxResults=12&key=${API_KEY}`;

    try {
        const response = await axios.get(url, { timeout: 5000 });
        const books = response.data.items || [];
        
        if (books.length === 0) {
            return res.render('index', { 
                books: [], 
                error: `No results found for "${bookName}".`, 
                isHomePage: false 
            });
        }
        
        res.render('index', { books: books, error: null, isHomePage: false });
    } catch (error) {
        console.error("Search Error:", error.message);
        res.render('index', { 
            books: null, 
            error: "The search service is currently unavailable.", 
            isHomePage: false 
        });
    }
});

/**
 * LIVE SUGGESTIONS API
 */
app.get('/api/suggestions', async (req, res) => {
    const query = req.query.q;
    if (!query || query.length < 3) return res.json([]);

    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=5&key=${API_KEY}`;
    
    try {
        const response = await axios.get(url, { timeout: 3000 });
        const items = response.data.items || [];
        const suggestions = items.map(book => ({
            title: book.volumeInfo.title,
            author: book.volumeInfo.authors ? book.volumeInfo.authors[0] : 'Unknown',
            link: book.volumeInfo.infoLink
        }));
        res.json(suggestions);
    } catch (error) {
        console.error("Suggestion API Error:", error.message);
        res.status(500).json([]);
    }
});

/**
 * DOCUMENTATION ROUTE
 */
app.get('/docs', (req, res) => {
    res.render('docs');
});

/**
 * 404 CATCH-ALL
 */
app.use((req, res) => {
    res.status(404).send("Page not found. Use the Navigation to return home.");
});

// --- SERVER INITIALIZATION ---
app.listen(PORT, () => {
    console.log(`
    ========================================
    LIVE ON RENDER: http://localhost:${PORT}
    PROJECT: BookFinder Pro (OLIPT1)
    DEVELOPER: Joseph Amandy
    ========================================
    `);
});