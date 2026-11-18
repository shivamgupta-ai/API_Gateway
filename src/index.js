const express = require('express');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');
const rateLimit = require('express-rate-limit');
const axios = require('axios');
require('dotenv').config();

const app = express();

const PORT = process.env.PORT || 3004;
const AUTH_SERVICE_PATH = process.env.AUTH_SERVICE_PATH || 'http://localhost:3001';

// Rate limiter - limit each IP to 5 requests per 2 minutes
const limiter = rateLimit({
    windowMs: 2 * 60 * 1000, // 2 minutes
    limit: 5,
});

// Middleware
app.use(morgan('combined'));
app.use(limiter);

// Authentication middleware for protected routes
app.use('/bookingservice', async (req, res, next) => {
    console.log(req.headers['x-access-token']);

    try {
        const response = await axios.get(`${AUTH_SERVICE_PATH}/api/v1/isAuthenticated`, {
            headers: {
                'x-access-token': req.headers['x-access-token']
            }
        });
        console.log(response.data);
        if (response.data.success) {
            next();
        } else {
            res.status(401).json({
                message: 'Unauthorised'
            });
        }
    } catch (error) {
        return res.status(401).json({
            message: 'Unauthorised'
        });
    }
});

// Proxy to BookingService (port 3002)
app.use('/bookingservice', createProxyMiddleware({
    target: 'http://localhost:3002',
    changeOrigin: true
}));

// Proxy to FlightsAndSearch (port 3000) - no auth required for search
app.use('/flightservice', createProxyMiddleware({
    target: 'http://localhost:3000',
    changeOrigin: true
}));

// Health check
app.get('/home', (req, res) => {
    return res.status(200).json({
        message: 'OK'
    });
});

app.listen(PORT, () => {
    console.log(`API Gateway started at Port: ${PORT}`);
});
