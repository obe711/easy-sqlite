const Database = require('better-sqlite3');

module.exports = class Model {
  constructor(tableName, schema, options = {}) {
    this.tableName = tableName;
    this.schema = schema;
    this.paths = schema.paths;
    this.timeStamps = true; //options.timeStamps;
    this.columns = this.timeStamps ? [...schema.columns, 'createdAt TEXT NOT NULL', 'updatedAt TEXT NOT NULL'] : schema.columns;
    this.db = new Database(options.dbFile, options);
  }

  doesExist() {
    const found = this.db.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name='${this.tableName}';`);
    return !!found.get();
  }

  createTable() {
    this.db.prepare(`CREATE TABLE IF NOT EXISTS ${this.tableName} (${this.columns.join(", ")});`).run();
    return this;
  }

  dropTable() {
    this.db.prepare(`DROP TABLE IF EXISTS ${this.tableName};`).run();
    return this;
  }

  insertOne(obj) {
    const timeStamp = new Date().toISOString();

    const columns = [...this._getPaths(obj)];

    const values = [...columns.map(column => {
      return obj[column];
    }), timeStamp, timeStamp];

    this.db.prepare(`INSERT INTO ${this.tableName} (${[...columns, 'createdAt', 'updatedAt'].join(", ")}) VALUES (${values.map(value => {
      return `'${value}'`;
    }).join(", ")});`).run();

    return this;
  }

  insertMany(objs) {
    const timeStamp = new Date().toISOString();
    const columns = this._getPaths(objs[0]);
    const values = [...columns.map(column => {
      return `@${column}`
    }), "@createdAt", "@updatedAt"];

    const insert = this.db.prepare(`INSERT INTO ${this.tableName} (${[...columns, "createdAt", "updatedAt"].join(", ")}) VALUES (${values.join(", ")})`);

    const insertMany = this.db.transaction((items) => {
      for (const item of items) insert.run({ ...item, createdAt: timeStamp, updatedAt: timeStamp });
    });

    insertMany(objs);

    return this;
  }

  findByIdAndUpdate(id, obj) {
    if (this.timeStamps) {
      const timeStamp = new Date().toISOString();
      obj.updatedAt = timeStamp;
    }

    const columns = this._getPaths(obj);
    const values = this._getPathValues(columns, obj);

    this.db.prepare(`UPDATE ${this.tableName} SET ${values.join(", ")} WHERE id = ${id};`).run();

    return this;
  }

  findAndUpdate(query, update) {
    if (this.timeStamps) {
      const timeStamp = new Date().toISOString();
      update.updatedAt = timeStamp;
    }

    const columns = this._getPaths(update);
    const values = this._getPathValues(columns, update);
    const queryValues = this._getQuery(query);

    if (queryValues.length === 0) {
      this.db.prepare(`UPDATE ${this.tableName} SET ${values.join(", ")};`).run();
      return this;
    }
    this.db.prepare(`UPDATE ${this.tableName} SET ${values.join(", ")} WHERE ${queryValues.join(" AND ")};`).run();
    return this;
  }

  findAndDelete(query) {
    const queryValues = this._getQuery(query);

    this.db.prepare(`DELETE FROM ${this.tableName} WHERE ${queryValues.join(" AND ")};`).run();
    return this;
  }

  // Queries

  getAll(options = {}) {
    if (Object.keys(options).length === 0) {
      return this.db.prepare(`SELECT * FROM ${this.tableName};`).all();
    }

    return this.db.prepare(`SELECT * FROM ${this.tableName} ORDER BY ${Object.keys(options)[0]} ${options[Object.keys(options)[0]] === 0 ? "DESC" : "ASC"};`).all();
  }

  find(query) {
    const queryValues = this._getQuery(query);

    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${queryValues.join(" AND ")};`).all();
  }

  findOne(query) {
    const queryValues = this._getQuery(query);

    return this.db.prepare(`SELECT * FROM ${this.tableName} WHERE ${queryValues.join(" AND ")};`).get();
  }

  count(query) {
    const queryValues = this._getQuery(query);

    if (queryValues.length === 0) {
      return this.db.prepare(`SELECT COUNT(*) AS 'count' FROM ${this.tableName};`).get();
    }

    return this.db.prepare(`SELECT COUNT(*) AS 'count' FROM ${this.tableName} WHERE ${queryValues.join(" AND ")}`).get();
  }


  // Private
  _getPaths(obj) {
    return [...Object.keys(obj)];
  }

  _getPathValues(columns, obj) {
    return columns.map(column => {
      return `${column} = '${obj[column]}'`;
    });
  }

  _getQuery(query) {
    return [...this._getPaths(query)].map(path => {
      return `${path} = '${query[path]}'`;
    })
  }
}