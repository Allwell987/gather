import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import OpenAI from 'https://esm.sh/openai@4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Require service_role key or admin user
  const authHeader = req.headers.get('Authorization')
  const token = authHeader?.replace('Bearer ', '')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  if (!token) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  if (token !== serviceRoleKey) {
    // Check if the caller is an authenticated admin user
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader! } },
    })
    const { data: { user } } = await userClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey)
    const { data: profile } = await adminClient.from('profiles').select('role').eq('id', user.id).single()
    if (!['admin', 'pastor'].includes(profile?.role ?? '')) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!

    const supabase = createClient(supabaseUrl, serviceRoleKey)
    const openai = new OpenAI({ apiKey: openaiApiKey })

    const { start_date, days } = await req.json()
    const startDate = new Date(start_date || new Date().toISOString().split('T')[0])
    const totalDays = parseInt(days) || 365

    const results: { date: string; success: boolean; title?: string; error?: string }[] = []
    const batchSize = 5
    const delayMs = 2000

    for (let i = 0; i < totalDays; i++) {
      const currentDate = new Date(startDate)
      currentDate.setDate(startDate.getDate() + i)
      const dateStr = currentDate.toISOString().split('T')[0]

      try {
        const prompt = `You are a biblical scholar and devotional writer for a Pentecostal church called The Wealth Reality Church. 
Generate a deeply spiritual and biblically grounded daily devotional for ${dateStr}.

The devotional must include:
1. A compelling title (reflecting the daily theme)
2. An anchor scripture reference (e.g., "John 3:16")
3. The full text of the anchor scripture
4. An opening charge/personal challenge to the reader
5. Core teaching (2-3 paragraphs of rich biblical exposition)
6. Supporting scriptures (3 Bible verses that reinforce the teaching)
7. A spiritual insight (personal application for modern Christians)
8. A biblical example (story from scripture demonstrating the principle)
9. Warning and correction (gentle but firm admonition against common pitfalls)
10. A prophetic declaration (powerful statement of faith)
11. A summary (concise takeaway)

Return the response as a JSON object with these exact fields:
- title: string
- anchor_scripture: string (the verse reference)
- anchor_scripture_text: string (the full text of the verse)
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

Return ONLY valid JSON, no markdown code blocks or extra text.`

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
        })

        const content = completion.choices[0]?.message?.content
        if (!content) {
          results.push({ date: dateStr, success: false, error: 'No content generated' })
          continue
        }

        const devotionalData = JSON.parse(content)

        const devotional = {
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
          theme: devotionalData.theme || getTheme(currentDate.getDay()),
          month_focus: devotionalData.month_focus || getMonthFocus(currentDate.getMonth()),
        }

        const { error: devError } = await supabase
          .from('devotionals')
          .upsert(devotional, { onConflict: 'publish_date' })

        if (devError) {
          results.push({ date: dateStr, success: false, error: devError.message })
        } else {
          // Also update daily_verses
          const { error: verseError } = await supabase
            .from('daily_verses')
            .upsert({
              publish_date: dateStr,
              text: devotionalData.anchor_scripture_text || devotionalData.core_teaching.split('.')[0] + '.',
              reference: devotionalData.anchor_scripture,
            }, { onConflict: 'publish_date' })

          if (verseError) {
            console.error(`Database error for daily_verses (${dateStr}):`, verseError.message)
          }

          results.push({ date: dateStr, success: true, title: devotionalData.title })
          console.log(`✓ Generated devotional and verse for ${dateStr}: ${devotionalData.title}`)
        }

        if ((i + 1) % batchSize === 0 && i < totalDays - 1) {
          await new Promise(resolve => setTimeout(resolve, delayMs))
        }
      } catch (err) {
        results.push({ date: dateStr, success: false, error: err.message })
        console.error(`✗ Error for ${dateStr}:`, err.message)
      }
    }

    const successCount = results.filter(r => r.success).length
    const failCount = results.filter(r => !r.success).length

    return new Response(JSON.stringify({
      success: true,
      total: totalDays,
      generated: successCount,
      failed: failCount,
      results
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error:', error)
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
