-- Migration to add missing columns to profiles table
-- Run this in your Supabase SQL Editor

DO $$
BEGIN
    -- Add address column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='address') THEN
        ALTER TABLE public.profiles ADD COLUMN address TEXT;
    END IF;

    -- Add birthday column if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='birthday') THEN
        ALTER TABLE public.profiles ADD COLUMN birthday TEXT;
    END IF;
END $$;
