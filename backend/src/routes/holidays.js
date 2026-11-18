
const router = require('express').Router();
const { authenticateToken } = require('../middleware/auth');

router.use(authenticateToken);

// Cache holidays by year
const cache = new Map();

// GET /api/holidays/:year
router.get('/:year', async (req, res) => {
    const yearText = req.params.year;

    // Validate year
    if (!/^\d{4}$/.test(yearText)) {
        return res.status(400).json({
            success: false,
            data: [],
            message: 'Invalid year'
        });
    }

    const year = Number(yearText);

    if (year < 2000 || year > 2100) {
        return res.status(400).json({
            success: false,
            data: [],
            message: 'Invalid year'
        });
    }

    // Return cached holidays if available
    if (cache.has(year)) {
        return res.json({
            success: true,
            data: cache.get(year),
            message: 'Holidays loaded (cached)'
        });
    }

    try {
        // TEMPORARY INVALID URL FOR FAILURE TESTING
        const response = await fetch(
            'https://date.nager.at/api/v3/PublicHolidays/' + year + '/PH',
            {
                signal: AbortSignal.timeout(5000)
            }
        );

        if (!response.ok) {
            throw new Error(
                `External API returned status ${response.status}`
            );
        }

        const result = await response.json();

        const holidays = result.map(holiday => ({
            date: holiday.date,
            name: holiday.name
        }));

        cache.set(year, holidays);

        return res.json({
            success: true,
            data: holidays,
            message: 'Holidays loaded'
        });

    } catch (error) {
        console.error('Holiday API failed:', error.message);

        return res.status(502).json({
            success: false,
            data: [],
            message: 'Holiday service unavailable'
        });
    }
});

module.exports = router;
