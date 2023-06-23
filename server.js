const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const port = 3000;

const corsOptions = {
  origin: ['http://localhost:5173', 'https://aritools.vercel.app/'],
};

app.use(cors(corsOptions));

app.get('/', async (req, res) => {
  const videoUrl = req.query.url;

  console.log('Received request with video URL:', videoUrl);

  if (!videoUrl) {
    console.log('Error: Missing url parameter');
    res.status(400).send('The url parameter is required');
    return;
  }

  try {
    const response = await axios.get(videoUrl, { responseType: 'arraybuffer' });
    const contentType = response.headers['content-type'];

    console.log('Fetched content with type:', contentType);

    if (contentType === 'application/vnd.apple.mpegurl' || contentType === 'application/x-mpegURL') {
      const baseUrl = videoUrl.slice(0, videoUrl.lastIndexOf('/') + 1);
      
      const modifiedPlaylist = response.data.toString().split('\n')
        .map(line => {
          if (line.endsWith('.ts') || line.endsWith('.m3u8')) {
            const path = encodeURIComponent(line);
            const modifiedUrl = `https://corsproxy-kohl.vercel.app/?url=${baseUrl}${path}`;
            console.log('Modified URL:', modifiedUrl);
            return modifiedUrl;
          }
          return line;
        })
        .join('\n');

      console.log('Sending modified playlist');
      res.set('Content-Type', contentType);
      res.send(modifiedPlaylist);
    } else {
      console.log('Sending content as is');
      res.set('Content-Type', contentType);
      res.send(Buffer.from(response.data, 'binary'));
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
