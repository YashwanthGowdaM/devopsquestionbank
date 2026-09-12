-- ==========================================================
-- DevOps Interview Question Bank - Supabase Database Schema
-- Table: public.questions
-- ==========================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Create the questions table
CREATE TABLE IF NOT EXISTS public.questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question TEXT NOT NULL,
    primary_topic VARCHAR(100) NOT NULL,
    cross_topics TEXT[] DEFAULT '{}',
    difficulty VARCHAR(50) NOT NULL DEFAULT 'Intermediate',
    question_type VARCHAR(50) NOT NULL DEFAULT 'Theory',
    experience_level VARCHAR(50) NOT NULL DEFAULT '2-4 Years',
    interview_round VARCHAR(50) NOT NULL DEFAULT 'L1',
    tags TEXT[] DEFAULT '{}',
    search_keywords TEXT[] DEFAULT '{}',
    confidence_score INTEGER NOT NULL DEFAULT 90,
    duplicate_group VARCHAR(50),
    explanation TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'Approved',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create high-performance indexes for searching, filtering & sorting
CREATE INDEX IF NOT EXISTS idx_questions_primary_topic ON public.questions(primary_topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON public.questions(difficulty);
CREATE INDEX IF NOT EXISTS idx_questions_question_type ON public.questions(question_type);
CREATE INDEX IF NOT EXISTS idx_questions_experience_level ON public.questions(experience_level);
CREATE INDEX IF NOT EXISTS idx_questions_interview_round ON public.questions(interview_round);
CREATE INDEX IF NOT EXISTS idx_questions_status ON public.questions(status);
CREATE INDEX IF NOT EXISTS idx_questions_confidence ON public.questions(confidence_score);
CREATE INDEX IF NOT EXISTS idx_questions_duplicate_group ON public.questions(duplicate_group);
CREATE INDEX IF NOT EXISTS idx_questions_created_at ON public.questions(created_at DESC);

-- GIN index for ultra-fast array searches on tags and keywords
CREATE INDEX IF NOT EXISTS idx_questions_tags_gin ON public.questions USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_questions_search_keywords_gin ON public.questions USING GIN(search_keywords);

-- Full-text search index for keyword querying on the question body and explanation
CREATE INDEX IF NOT EXISTS idx_questions_fts ON public.questions USING GIN(to_tsvector('english', question || ' ' || COALESCE(explanation, '')));

-- 3. Automatic updated_at timestamp trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_questions_updated_at ON public.questions;
CREATE TRIGGER set_questions_updated_at
    BEFORE UPDATE ON public.questions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

-- Allow read access for anon and authenticated users
DROP POLICY IF EXISTS "Allow public read access" ON public.questions;
CREATE POLICY "Allow public read access"
    ON public.questions
    FOR SELECT
    TO anon, authenticated, service_role
    USING (true);

-- Allow insert access
DROP POLICY IF EXISTS "Allow public insert access" ON public.questions;
CREATE POLICY "Allow public insert access"
    ON public.questions
    FOR INSERT
    TO anon, authenticated, service_role
    WITH CHECK (true);

-- Allow update access
DROP POLICY IF EXISTS "Allow public update access" ON public.questions;
CREATE POLICY "Allow public update access"
    ON public.questions
    FOR UPDATE
    TO anon, authenticated, service_role
    USING (true)
    WITH CHECK (true);

-- Allow delete access
DROP POLICY IF EXISTS "Allow public delete access" ON public.questions;
CREATE POLICY "Allow public delete access"
    ON public.questions
    FOR DELETE
    TO anon, authenticated, service_role
    USING (true);

-- Grant privileges to standard roles
GRANT ALL ON public.questions TO anon, authenticated, service_role;
