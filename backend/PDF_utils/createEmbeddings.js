const getEmbedding = require("./getEmbedding");

const sqlite3 = require("sqlite3").verbose();

const createdEmbeddings = async (chunks, tableName) => {
  // absolute path to sqlite db file
  const dbPath = "backend/PDF_data/embeddings.db";

  const db = new sqlite3.Database(dbPath);

  try {
    // const delete_table_query = `DROP TABLE IF EXISTS ${tableName}`;
    // const deleteTable = () => {
    //   return new Promise((resolve, reject) => {
    //     db.run(delete_table_query, (err) => {
    //       if (err) reject(err);
    //       resolve();
    //     });
    //   });
    // };
    // await deleteTable();

    // db.run(`DROP TABLE IF EXISTS ${tableName}`);

    const create_table_query = `
        CREATE TABLE IF NOT EXISTS ${tableName} (
            id INTEGER PRIMARY KEY,
            text TEXT,
            embedding TEXT
        )
        `;

    const createTable = () => {
      return new Promise((resolve, reject) => {
        db.run(create_table_query, (err) => {
          if (err) reject(err);
          resolve();
        });
      });
    };
    await createTable();

    // prepare the insert statement
    const stmt = db.prepare(
      `INSERT INTO ${tableName} (text, embedding) VALUES (?, ?)`
    );
    for (let i = 0; i < chunks.length; i++) {
      const text = chunks[i];
      const embedding = await getEmbedding(text);

      const insertData = (text, embedding) => {
        return new Promise((resolve, reject) => {
          stmt.run(text, JSON.stringify(embedding), (err) => {
            if (err) reject(err);
            resolve();
          });
        });
      };
      await insertData(text, embedding);
      console.log(`Embedding ${i} in SQLite database"`);
    }
    console.log("Embedding created and stored in SQLite database");
  } catch (error) {
    console.error(error);
  }
};

module.exports = createdEmbeddings;
