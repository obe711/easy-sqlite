module.exports = class Schema {
  constructor(obj, options) {
    this.obj = obj;
    this.options = options;
    this.paths = [...Object.keys(obj)];
    this.columns = [...this.paths.map(path => {
      return (`${path} ${obj[path].type} ${obj[path].primaryKey && "PRIMARY KEY" || ""} ${obj[path].autoIncrement && "AUTOINCREMENT" || ""} ${obj[path].unique && "NOT NULL UNIQUE" || ""}`).trim();
    })];
  }
}