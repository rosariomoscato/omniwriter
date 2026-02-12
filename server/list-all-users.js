#!/usr/bin/env node

/**
 * List all users for testing
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/omniwriter.db');
const Database = require('better-sqlite3');

const db = new Database(dbPath);

const users = db.prepare('SELECT id, email, name, role FROM users LIMIT 10').all();

console.log('=== Users ===\n');
if (users.length === 0) {
  console.log('No users found.');
} else {
  users.forEach(user => {
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log('---');
  });
}

db.close();
