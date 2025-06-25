import { supabase } from './supabase';

export async function generateMeme({ text, template, user_id }) {
  const response = await fetch('/.netlify/functions/generate-meme', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, template, user_id })
  });
  
  if (!response.ok) {
    throw new Error('Failed to generate meme');
  }
  
  return response.json();
}

export async function saveMeme(memeData) {
  const { data, error } = await supabase
    .from('memes')
    .insert([memeData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
}

export async function getTrendingTopics() {
  const response = await fetch('/.netlify/functions/get-trending');
  if (!response.ok) {
    throw new Error('Failed to fetch trending topics');
  }
  return response.json();
}