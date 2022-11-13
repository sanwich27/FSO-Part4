const mongoose = require('mongoose');
const cors = require('cors');
const express = require('express');
require('express-async-errors');
const morgan = require('morgan');
const config = require('./utils/config');
const middleware = require('./utils/middleware');
const { info, error } = require('./utils/logger');
const blogsRouter = require('./controllers/blogs');
const usersRouter = require('./controllers/users');
const loginRouter = require('./controllers/login');

const app = express();

info('connecting to', config.MONGODB_URI);

mongoose.connect(config.MONGODB_URI)
  .then(() => {
    info('connected to MongoDB');
  })
  .catch((err) => {
    error('error connecting to MongoDB:', err.message);
  });

app.use(cors());
app.use(express.static('build'));
app.use(express.json());

morgan.token('body', (req, res) => JSON.stringify(req.body)); // eslint-disable-line no-unused-vars
app.use(morgan(':method :url :status :res[content-length] - :response-time ms :body'));

app.use(middleware.tokenExtractor);

app.use('/api/blogs', middleware.userExtractor, blogsRouter);
app.use('/api/users', usersRouter);
app.use('/api/login', loginRouter);

app.use(middleware.unknownEndpoint);
app.use(middleware.errorHandler);

module.exports = app;
