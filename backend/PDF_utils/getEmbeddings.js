const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const getEmbeddings = async (tableName) => {
  // absolute path to sqlite db file
  const dbPath = "backend/PDF_data/embeddings.db";

  const db = new sqlite3.Database(dbPath);

  try {
    // Select all rows in the table
    const select_table_query = `SELECT * FROM ${tableName}`;
    const getRows = () => {
      return new Promise((resolve, reject) => {
        db.all(select_table_query, (err, rows) => {
          if (err) reject(err);
          resolve(rows);
        });
      });
    };
    const rows = await getRows();

    return rows;
  } catch (error) {
    console.error(error);
  }
};

const run = async () => {
  const embeddings = await getEmbeddings();
};

// run()
//   .then(() => {
//     console.log("Embeddings retrieved from in SQLite database");
//   })
//   .catch((error) => console.error("an error occured: ", error));

module.exports = getEmbeddings;
