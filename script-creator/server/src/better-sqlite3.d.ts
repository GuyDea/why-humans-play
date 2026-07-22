declare module 'better-sqlite3' {
  namespace Database {
    interface Statement {
      run(...params: unknown[]): unknown;
      get(...params: unknown[]): unknown;
      all(...params: unknown[]): unknown[];
    }

    interface Database {
      pragma(source: string): unknown;
      exec(source: string): this;
      prepare(source: string): Statement;
      close(): void;
    }

    interface DatabaseConstructor {
      new (filename: string): Database;
    }
  }

  const Database: Database.DatabaseConstructor;
  export = Database;
}
