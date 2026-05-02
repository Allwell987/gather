import 'dotenv/config';
import OpenAI from 'openai';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const openaiApiKey = process.env.OPENAI_API_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);
const openai = new OpenAI({ apiKey: openaiApiKey });

const getTheme = (day: number): string => {
  const themes = [
    "Kingdom Identity",
    "Faith & Confession",
    "Wisdom & Direction",
    "Discipline & Growth",
    "Prayer & Intimacy",
    "Prosperity & Stewardship",
    "Power & Authority"
  ];
  return themes[day % 7];
};

const getMonthFocus = (month: number): string => {
  const focus = [
    "Alignment",
    "Love & Nature of God",
    "Faith Activation",
    "Resurrection Power",
    "Wisdom & Guidance",
    "Spiritual Discipline",
    "Dominion",
    "Fruitfulness",
    "Spiritual Warfare",
    "Light & Holiness",
    "Thanksgiving & Stewardship",
    "Reflection & Renewal"
  ];
  return focus[month];
};

const generateDevotional = async (date: Date): Promise<any> => {
  const dateStr = date.toISOString().split('T')[0];
  
  const prompt = `You are a biblical scholar and devotional writer for a Pentecostal church called The Wealth Reality Church. 
Generate a deeply spiritual and biblically grounded daily devotional for ${dateStr}.

The devotional must include:
1. A compelling title (reflecting the daily theme)
2. An anchor scripture verse
3. An opening charge/personal challenge to the reader
4. Core teaching (2-3 paragraphs of rich biblical exposition)
5. Supporting scriptures (3 Bible verses that reinforce the teaching)
6. A spiritual insight (personal application for modern Christians)
7. A biblical example (story from scripture demonstrating the principle)
8. Warning and correction (gentle but firm admonition against common pitfalls)
9. A prophetic declaration (powerful statement of faith)
10. A summary (concise takeaway)

Return the response as a JSON object with these exact fields:
- title: string
- anchor_scripture: string (just the verse reference)
- opening_charge: string
- core_teaching: string
- supporting_scriptures: string[] (array of verse references)
- spiritual_insight: string
- biblical_example: string
- warning_correction: string
- declaration: string
- summary: string
- theme: string (daily theme based on day of week)
- month_focus: string (monthly focus based on current month)

Be theologically sound, culturally relevant, and spiritually uplifting. Use reverent language befitting a Pentecostal/Charismatic church.

Return ONLY valid JSON, no markdown code blocks or extra text.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      {
        role: 'system',
        content: 'You are an expert biblical scholar and devotional writer for The Wealth Reality Church. Always respond with valid JSON only.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.8,
    max_tokens: 2000
  });

  const content = completion.choices[0]?.message?.content;
  if (!content) {
    throw new Error('No content generated');
  }

  const devotionalData = JSON.parse(content);

  return {
    publish_date: dateStr,
    title: devotionalData.title,
    anchor_scripture: devotionalData.anchor_scripture,
    opening_charge: devotionalData.opening_charge,
    core_teaching: devotionalData.core_teaching,
    supporting_scriptures: devotionalData.supporting_scriptures || [],
    spiritual_insight: devotionalData.spiritual_insight,
    biblical_example: devotionalData.biblical_example,
    warning_correction: devotionalData.warning_correction,
    declaration: devotionalData.declaration,
    summary: devotionalData.summary || `Today's devotional reminds us to ${devotionalData.title.toLowerCase()}.`,
    theme: devotionalData.theme || getTheme(date.getDay()),
    month_focus: devotionalData.month_focus || getMonthFocus(date.getMonth()),
  };
};

const generate365Devotionals = async () => {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  
  const results: { date: string; success: boolean; title?: string; error?: string }[] = [];
  const batchSize = 5;
  const delayMs = 3000;

  console.log('🚀 Starting 365-day devotional generation...\n');

  for (let i = 0; i < 365; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateStr = currentDate.toISOString().split('T')[0];

    try {
      const devotional = await generateDevotional(currentDate);

      const { error } = await supabase
        .from('devotionals')
        .upsert(devotional, { onConflict: 'publish_date' });

      if (error) {
        results.push({ date: dateStr, success: false, error: error.message });
        console.log(`❌ ${dateStr}: Error - ${error.message}`);
      } else {
        results.push({ date: dateStr, success: true, title: devotional.title });
        console.log(`✅ ${dateStr}: ${devotional.title}`);
      }

      if ((i + 1) % batchSize === 0 && i < 364) {
        console.log(`\n⏳ Rate limiting (3s delay)...\n`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    } catch (err: any) {
      results.push({ date: dateStr, success: false, error: err.message });
      console.log(`❌ ${dateStr}: ${err.message}`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log('\n' + '='.repeat(50));
  console.log('📊 Generation Complete!');
  console.log(`✅ Successfully generated: ${successCount}/365`);
  console.log(`❌ Failed: ${failCount}/365`);
  console.log('='.repeat(50));

  if (failCount > 0) {
    console.log('\nFailed dates:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.date}: ${r.error}`);
    });
  }

  return results;
};

generate365Devotionals().catch(console.error);
