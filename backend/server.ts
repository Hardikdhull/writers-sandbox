import express, { type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';
import * as cheerio from 'cheerio';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const client = new MongoClient(MONGO_URI);

type ChapterDocument = {
  comments: Array<{
    id: ObjectId;
    highlighted_text: string;
    comment: string;
    position: unknown;
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

app.post('/api/chapters/:id/save', async (req: Request, res: Response) => {
  try {
    const chapterIdParam = req.params.id;
    if (typeof chapterIdParam !== 'string') {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }
    const chapterId = new ObjectId(chapterIdParam);
    const { newIncomingHtml } = req.body;

    await client.connect();
    const db = client.db('writers_sandbox');
    const chaptersCollection = db.collection('chapters');

    // 1. Fetch the current live draft before overwriting it
    const existingChapter = await chaptersCollection.findOne({ _id: chapterId });
    
    let strippedOldDraft = '';
    if (existingChapter && existingChapter.current_content) {
      // 2. Strip media from the old draft before archiving
      strippedOldDraft = stripMediaFromDraft(existingChapter.current_content);
    }

    // 3. Perform the atomic update: Overwrite live content and push stripped archive
    const updateQuery: any = {
      $set: { 
        current_content: newIncomingHtml,
        last_updated: new Date()
      }
    };

    // Only push to history if a previous draft actually existed
    if (strippedOldDraft) {
      updateQuery.$push = {
        history: {
          $each: [{ content: strippedOldDraft, timestamp: new Date() }],$slice: -10 // Strictly maintain only the 10 most recent backups
        }
      };
    }

    await chaptersCollection.updateOne(
      { _id: chapterId },
      updateQuery,
      { upsert: true } // Create the chapter document if it doesn't exist
    );

    res.status(200).json({ message: 'Draft saved and archived successfully.' });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: 'Failed to save draft' });
  } finally {
    await client.close();
  }
});

app.post('/api/chapters/:id/comments', async (req: Request, res: Response) => {
  try {
    const chapterIdParam = req.params.id;
    if (typeof chapterIdParam !== 'string' || !ObjectId.isValid(chapterIdParam)) {
      return res.status(400).json({ error: 'Invalid chapter ID' });
    }

    const chapterId = new ObjectId(chapterIdParam);
    const { highlightedText, commentText, position } = req.body;

    await client.connect();
    const db = client.db('writers_sandbox');

    await db.collection<ChapterDocument>('chapters').updateOne(
      { _id: chapterId },
      {
        $push: {
          comments: {
            id: new ObjectId(),
            highlighted_text: highlightedText,
            comment: commentText,
            position,
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
  } finally {
    await client.close();
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});