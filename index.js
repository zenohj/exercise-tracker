const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
console.log('MONG_URI:', process.env.MONG_URI);
const mongoose = require('mongoose');
const { Schema } = mongoose;

mongoose.connect(process.env.MONG_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// Schemas
const UserSchema = new Schema({
  username: { type: String, required: true }
});
const User = mongoose.model('User', UserSchema);

const ExerciseSchema = new Schema({
  user_id: { type: String, required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});
const Exercise = mongoose.model('Exercise', ExerciseSchema);

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// Create user
app.post('/api/users', async (req, res) => {
  try {
    const userObj = new User({ username: req.body.username });
    const user = await userObj.save();
    res.json({ username: user.username, _id: user._id });
  } catch (err) {
    console.error(err);
    res.send('Error creating user');
  }
});

// Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, '_id username');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.send('Error fetching users');
  }
});

// Add exercise
app.post('/api/users/:_id/exercises', async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  try {
    const user = await User.findById(id);
    if (!user) return res.send('Could not find user');

    const exerciseObj = new Exercise({
      user_id: user._id,
      description,
      duration: parseInt(duration),
      date: date ? new Date(date) : new Date()
    });

    const exercise = await exerciseObj.save();

    res.json({
      _id: user._id,
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date.toDateString()
    });
  } catch (err) {
    console.error(err);
    res.send('There was an error saving the exercise');
  }
});

// Get logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { from, to, limit } = req.query;
  const id = req.params._id;

  try {
    const user = await User.findById(id);
    if (!user) return res.send('Could not find user');

    let dateObj = {};
    if (from) dateObj['$gte'] = new Date(from);
    if (to) dateObj['$lte'] = new Date(to);

    let filter = { user_id: id };
    if (from || to) filter.date = dateObj;

    const exercises = await Exercise.find(filter).limit(parseInt(limit) || 500);

    const log = exercises.map(e => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString()
    }));

    res.json({
      username: user.username,
      count: exercises.length,
      _id: user._id,
      log
    });
  } catch (err) {
    console.error(err);
    res.send('Error retrieving logs');
  }
});

// Listener
const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});