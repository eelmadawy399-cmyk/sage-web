// SAGE Egypt - Configuration
var CONFIG = {
    CLIENT_ID: '797969199055-d3ma5fcpdpbko3bgp9sptbrrl0t98dcs.apps.googleusercontent.com',
    PROJECT_ID: 'sage2-egypt-project',
    SCOPES: [
        'https://www.googleapis.com/auth/earthengine',
        'https://www.googleapis.com/auth/devstorage.read_only'
    ],
    MAP_CENTER: [26.8, 30.8],  // Egypt center [lat, lng]
    MAP_ZOOM: 6,
    DEFAULT_BUFFER: 500,  // meters

    // SUBSCRIPTION & LIMITS
    SUBSCRIPTION: {
        FREE_ANALYSIS_LIMIT: 3,        // Per Month (simulated)
        FREE_RESEARCH_LIMIT: 5,        // Per Session
        PREMIUM_FEATURES: [
            'anomalies',
            'benchmarking',
            'growth_harvest',
            'advanced_soil',
            'change_detection'
        ]
    }
};
