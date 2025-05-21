const sqlite3 = require('sqlite3').verbose();
const Datastore = require('nedb');
const path = require('path');
const { app } = require('electron');

class DatabaseService {
  constructor(userDataPath) {
    this.userDataPath = userDataPath || app.getPath('userData');
    
    // Initialisation de SQLite
    this.sqliteDb = new sqlite3.Database(path.join(this.userDataPath, 'abia.db'));
    
    // Initialisation des collections NeDB
    this.conversations = new Datastore({ 
      filename: path.join(this.userDataPath, 'conversations.db'), 
      autoload: true 
    });
    
    this.documents = new Datastore({ 
      filename: path.join(this.userDataPath, 'documents.db'), 
      autoload: true 
    });
    
    this.settings = new Datastore({ 
      filename: path.join(this.userDataPath, 'settings.db'), 
      autoload: true 
    });
    
    // Initialisation des tables SQLite
    this.initSqliteTables();
  }
  
  // Initialisation des tables SQLite
  initSqliteTables() {
    this.sqliteDb.serialize(() => {
      // Table des utilisateurs
      this.sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT,
          email TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      
      // Table des tâches
      this.sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          title TEXT NOT NULL,
          description TEXT,
          status TEXT DEFAULT 'pending',
          due_date TIMESTAMP,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
      
      // Table des logs
      this.sqliteDb.run(`
        CREATE TABLE IF NOT EXISTS logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          user_id INTEGER,
          FOREIGN KEY (user_id) REFERENCES users (id)
        )
      `);
    });
  }
  
  // Méthodes pour les conversations (NeDB)
  saveConversation(conversation) {
    return new Promise((resolve, reject) => {
      this.conversations.insert(conversation, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  }
  
  getConversations(query = {}, sort = { timestamp: -1 }) {
    return new Promise((resolve, reject) => {
      this.conversations.find(query).sort(sort).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }
  
  getConversationById(id) {
    return new Promise((resolve, reject) => {
      this.conversations.findOne({ _id: id }, (err, doc) => {
        if (err) reject(err);
        else resolve(doc);
      });
    });
  }
  
  updateConversation(id, update) {
    return new Promise((resolve, reject) => {
      this.conversations.update({ _id: id }, { $set: update }, {}, (err, numReplaced) => {
        if (err) reject(err);
        else resolve(numReplaced);
      });
    });
  }
  
  deleteConversation(id) {
    return new Promise((resolve, reject) => {
      this.conversations.remove({ _id: id }, {}, (err, numRemoved) => {
        if (err) reject(err);
        else resolve(numRemoved);
      });
    });
  }
  
  // Méthodes pour les documents (NeDB)
  saveDocument(document) {
    return new Promise((resolve, reject) => {
      this.documents.insert(document, (err, newDoc) => {
        if (err) reject(err);
        else resolve(newDoc);
      });
    });
  }
  
  getDocuments(query = {}, sort = { timestamp: -1 }) {
    return new Promise((resolve, reject) => {
      this.documents.find(query).sort(sort).exec((err, docs) => {
        if (err) reject(err);
        else resolve(docs);
      });
    });
  }
  
  // Méthodes pour les tâches (SQLite)
  createTask(task) {
    return new Promise((resolve, reject) => {
      const { title, description, status, due_date, user_id } = task;
      
      this.sqliteDb.run(
        `INSERT INTO tasks (title, description, status, due_date, user_id) 
         VALUES (?, ?, ?, ?, ?)`,
        [title, description, status, due_date, user_id],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...task });
        }
      );
    });
  }
  
  getTasks(userId = null) {
    return new Promise((resolve, reject) => {
      let query = 'SELECT * FROM tasks';
      let params = [];
      
      if (userId) {
        query += ' WHERE user_id = ?';
        params.push(userId);
      }
      
      query += ' ORDER BY due_date ASC';
      
      this.sqliteDb.all(query, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
  
  updateTask(id, updates) {
    return new Promise((resolve, reject) => {
      const { title, description, status, due_date } = updates;
      
      this.sqliteDb.run(
        `UPDATE tasks 
         SET title = ?, description = ?, status = ?, due_date = ?, updated_at = CURRENT_TIMESTAMP 
         WHERE id = ?`,
        [title, description, status, due_date, id],
        function(err) {
          if (err) reject(err);
          else resolve({ changes: this.changes });
        }
      );
    });
  }
  
  deleteTask(id) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.run('DELETE FROM tasks WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      });
    });
  }
  
  // Méthodes pour les logs (SQLite)
  addLog(log) {
    return new Promise((resolve, reject) => {
      const { action, details, user_id } = log;
      
      this.sqliteDb.run(
        `INSERT INTO logs (action, details, user_id) 
         VALUES (?, ?, ?)`,
        [action, details, user_id],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID, ...log });
        }
      );
    });
  }
  
  getLogs(limit = 50, offset = 0) {
    return new Promise((resolve, reject) => {
      this.sqliteDb.all(
        'SELECT * FROM logs ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [limit, offset],
        (err, rows) => {
          if (err) reject(err);
          else resolve(rows);
        }
      );
    });
  }
  
  // Fermeture de la connexion à la base de données
  close() {
    this.sqliteDb.close();
  }
}

module.exports = DatabaseService;
