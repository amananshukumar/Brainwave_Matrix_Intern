require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { CohereClient } = require('cohere-ai');
const Task = require('./models/Task');


const app = express();


const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY
});


mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => console.error('❌ MongoDB connection error:', err));


app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));


app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Routes
app.get('/', async (req, res) => {
  try {
    const tasks = await Task.find().sort({ dueDate: 1 });
    res.render('index', {
      tasks,
      title: 'Smart Day Planner',
      currentDate: new Date().toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
    });
  } catch (err) {
    console.error(err);
    res.status(500).render('error', { error: err.message });
  }
});


app.post('/api/tasks', async (req, res) => {
  try {
    const task = new Task({
      title: req.body.title,
      description: req.body.description,
      dueDate: req.body.dueDate,
      priority: req.body.priority || 'medium'
    });
    await task.save();
    res.status(201).json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/tasks', async (req, res) => {
  try {
    
    if (!req.body.title || req.body.title.trim() === '') {
      return res.status(400).json({ message: 'Title is required' });
    }

    const task = new Task({
      title: req.body.title.trim(),
      description: req.body.description?.trim() || '',
      dueDate: req.body.dueDate || null,
      priority: req.body.priority || 'medium',
      category: req.body.category?.trim() || '',
      status: 'pending'
    });

    const savedTask = await task.save();
    res.status(201).json(savedTask);
    
  } catch (err) {
    console.error('Save error:', err);
    res.status(500).json({ 
      message: 'Error saving task',
      error: err.message 
    });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    const task = await Task.findByIdAndUpdate(
      req.params.id,
      { status: req.body.status },
      { new: true }
    );
    res.json(task);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Delete task route
app.delete('/tasks/:id', async (req, res) => {
  try {
   
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid task ID format' });
    }

    const deletedTask = await Task.findByIdAndDelete(req.params.id);

    if (!deletedTask) {
      return res.status(404).json({ error: 'Task not found' });
    }

    res.json({ 
      success: true,
      message: 'Task deleted successfully',
      deletedTask
    });

  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ 
      error: 'Failed to delete task',
      details: err.message 
    });
  }
});


// AI Suggestions Endpoint
app.post('/api/suggest-tasks', async (req, res) => {
  try {
    const { currentTasks, prompt } = req.body;

    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const response = await cohere.generate({
      model: 'command',
      prompt: `Current tasks: ${currentTasks}\nUser request: ${prompt}\nSuggest 3-5 specific, actionable tasks as a bulleted list.`,
      maxTokens: 150,
      temperature: 0.7,
      k: 0,
      stopSequences: [],
      returnLikelihoods: 'NONE'
    });

    if (!response.generations || !response.generations[0]) {
      throw new Error('Invalid response from AI');
    }

    res.json({ 
      suggestions: response.generations[0].text 
    });

  } catch (err) {
    console.error('AI Suggestion Error:', err);
    res.status(500).json({ 
      error: 'Failed to generate suggestions',
      details: err.message 
    });
  }
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { error: 'Something went wrong!' });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});


process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
