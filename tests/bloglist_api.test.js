const mongoose = require('mongoose');
const supertest = require('supertest');
const bcrypt = require('bcrypt');
const User = require('../models/user');
const Blog = require('../models/blog');
const app = require('../app');

const api = supertest(app);

beforeEach(async () => {
  await User.deleteMany({});
  const passwordHash = await bcrypt.hash('0117', 10);
  const user = new User({ username: 'xyl', passwordHash });
  await user.save();

  const { body: { token } } = await api // nested destructure
    .post('/api/login')
    .send({ username: 'xyl', password: '0117' });

  await Blog.deleteMany({});
  const newBlog = {
    title: 'testing token',
    author: 'xyl',
    url: 'test!',
  };

  const newBlog2 = {
    title: 'another new blog',
    author: 'xyl',
    url: 'test!',
  };

  await api
    .post('/api/blogs')
    .set('Authorization', `bearer ${token}`)
    .send(newBlog);
  await api
    .post('/api/blogs')
    .set('Authorization', `bearer ${token}`)
    .send(newBlog2);
});
describe('When there is initially one user in db', () => {
  test('creation succeeds with a fresh username', async () => {
    const { body: usersAtStart } = await api.get('/api/users');

    const newUser = {
      username: 'mluukkai',
      name: 'Matti Luukkainen',
      password: 'salainen',
    };

    await api
      .post('/api/users')
      .send(newUser)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const { body: usersAtEnd } = await api.get('/api/users');
    expect(usersAtEnd).toHaveLength(usersAtStart.length + 1);

    const usernames = usersAtEnd.map((user) => user.username);
    expect(usernames).toContain(newUser.username);
  });
});

describe('User creation fails with proper statuscode and message if', () => {
  test('username already taken', async () => {
    const { body: usersAtStart } = await api.get('/api/users');

    const newUser = {
      username: 'xyl',
      password: 'salainen',
    };

    const result = await api
      .post('/api/users')
      .send(newUser)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(result.body.error).toContain('username must be unique');

    const { body: usersAtEnd } = await api.get('/api/users');
    expect(usersAtEnd).toEqual(usersAtStart);
  });
  test('password is absent or invalid', async () => {
    const { body: usersAtStart } = await api.get('/api/users');

    const userAbsent = {
      username: 'boot',
      name: 'Superuser',
    };

    const userInvalid = {
      username: 'Clara',
      password: 'ff',
    };

    const resultAbsent = await api
      .post('/api/users')
      .send(userAbsent)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    const resultInvalid = await api
      .post('/api/users')
      .send(userInvalid)
      .expect(400)
      .expect('Content-Type', /application\/json/);

    expect(resultAbsent.body.error).toContain('password is absent');
    expect(resultInvalid.body.error).toContain('password should be at least 3 characters');

    const { body: usersAtEnd } = await api.get('/api/users');
    expect(usersAtEnd).toEqual(usersAtStart);
  });
});

describe('Sending GET request to /api/blogs', () => {
  test('blogs are returned as json', async () => {
    await api
      .get('/api/blogs')
      .expect(200)
      .expect('Content-Type', /application\/json/);
  });

  test('all blogs are returned', async () => {
    const { body: allBlogs } = await api.get('/api/blogs');

    expect(allBlogs).toHaveLength(2);
  });

  test('a specific blog is within the returned blogs', async () => {
    const response = await api.get('/api/blogs');

    const titles = response.body.map((blog) => blog.title);
    expect(titles).toContain(
      'testing token',
    );
  });
  test('blog has property "id"', async () => {
    const response = await api.get('/api/blogs');

    expect(response.body[0].id).toBeDefined();
  });
});

describe('Adding a new blog with a valid token', () => {
  test('a valid blog can be added', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');

    const newBlog = {
      title: 'blahblah',
      author: 'xyl',
      url: 'www.piyan.com',
      likes: 123,
    };
    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);
    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const response = await api.get('/api/blogs');
    const titles = response.body.map((blog) => blog.title);

    expect(response.body).toHaveLength(blogsAtStart.length + 1);
    expect(titles).toContain('blahblah');
  });
  test('a blog post\'s likes will be default to 0', async () => {
    const newBlog = {
      title: 'blahblah',
      author: 'xyl',
      url: 'www.piyan.com',
    };
    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);
    const response = await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    expect(response.body.likes).toBe(0);
  });
  test('a blog without title or url is not added', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');

    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);
    const blogWithoutTitle = {
      author: 'John Cena',
      url: 'www.johncena.com',
      likes: 198964,
    };
    const blogWithoutUrl = {
      title: 'just a new blog',
      author: 'John Cena',
      likes: 198964,
    };
    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(blogWithoutTitle)
      .expect(400);

    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(blogWithoutUrl)
      .expect(400);

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
});

