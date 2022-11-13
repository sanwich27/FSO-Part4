const blogsRouter = require('express').Router();
const Blog = require('../models/blog');

blogsRouter.get('/', async (request, response) => {
  const blogs = await Blog.find({}).populate('user', { blogs: 0 });
  response.json(blogs);
});

blogsRouter.post('/', async (request, response) => {
  const { body, user } = request;

  if (!user) {
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  const blog = new Blog({
    title: body.title,
    author: body.author,
    url: body.url,
    likes: body.likes,
    user: user._id,
  });

  const savedBlog = await blog.save();
  user.blogs = user.blogs.concat(savedBlog._id);
  await user.save();

  response.status(201).json(savedBlog);
});

blogsRouter.delete('/:id', async (request, response) => {
  const blogToDelete = await Blog.findById(request.params.id);
  const { user } = request;

  if (!user) {
    return response.status(401).json({ error: 'token missing or invalid' });
  }

  if (blogToDelete.user._id.toString() !== user._id.toString()) {
    return response.status(401).json({ error: 'only the creator of the blog is authorized' });
  }

  await Blog.findByIdAndRemove(blogToDelete._id);
  user.blogs = user.blogs
    .filter((blog) => blog._id.toString() !== blogToDelete._id.toString());
  await user.save();
  response.status(204).end();
});

blogsRouter.put('/:id', async (request, response) => {
  const { user } = request;
  if (!user) {
    return response.status(401).json({ error: 'token missing or invalid' });
  }
  const blogToUpdate = await Blog.findById(request.params.id);
  if (blogToUpdate.user._id.toString() !== user._id.toString()) {
    return response.status(401).json({ error: 'only the creator of the blog is authorized' });
  }

  const {
    title, url, author, likes,
  } = request.body;

  const updatedBlog = await Blog.findByIdAndUpdate(
    request.params.id,
    {
      title, author, url, likes,
    },
    { new: true, runValidators: true, context: 'query' },
  );

  response.json(updatedBlog);
});

module.exports = blogsRouter;
