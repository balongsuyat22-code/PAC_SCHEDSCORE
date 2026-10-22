const fs = require('fs');

const getDatabaseSslConfig = () => {
    if (process.env.DB_SSL !== 'true') return undefined;

    const caPath = process.env.DB_CA_CERT_PATH;
    const ca = caPath
        ? fs.readFileSync(caPath, 'utf8')
        : process.env.DB_CA_CERT?.replace(/\\n/g, '\n');

    return {
        rejectUnauthorized: true,
        minVersion: 'TLSv1.2',
        ...(ca ? { ca } : {}),
    };
};

module.exports = { getDatabaseSslConfig };
