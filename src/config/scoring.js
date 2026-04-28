require('dotenv').config();

const SCORING = {
    RANKS: {
        1: { points: parseInt(process.env.POINTS_1ST_PLACE) || 10, medal: 'gold' },
        2: { points: parseInt(process.env.POINTS_2ND_PLACE) || 7, medal: 'silver' },
        3: { points: parseInt(process.env.POINTS_3RD_PLACE) || 5, medal: 'bronze' },
        participation: { points: parseInt(process.env.POINTS_PARTICIPATION) || 2, medal: 'participation' },
    },
    getPointsForRank: (rank) => {
        if (rank === 1) return SCORING.RANKS[1].points;
        if (rank === 2) return SCORING.RANKS[2].points;
        if (rank === 3) return SCORING.RANKS[3].points;
        return SCORING.RANKS.participation.points;
    },
    getMedalForRank: (rank) => {
        if (rank === 1) return 'gold';
        if (rank === 2) return 'silver';
        if (rank === 3) return 'bronze';
        return 'participation';
    },
};

module.exports = SCORING;