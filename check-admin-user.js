#!/usr/bin/env node

/**
 * Check if admin user exists
 */

const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'server/data/omniwriter.db');
const Database = require('better-sqlite3');

const db = new Database(dbPath);

const adminUsers = db.prepare('SELECT id, email, name, role FROM users WHERE role = ?').all('admin');

console.log('=== Admin Users ===\n');
if (adminUsers.length === 0) {
  console.log('No admin users found.');
} else {
  adminUsers.forEach(user => {
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);
    console.log(`Role: ${user.role}`);
    console.log('---');
  });
}

db.close();
