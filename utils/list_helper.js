const _ = require('lodash');

const totalLikes = (blogs) => blogs
  .map((blog) => blog.likes)
  .reduce((sum, item) => sum + item, 0);

const favoriteBlog = (blogs) => {
  if (blogs.length === 0) {
    return {};
  }
  const maxLikes = Math.max(...blogs.map((blog) => blog.likes));
  const { title, author, likes } = blogs.find((blog) => blog.likes === maxLikes);
  return { title, author, likes };
};

const mostBlogs = (blogs) => {
  if (blogs.length === 0) {
    return {};
  }
  const authorList = blogs.map((blog) => blog.author);
  const authorMap = new Map();
  let counter;
  authorList.forEach((author) => {
    counter = authorMap.get(author);
    if (!counter) {
      authorMap.set(author, 1);
    } else {
      authorMap.set(author, counter + 1);
    }
  });

  let max = 0;
  let maxAuthor = '';
  authorMap.forEach((value, key) => {
    if (value > max) {
      max = value;
      maxAuthor = key;
    }
  });
  return { author: maxAuthor, blogs: max };
};

const mostLikes = (blogs) => {
  if (blogs.length === 0) {
    return {};
  }
  let sumOfLikes = 0;
  let max = 0;
  let maxAuthor = '';
  const result = _.groupBy(blogs, 'author');
  Object.entries(result).forEach(([key, value]) => {
    sumOfLikes = _.sumBy(value, 'likes');
    if (sumOfLikes > max) {
      max = sumOfLikes;
      maxAuthor = key;
    }
  });
  return { author: maxAuthor, likes: max };
};

module.exports = {
  totalLikes, favoriteBlog, mostBlogs, mostLikes,
};
