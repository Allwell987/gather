import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import OpenAI from "https://esm.sh/openai@4";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Require authenticated user
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const userClient = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: authError } = await userClient.auth.getUser();
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const { input } = await req.json();

    if (!input) {
      console.warn('Generate prayer called without input');
      return new Response(
        JSON.stringify({ error: 'Input is required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      console.error('OPENAI_API_KEY is not set in Supabase environment variables');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    const openai = new OpenAI({ apiKey: openaiApiKey });

    console.log(`Generating prayer for input: ${input.substring(0, 50)}...`);

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: 'You are a compassionate Christian prayer assistant. Your goal is to write a warm, biblically-grounded, and personalized prayer based on the user\'s current feelings or situation. Keep it concise, encouraging, and end with "In Jesus\' name, Amen."'
        },
        {
          role: 'user',
          content: input
        }
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const prayer = completion.choices[0]?.message?.content;

    if (!prayer) {
      console.error('OpenAI returned empty completion choices');
      throw new Error('No prayer content generated from OpenAI');
    }

    console.log('Successfully generated prayer');

    return new Response(
      JSON.stringify({ prayer }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Error in generate-prayer function:', errorMessage);

    // Check for specific OpenAI errors if possible
    let status = 500;
    if (errorMessage.includes('401') || errorMessage.toLowerCase().includes('invalid api key')) {
      status = 401;
    } else if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
      status = 429;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        details: error?.stack || 'No stack trace available'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status }
    );
  }
});
