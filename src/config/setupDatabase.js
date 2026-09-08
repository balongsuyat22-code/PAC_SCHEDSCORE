
require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const buildConnectionOptions = () => {
    if (process.env.MYSQL_URL) {
        return { uri: process.env.MYSQL_URL, multipleStatements: true };
    }
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('mysql')) {
        return { uri: process.env.DATABASE_URL, multipleStatements: true };
    }

    return {
        host: process.env.DB_HOST || process.env.MYSQLHOST || 'localhost',
        port: Number(process.env.DB_PORT || process.env.MYSQLPORT || 3306),
        user: process.env.DB_USER || process.env.MYSQLUSER || 'root',
        password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || '',
        multipleStatements: true,
    };
};

const run = async () => {
    let conn;
    try {
        const dbName =
            process.env.DB_NAME ||
            process.env.MYSQLDATABASE ||
            'sportfest_db';

        console.log('🔧 Connecting to MySQL...');
        console.log('  host:', process.env.DB_HOST || process.env.MYSQLHOST || '(from URL)');
        console.log('  user:', process.env.DB_USER || process.env.MYSQLUSER || 'root');
        console.log('  database (target):', dbName);

        const opts = buildConnectionOptions();
        conn = await mysql.createConnection(opts);

        await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
        await conn.query(`USE \`${dbName}\``);
        console.log('✅ Connected\n');

        console.log('📦 Applying schema...');
        const schemaPath = path.join(__dirname, '../../sql/schema.sql');
        if (!fs.existsSync(schemaPath)) {
            throw new Error(`schema.sql not found at ${schemaPath}`);
        }

        const schemaSQL = fs.readFileSync(schemaPath, 'utf8');
        try {
            await conn.query(schemaSQL);
            console.log('✅ Schema applied\n');
        } catch (err) {
            console.error('❌ Schema failed:', err.code || '', err.message);
            throw err;
        }

        const [tables] = await conn.query(
            `SELECT TABLE_NAME AS name
             FROM information_schema.TABLES
             WHERE TABLE_SCHEMA = ?
             ORDER BY TABLE_NAME`,
            [dbName]
        );
        console.log(`📋 Tables in \`${dbName}\` (${tables.length}):`);
        tables.forEach((t) => console.log('   -', t.name));

        if (tables.length === 0) {
            throw new Error('Zero tables after schema — check sql/schema.sql content');
        }
        const names = new Set(tables.map((t) => t.name));
        if (!names.has('tournament_results') || !names.has('department_scores')) {
            throw new Error('Required tables missing (tournament_results / department_scores)');
        }

        console.log('\n⚡ Removing legacy department_scores triggers (scoring is app-side)...');
        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_insert');
        await conn.query('DROP TRIGGER IF EXISTS after_tournament_result_update');
        console.log('✅ Legacy triggers dropped\n');

        console.log('🏫 Creating departments...');
        await conn.query(`
            INSERT INTO departments (id, name, code, description, division, is_exhibition) VALUES
            (1, 'College of Arts and Sciences', 'CAS', 'Arts and Sciences Department', 'college', 0),
            (2, 'College of Business Administration', 'CBA', 'Business Administration Department', 'college', 0),
            (3, 'College of Education', 'CED', 'Education Department', 'college', 0),
            (4, 'College of Engineering', 'CEN', 'Engineering Department', 'college', 0),
            (5, 'College of Nursing', 'CON', 'Nursing Department', 'college', 0),
            (6, 'College of Information Technology', 'CIT', 'Information Technology Department', 'college', 0),
            (7, 'Faculty / Night Owls', 'FAC', 'Exhibition-only faculty team', NULL, 1),
            (8, 'SGO / SELECOM', 'SGO', 'Exhibition-only student government team', NULL, 1)
            ON DUPLICATE KEY UPDATE
                division = VALUES(division),
                is_exhibition = VALUES(is_exhibition)
        `);
        console.log('✅ Departments created\n');

        console.log('👤 Creating default users...');
        const defaultUsers = [
            { username: 'admin', email: 'admin@sportfest.com', password: 'password', role: 'admin', first: 'System', last: 'Admin', dept: 1 },
            { username: 'dean_adviser', email: 'dean@sportfest.com', password: 'password', role: 'dean_adviser', first: 'Dean', last: 'Adviser', dept: 2 },
            { username: 'sgo_president', email: 'president@sportfest.com', password: 'password', role: 'sgo_president', first: 'SGO', last: 'President', dept: null },
            { username: 'sgo_officer', email: 'officer@sportfest.com', password: 'password', role: 'sgo_officer', first: 'SGO', last: 'Officer', dept: null },
        ];

        for (const u of defaultUsers) {
            const hash = await bcrypt.hash(u.password, 10);
            await conn.query(
                `
                INSERT INTO users
                    (uuid, username, email, password_hash, role, first_name, last_name, department_id, is_active)
                VALUES
                    (UUID(), ?, ?, ?, ?, ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE
                    password_hash = VALUES(password_hash),
                    first_name = VALUES(first_name),
                    last_name = VALUES(last_name),
                    department_id = VALUES(department_id),
                    is_active = 1
                `,
                [u.username, u.email, hash, u.role, u.first, u.last, u.dept]
            );
            console.log(`  ✅  ${u.role.padEnd(14)} → ${u.email}  (password: ${u.password})`);
        }

        console.log('\n🎉 Setup complete!\n');
        console.log('═══════════════════════════════════════════════════════════');
        console.log('  LOGIN (password is "password" for all):');
        console.log('  admin@sportfest.com');
        console.log('  dean@sportfest.com');
        console.log('  president@sportfest.com');
        console.log('  officer@sportfest.com');
        console.log('  (Players are NOT user accounts — dean registers them as data.)');
        console.log('═══════════════════════════════════════════════════════════\n');
    } catch (err) {
        console.error('\n❌ Setup failed:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error('   → Host/port refused. On Railway use MYSQLHOST/MYSQL_URL; locally start MySQL.');
        }
        if (err.code === 'ER_ACCESS_DENIED_ERROR') {
            console.error('   → Wrong user/password (MYSQLUSER/MYSQLPASSWORD or DB_*).');
        }
        if (err.code === 'ENOTFOUND') {
            console.error('   → Bad hostname. Use private *.railway.internal host from the MySQL service.');
        }
        process.exit(1);
    } finally {
        if (conn) await conn.end();
    }
};

run();