describe('Add a new blog with right or wrong tokens', () => {
  test('user is existed', async () => {
    const response = await api
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);
    expect(response.body.token).toBeDefined();
  });
  test('succeed with valid token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');

    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);

    const newBlog = {
      title: 'add blog with valid token',
      author: 'xyl',
      url: 'test!',
    };

    await api
      .post('/api/blogs')
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(201)
      .expect('Content-Type', /application\/json/);

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    const titles = blogsAtEnd.map((blog) => blog.title);

    expect(blogsAtEnd).toHaveLength(blogsAtStart.length + 1);
    expect(titles).toContain('add blog with valid token');
  });
  test('fail with invalid token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');

    const newBlog = {
      title: 'This blog should not exist',
      author: 'xyl',
      url: 'test!',
    };

    const result = await api
      .post('/api/blogs')
      .set('Authorization', 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Inh5bCIsImlkIjoiNjM2Y2Y0ZDJhMWQwZGJjOWE1ZDY5ZDBmIiwiaWF0IjoxNjY4MTMzODk0LCJleHAiOjE2NjgxMzc0OTR9.D1xVIxqZMVv5YbLnmmSiEeO_pBf2Ahf9ZU5cUGZ6lHZ')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/);
    expect(result.body.error).toBe('invalid token');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
  test('fail without token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');
    const newBlog = {
      title: 'This blog should not exist',
      author: 'xyl',
      url: 'test!',
    };

    const result = await api
      .post('/api/blogs')
      .set('Authorization', 'bearer')
      .send(newBlog)
      .expect(401)
      .expect('Content-Type', /application\/json/);
    expect(result.body.error).toBe('token missing or invalid');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
});

describe('Updating a blog', () => {
  test('succeeds with same id but updated content', async () => {
    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);

    const { body: blogsAtStart } = await api.get('/api/blogs');
    const blogToUpdate = blogsAtStart[0];

    const newBlog = {
      title: 'this is a updated blog post',
      author: 'admin',
      url: 'www.testUpdate.com',
      likes: 1,
    };

    await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', `bearer ${token}`)
      .send(newBlog)
      .expect(200)
      .expect({ ...newBlog, user: blogToUpdate.user.id, id: blogToUpdate.id });
  });
  test('fails with invalid token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');
    const blogToUpdate = blogsAtStart[0];

    const response = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Inh5bCIsImlkIjoiNjM2Y2Y0ZDJhMWQwZGJjOWE1ZDY5ZDBmIiwiaWF0IjoxNjY4MTMzODk0LCJleHAiOjE2NjgxMzc0OTR9.D1xVIxqZMVv5YbLnmmSiEeO_pBf2Ahf9fffcUGZ6lHZ')
      .expect(401);
    expect(response.body.error).toBe('invalid token');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd[0]).toEqual(blogToUpdate);
  });
  test('fails with unauthorized user', async () => {
    const passwordHash = await bcrypt.hash('wrong', 10);
    const user = new User({ username: 'wronguser', passwordHash });
    await user.save();

    const wrongUser = await api
      .post('/api/login')
      .send({ username: 'wronguser', password: 'wrong' });

    const { body: blogsAtStart } = await api.get('/api/blogs');
    const blogToUpdate = blogsAtStart[0];

    const response = await api
      .put(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', `bearer ${wrongUser.body.token}`)
      .expect(401);
    expect(response.body.error).toBe('only the creator of the blog is authorized');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd[0]).toEqual(blogToUpdate);
  });
  test('fails without token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');
    const blogToUpdate = blogsAtStart[0];

    const result = await api
      .delete(`/api/blogs/${blogToUpdate.id}`)
      .set('Authorization', 'bearer')
      .expect(401)
      .expect('Content-Type', /application\/json/);
    expect(result.body.error).toBe('token missing or invalid');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd[0]).toEqual(blogToUpdate);
  });
});

describe('Deleting a blog with token', () => {
  test('succeeds with valid token', async () => {
    const { body: { token } } = await api // nested destructure
      .post('/api/login')
      .send({ username: 'xyl', password: '0117' })
      .expect(200);

    const { body: blogsAtStart } = await api.get('/api/blogs');

    await api
      .delete(`/api/blogs/${blogsAtStart[0].id}`)
      .set('Authorization', `bearer ${token}`)
      .expect(204);

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length - 1);
  });
  test('fails with invalid token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');

    const response = await api
      .delete(`/api/blogs/${blogsAtStart[0].id}`)
      .set('Authorization', 'bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Inh5bCIsImlkIjoiNjM2Y2Y0ZDJhMWQwZGJjOWE1ZDY5ZDBmIiwiaWF0IjoxNjY4MTMzODk0LCJleHAiOjE2NjgxMzc0OTR9.D1xVIxqZMVv5YbLnmmSiEeO_pBf2Ahf9fffcUGZ6lHZ')
      .expect(401);
    expect(response.body.error).toBe('invalid token');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
  test('fails with unauthorized user', async () => {
    const passwordHash = await bcrypt.hash('wrong', 10);
    const user = new User({ username: 'wronguser', passwordHash });
    await user.save();

    const wrongUser = await api
      .post('/api/login')
      .send({ username: 'wronguser', password: 'wrong' });

    const { body: blogsAtStart } = await api.get('/api/blogs');

    const response = await api
      .delete(`/api/blogs/${blogsAtStart[0].id}`)
      .set('Authorization', `bearer ${wrongUser.body.token}`)
      .expect(401);
    expect(response.body.error).toBe('only the creator of the blog is authorized');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
  test('fails without token', async () => {
    const { body: blogsAtStart } = await api.get('/api/blogs');
    const result = await api
      .delete(`/api/blogs/${blogsAtStart[0].id}`)
      .set('Authorization', 'bearer')
      .expect(401)
      .expect('Content-Type', /application\/json/);
    expect(result.body.error).toBe('token missing or invalid');

    const { body: blogsAtEnd } = await api.get('/api/blogs');
    expect(blogsAtEnd).toHaveLength(blogsAtStart.length);
  });
});

afterAll(() => {
  mongoose.connection.close();
});
