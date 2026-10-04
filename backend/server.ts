import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

import { MongoClient, ObjectId } from 'mongodb';
import * as cheerio from 'cheerio';

// Import your new authentication controllers and middleware
import { registerWriter, loginWriter } from './controllers/authController.js';
import { requireAuth, type AuthRequest } from './middleware/authMiddleware.js';

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(MONGO_URI);

type ChapterDocument = {
  comments: Array<{
    id: ObjectId;
    type: string;
    author: string;
    comment: string;
    highlighted_text: string | null;
    position: unknown | null;
    created_at: Date;
    resolved: boolean;
  }>;
};

// Helper function to strip media from HTML
const stripMediaFromDraft = (rawHtml: string): string => {
  if (!rawHtml) return '';
  const $= cheerio.load(rawHtml);$('img, audio, video, source, iframe').remove();
  return $.html();
};

// Helper to generate a short, read-only URL token for beta readers
const generateShareToken = () => Math.random().toString(36).substring(2, 8);

// ==========================================
// PUBLIC ROUTES
// ==========================================

// Writer Authentication
app.post('/api/auth/register', registerWriter);
app.post('/api/auth/login', loginWriter);

// HEALTH CHECK ROUTE (For cron-job.org)
app.get('/ping', (req: Request, res: Response) => {
  res.status(200).send('Render backend is awake!');
});

// GET CHAPTER BY SHARE TOKEN (For Beta Readers)
app.get('/api/beta/:token', async (req: Request, res: Response) => {
  try {
    await client.connect();
    const db = client.db('writers_sandbox');
    
    // Find the chapter using the short token
    const chapter = await db.collection('chapters').findOne({ 
      share_token: req.params.token 
    });

    if (!chapter) {
      res.status(404).json({ error: 'Invalid or expired beta link' });
      return;
    }

    res.status(200).json(chapter);
  } catch (error) {
    console.error('Beta fetch error:', error);
    res.status(500).json({ error: 'Failed to load chapter' });
  }
});

// Beta Reader (Guest) Comments - Left unprotected intentionally
app.post('/api/chapters/:id/comments', async (req: Request, res: Response) => {
  try {
    const chapterIdParam = req.params.id;
    if (typeof chapterIdParam !== 'string' || !ObjectId.isValid(chapterIdParam)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }
    const chapterId = new ObjectId(chapterIdParam);
    const { type, highlightedText, commentText, position, guestName } = req.body; 

    await client.connect();
    const db = client.db('writers_sandbox');
    
    await db.collection<ChapterDocument>('chapters').updateOne(
      { _id: chapterId },
      { 
        $push: { 
          comments: {
            id: new ObjectId(),
            type: type, 
            author: guestName || 'Anonymous Reader',
            comment: commentText,
            highlighted_text: type === 'inline' ? highlightedText : null,
            position: type === 'inline' ? position : null, 
            created_at: new Date(),
            resolved: false
          } 
        } 
      }
    );

    res.status(200).json({ message: 'Comment saved successfully' });
  } catch (error) {
    console.error('Comment error:', error);
    res.status(500).json({ error: 'Failed to save comment' });
  }
});

// ==========================================
// PROTECTED ROUTES (Requires JWT Token)
// ==========================================

// Save Chapter Draft - Protected by requireAuth
app.post('/api/chapters/:id/save', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const chapterIdParam = req.params.id;
    if (typeof chapterIdParam !== 'string' || !ObjectId.isValid(chapterIdParam)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }
    const chapterId = new ObjectId(chapterIdParam);
    
    // EXTRACT BOTH HTML AND CSS
    const { newIncomingHtml, css_content } = req.body;

    await client.connect();
    const db = client.db('writers_sandbox');
    const chaptersCollection = db.collection('chapters');

    const existingChapter = await chaptersCollection.findOne({ _id: chapterId });
    
    let strippedOldDraft = '';
    if (existingChapter && existingChapter.current_content) {
      strippedOldDraft = stripMediaFromDraft(existingChapter.current_content);
    }

    // SAVE BOTH HTML AND CSS TO MONGODB
    const updateQuery: any = {
      $set: { 
        current_content: newIncomingHtml,
        css_content: css_content,
        last_updated: new Date()
      }
    };

    if (strippedOldDraft) {
      updateQuery.$push = {
        history: {
          $each: [{ content: strippedOldDraft, timestamp: new Date() }],$slice: -10 
        }
      };
    }

    await chaptersCollection.updateOne(
      { _id: chapterId },
      updateQuery,
      { upsert: true } 
    );

    res.status(200).json({ message: 'Draft saved and archived successfully.' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  }
});

// CREATE A NEW CHAPTER
app.post('/api/chapters', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await client.connect();
    const db = client.db('writers_sandbox');
    
    const newChapter = {
      author_id: new ObjectId(req.userId),
      title: req.body.title || 'Untitled Draft',
      share_token: generateShareToken(),
      current_content: '<p>Start writing here...</p>',
      css_content: '', // INITIATE BLANK CSS FIELD
      history: [],
      comments: [],
      created_at: new Date(),
      last_updated: new Date()
    };

    const result = await db.collection('chapters').insertOne(newChapter);
    res.status(201).json({ chapterId: result.insertedId, shareToken: newChapter.share_token });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create chapter' });
  }
});

// GET ALL CHAPTERS FOR LOGGED-IN WRITER
app.get('/api/chapters', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    await client.connect();
    const db = client.db('writers_sandbox');
    
    const chapters = await db.collection('chapters')
      .find({ author_id: new ObjectId(req.userId) })
      .project({ title: 1, last_updated: 1, share_token: 1 })
      .sort({ last_updated: -1 })
      .toArray();

    res.status(200).json(chapters);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch chapters' });
  }
});

// GET SPECIFIC CHAPTER (For the Editor)
app.get('/api/chapters/:id', requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const chapterIdParam = req.params.id;
    if (typeof chapterIdParam !== 'string' || !ObjectId.isValid(chapterIdParam)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }
    const chapterId = new ObjectId(chapterIdParam);
    
    await client.connect();
    const db = client.db('writers_sandbox');
    
    const chapter = await db.collection('chapters').findOne({ 
      _id: chapterId,
      author_id: new ObjectId(req.userId)
    });

    if (!chapter) {
      res.status(404).json({ error: 'Chapter not found or unauthorized' });
      return;
    }

    res.status(200).json(chapter);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load chapter' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
