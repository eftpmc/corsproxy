const express = require('express');
const cors = require('cors');
const axios = require('axios');
const stream = require('stream');
const app = express();

const port = process.env.PORT || 3000;
const baseUrl = process.env.BASE_URL || `http://localhost:${port}`;

app.use(cors());

app.get('/', async (req, res) => {
  const videoUrl = req.query.url;

  if (!videoUrl) {
    return res.status(400).send('The url parameter is required');
  }

  try {
    const axiosStream = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 5000,
    });

    const contentType = axiosStream.headers['content-type'];
    if (contentType === 'application/vnd.apple.mpegurl' || contentType === 'application/x-mpegURL') {
      res.set('Content-Type', contentType);

      const transformer = new stream.Transform({
        transform(chunk, encoding, callback) {
          const lines = chunk.toString().split('\n');
          const modifiedLines = lines.map(line => {
            line = line.trim();
            if (line.endsWith('.ts') || line.endsWith('.m3u8')) {
              const path = line;
              const modifiedUrl = `${baseUrl}/?url=${encodeURIComponent(videoUrl.slice(0, videoUrl.lastIndexOf('/') + 1) + path)}`;
              return modifiedUrl;
            }
            return line;
          });
          const modifiedChunk = modifiedLines.join('\n');
          callback(null, modifiedChunk);
        },
      });

      axiosStream.data.pipe(transformer).pipe(res);
    } else {
      axiosStream.data.pipe(res);
    }
  } catch (error) {
    console.error('Caught error during request:', error);
    if (error.response) {
      console.error('Error response from the server:', error.response.data);
      res.status(500).send('Error occurred while fetching the video from the server');
    } else if (error.request) {
      console.error('No response received:', error.request);
      res.status(500).send('No response received from the video server');
    } else {
      console.error('Error', error.message);
      res.status(500).send('An unknown error occurred');
    }
  }
});

app.listen(port, () => {
  console.log(`CORS proxy server is running on port ${port}`);
});
