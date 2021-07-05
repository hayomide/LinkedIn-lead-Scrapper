const mysql = require("mysql");

const {
    mysql: { database: db, ...mysqlObj },
    // scrapeOrder,
} = require("../config");

const allowedKeys = ["host", "port", "user", "password", "charset"];
const mysqlConfig = {
    acquireTimeout: 60000,
    connectTimeout: 60000,
    connectionLimit: 500,
    database: db,
};
for (const k in mysqlObj) if (allowedKeys.includes(k)) mysqlConfig[k] = mysqlObj[k];
const conn = mysql.createPool(mysqlConfig);

const mysqlSetup = (next = () => {}, props2 = {}) => {
    const { table } = props2;

    return new Promise((resolve) =>
        conn.getConnection((err, conn) => {
            if (err) {
                console.error("Could not make query", err);
                resolve();
                return;
            }

            const releaseFunc = (err) => {
                if (err) console.error("Unable to release connection", err);
            };
            conn.end = () => conn.release(releaseFunc);

            const nextArgs = [conn];
            if (table) nextArgs.push(mysqlObj.tables[table]);
            nextArgs.push(mysql.raw);

            const tryCloseConn = () => {
                if (!props2.openConn)
                    try {
                        conn.release(releaseFunc);
                    } catch (e) {}
            };

            const run = next(...nextArgs);
            if (!(run instanceof Promise)) {
                tryCloseConn();
                return run;
            }

            return run
                .then(resolve)
                .catch(console.error)
                .finally(() => tryCloseConn());
        })
    );
};

const mysqlSetupOld = (next = () => {}, props2 = {}) => {
    const { table, database, schema } = props2;
    const multi = !!schema;
    const allowedKeys = ["host", "port", "user", "password", "charset"];

    const mysqlConfig = { multipleStatements: multi };
    for (const k in mysqlObj) if (allowedKeys.includes(k)) mysqlConfig[k] = mysqlObj[k];
    if (!multi) mysqlConfig.database = database ? mysqlObj.databases[database] : db;

    const conn = mysql.createConnection(mysqlConfig);
    return new Promise((resolve) => {
        const nextArgs = [conn];
        if (table) nextArgs.push(mysqlObj.tables[table]);
        nextArgs.push(mysql.raw);

        const runFunc = () => {
            const run = next(...nextArgs);
            if (!(run instanceof Promise)) {
                if (!props2.openConn) conn.end();
                return run;
            }
            return run
                .then(resolve)
                .catch(console.error)
                .finally(() => {
                    if (!props2.openConn) conn.end();
                });
        };

        if (!multi) return runFunc();

        conn.query(schema, (err) => {
            if (err) {
                console.error("Error creating database and necessary tables", err);
                conn.end();
                return resolve(false);
            }
            runFunc();
        });
    });
};

module.exports = { mysqlSetup, mysqlSetupOld };
