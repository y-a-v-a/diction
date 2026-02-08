import cron from 'node-cron';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateSentences } from './claude.js';
import { generateSpeech, delay, getCurrentService } from './tts.js';
import { generateId, createDictation, getDictationPath } from './storage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TRACKING_FILE = path.join(__dirname, '..', 'data', 'auto-generation.json');
const TOPIC_POOL_FILE = path.join(__dirname, '..', 'config', 'topic-pool.json');

/**
 * Ensure data directory exists
 */
function ensureDataDirectory() {
  const dataDir = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
}

/**
 * Get tracking data
 */
function getTrackingData() {
  ensureDataDirectory();

  if (!fs.existsSync(TRACKING_FILE)) {
    return {
      lastGeneration: null,
      totalGenerated: 0,
      history: []
    };
  }

  try {
    return JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf-8'));
  } catch (error) {
    console.error('Error reading tracking file:', error);
    return {
      lastGeneration: null,
      totalGenerated: 0,
      history: []
    };
  }
}

/**
 * Update tracking data
 */
function updateTrackingData(dictationId, topics) {
  const tracking = getTrackingData();

  tracking.lastGeneration = new Date().toISOString();
  tracking.totalGenerated += 1;
  tracking.history.push({
    dictationId,
    topics,
    generatedAt: tracking.lastGeneration
  });

  // Keep only last 52 weeks of history
  if (tracking.history.length > 52) {
    tracking.history = tracking.history.slice(-52);
  }

  fs.writeFileSync(TRACKING_FILE, JSON.stringify(tracking, null, 2));
}

/**
 * Get topic pool
 */
function getTopicPool() {
  try {
    const data = fs.readFileSync(TOPIC_POOL_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading topic pool:', error);
    // Fallback topics
    return {
      topicSets: [
        {
          topics: ["Nederland", "taal", "cultuur"],
          description: "Default fallback"
        }
      ]
    };
  }
}

/**
 * Select topics for this week
 * Uses the week number to cycle through topic sets predictably
 */
function selectWeeklyTopics() {
  const topicPool = getTopicPool();
  const tracking = getTrackingData();

  // Use total generated count to cycle through topics
  const index = tracking.totalGenerated % topicPool.topicSets.length;
  const selectedSet = topicPool.topicSets[index];

  console.log(`📚 Selected topic set: ${selectedSet.description}`);
  return selectedSet.topics;
}

/**
 * Check if we should generate a new dictation
 */
function shouldGenerateNow() {
  const tracking = getTrackingData();

  if (!tracking.lastGeneration) {
    console.log('📝 No previous generation found - will generate first dictation');
    return true;
  }

  const lastGen = new Date(tracking.lastGeneration);
  const now = new Date();
  const daysSinceLastGen = (now - lastGen) / (1000 * 60 * 60 * 24);

  console.log(`⏰ Days since last generation: ${daysSinceLastGen.toFixed(1)}`);

  // Generate if it's been 7 days or more
  return daysSinceLastGen >= 7;
}

/**
 * Generate automatic weekly dictation
 */
export async function generateWeeklyDictation() {
  console.log('\n🔄 Weekly dictation generation check started');

  // Check if generation is needed
  if (!shouldGenerateNow()) {
    console.log('⏭️  Skipping generation - less than 7 days since last generation');
    return { skipped: true };
  }

  console.log('✨ Starting automatic dictation generation...');

  try {
    const topics = selectWeeklyTopics();
    const sentenceCount = 8; // Always generate 8 sentences for weekly drop
    const id = generateId();
    const dictationPath = getDictationPath(id);

    console.log(`📋 Topics: ${topics.join(', ')}`);
    console.log(`🆔 Dictation ID: ${id}`);

    // Step 1: Generate sentences with Claude
    console.log('🤖 Generating sentences with Claude...');
    const sentences = await generateSentences(topics[0], topics[1], topics[2], sentenceCount);
    console.log(`✅ Generated ${sentences.length} sentences`);

    // Step 2: Create dictation metadata
    createDictation(id, topics, sentences);
    console.log('💾 Dictation metadata saved');

    // Step 3: Generate audio for each sentence
    console.log(`🎙️  Generating audio files using ${getCurrentService()}...`);
    for (let i = 0; i < sentences.length; i++) {
      const audioPath = path.join(dictationPath, `${i}.mp3`);
      console.log(`   [${i + 1}/${sentences.length}] Generating audio...`);

      await generateSpeech(sentences[i], audioPath);

      // Add delay to avoid rate limiting (except after last request)
      if (i < sentences.length - 1) {
        await delay(500);
      }
    }

    // Step 4: Update tracking
    updateTrackingData(id, topics);
    console.log('📊 Tracking data updated');

    console.log(`\n🎉 Weekly dictation ${id} generated successfully!`);
    console.log(`   Access at: /dictation/${id}\n`);

    return {
      success: true,
      dictationId: id,
      topics,
      sentenceCount: sentences.length
    };

  } catch (error) {
    console.error('❌ Error generating weekly dictation:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Setup automatic weekly generation
 * Runs every Monday at 9:00 AM
 */
export function setupWeeklyScheduler() {
  const enabled = process.env.ENABLE_AUTO_GENERATION !== 'false';

  if (!enabled) {
    console.log('⏸️  Automatic weekly generation is disabled');
    return;
  }

  // Schedule: Every Friday at 17:00 CET (16:00 UTC)
  // Format: minute hour day-of-month month day-of-week
  const schedule = process.env.CRON_SCHEDULE || '0 16 * * 5';

  console.log(`⏰ Setting up weekly dictation scheduler`);
  console.log(`   Schedule: ${schedule} (Every Friday at 17:00 CET)`);

  cron.schedule(schedule, async () => {
    console.log('\n🔔 Weekly dictation generation triggered by schedule');
    await generateWeeklyDictation();
  });

  // Also check on startup (useful if server was down during scheduled time)
  console.log('🔍 Checking if generation needed on startup...');
  setTimeout(async () => {
    await generateWeeklyDictation();
  }, 5000); // Wait 5 seconds after startup to avoid startup conflicts

  console.log('✅ Weekly scheduler is active\n');
}

/**
 * Get status of automatic generation
 */
export function getAutoGenerationStatus() {
  const tracking = getTrackingData();
  const enabled = process.env.ENABLE_AUTO_GENERATION !== 'false';

  return {
    enabled,
    schedule: process.env.CRON_SCHEDULE || '0 9 * * 1',
    lastGeneration: tracking.lastGeneration,
    totalGenerated: tracking.totalGenerated,
    nextGenerationDue: tracking.lastGeneration
      ? new Date(new Date(tracking.lastGeneration).getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
      : 'As soon as possible'
  };
}
