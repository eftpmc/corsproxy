const express = require('express');
const cors = require('cors');
const axios = require('axios');
const stream = require('stream');
const app = express();
const port = 3000;

app.use(cors());

app.get('/', async (req, res) => {
  const videoUrl = req.query.url;

  console.log('Received request with video URL:', videoUrl);

  if (!videoUrl) {
    console.log('Error: Missing url parameter');
    res.status(400).send('The url parameter is required');
    return;
  }

  try {
    // Stream the content instead of fetching it in its entirety
    const axiosStream = await axios.get(videoUrl, {
      responseType: 'stream',
      timeout: 5000
    });

    // Properly setting content-type for m3u8 files
    const contentType = axiosStream.headers['content-type'];
    if (contentType === 'application/vnd.apple.mpegurl' || contentType === 'application/x-mpegURL') {
      res.set('Content-Type', contentType);

      // Transform the stream to modify the URLs in the playlist
      const transformer = new stream.Transform({
        transform(chunk, encoding, callback) {
          const baseUrl = videoUrl.slice(0, videoUrl.lastIndexOf('/') + 1);
          const lines = chunk.toString().split('\n');
          const modifiedLines = lines.map(line => {
            line = line.trim();
            if (line.endsWith('.ts') || line.endsWith('.m3u8')) {
              const path = line;
              const modifiedUrl = `http://localhost:3000/?url=${encodeURIComponent(baseUrl + path)}`;
              console.log('Modified URL:', modifiedUrl);
              return modifiedUrl;
            }
            return line;
          });
          const modifiedChunk = modifiedLines.join('\n');
          callback(null, modifiedChunk);
        }
      });
      

      // Pipe the transformed data to the client
      axiosStream.data.pipe(transformer).pipe(res);

    } else {
      // For other content types, just pipe through
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
