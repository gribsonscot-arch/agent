const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const Groq = require('groq-sdk');
const dotenv = require('dotenv');
const path = require('path');
const axios = require('axios');
const { exec } = require('child_process');
const util = require('util');

const execPromise = util.promisify(exec);
dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

const supabase = (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) 
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY) 
  : null;

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// Tools
const tools = {
  shell_exec: async (command) => {
    try {
      const { stdout, stderr } = await execPromise(command);
      return stdout || stderr;
    } catch (e) {
      return `Error: ${e.message}`;
    }
  },
  web_search: async (query) => {
    // Simplified: using a mock or direct axios call if a specific search API isn't provided
    return `Search results for: ${query} (Stubbed)`;
  }
};

async function loadSkills() {
  if (!supabase) return [];
  const { data } = await supabase.from('skills').select('*');
  return data || [];
}

async function getWikiContext() {
  if (!supabase) return "Wiki storage not initialized.";
  const { data } = await supabase.from('wiki_pages').select('title, content').limit(10);
  return data ? data.map(p => `Page: ${p.title}\n${p.content}`).join('\n\n') : "";
}

async function getAIResponse(messages, source = 'web', userId = 'default') {
  if (!groq) return "Groq API key is missing.";
  
  const skills = await loadSkills();
  const wikiContext = await getWikiContext();
  const skillsContext = skills.map(s => `Skill (${s.name}): ${s.description}`).join('\n\n');
  
  const systemPrompt = `You are Claudual, a deeply personal AI agent. 
  You remember everything about the user. 
  You are concise on messaging channels (under 200 characters), and fully conversational on the web.
  
  Wiki Knowledge:
  ${wikiContext}
  
  Available Skills:
  ${skillsContext}
  
  Available Tools: shell_exec, web_search. 
  To use a tool, respond with: TOOL_CALL: [tool_name] [args]`;
  
  try {
    const response = await groq.chat.completions.create({
      messages: [{ role: "system", content: systemPrompt }, ...messages],
      model: "llama-3.3-70b-versatile",
    });
    
    let content = response.choices[0].message.content;
    
    // Handle Tool Calls (very basic implementation)
    if (content.startsWith('TOOL_CALL:')) {
      const parts = content.split(' ');
      const toolName = parts[1];
      const args = parts.slice(2).join(' ');
      if (tools[toolName]) {
        const result = await tools[toolName](args);
        return `Tool Output (${toolName}): ${result}`;
      }
    }
    
    return content;
  } catch (error) {
    console.error("Groq Error:", error);
    return "I'm having trouble thinking right now.";
  }
}

app.post('/api/chat', async (req, res) => {
  const { message, user_id, source = 'web' } = req.body;
  
  let history = [];
  if (supabase) {
    const { data } = await supabase
      .from('conversations')
      .select('message, response')
      .eq('user_id', user_id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    if (data) {
      history = data.reverse().flatMap(c => [
        { role: 'user', content: c.message },
        { role: 'assistant', content: c.response }
      ]);
    }
  }

  const aiMessage = await getAIResponse([...history, { role: "user", content: message }], source, user_id);
  
  if (supabase) {
    await supabase.from('conversations').insert([{ user_id, message, response: aiMessage, source }]);
  }
  
  res.json({ response: aiMessage });
});

app.post('/api/telegram', async (req, res) => {
  const { message } = req.body;
  if (message && message.text) {
    const chatId = message.chat.id;
    const aiMessage = await getAIResponse([{ role: "user", content: message.text }], 'telegram');
    
    if (process.env.TELEGRAM_BOT_TOKEN) {
      await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: chatId,
        text: aiMessage
      });
    }
  }
  res.sendStatus(200);
});

app.post('/api/ingest', async (req, res) => {
  const { content, name } = req.body;
  if (supabase) {
    await supabase.from('wiki_pages').upsert({ title: name, content });
    await supabase.from('wiki_logs').insert({ action: 'ingest', target: name });
  }
  res.json({ message: "Ingested successfully" });
});

app.get('/api/wiki', async (req, res) => {
  if (supabase) {
    const { data } = await supabase.from('wiki_pages').select('*');
    res.json(data);
  } else {
    res.json([]);
  }
});

app.get('/', (req, res) => res.sendFile(path.join(__dirname, '../public/index.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, '../public/dashboard.html')));

if (process.env.NODE_ENV !== 'production') {
  app.listen(port, () => console.log(`Claudual running on ${port}`));
}

module.exports = app;
