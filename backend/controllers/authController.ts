import dotenv from 'dotenv';
dotenv.config();

import type { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { MongoClient } from 'mongodb';

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const client = new MongoClient(MONGO_URI);

export const registerWriter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;
    
    await client.connect();
    const db = client.db('writers_sandbox');
    const users = db.collection('users');

    // Check if username exists
    const existingUser = await users.findOne({ username });
    if (existingUser) {
      res.status(400).json({ error: 'Username already taken' });
      return;
    }

    // Hash password and save
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const newUser = await users.insertOne({
      username,
      passwordHash,
      created_at: new Date()
    });
    const user = { _id: newUser.insertedId };

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(201).json({ token, username });
  } catch (error) {
    console.error("DEBUG REGISTRATION ERROR:", error);
    res.status(500).json({ error: 'Server error during registration' });
  }
};

export const loginWriter = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    await client.connect();
    const db = client.db('writers_sandbox');
    const user = await db.collection('users').findOne({ username });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate token
    const token = jwt.sign(
      { userId: user._id },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.status(200).json({ token, username });
  } catch (error) {
    console.error("DEBUG LOGIN ERROR:", error);
    res.status(500).json({ error: 'Server error during login' });
  }
};