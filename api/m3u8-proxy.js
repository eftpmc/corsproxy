import https from "https";
import http from "http";
import stream from "stream";

const handler = async (request, response) => {
  const videoUrl = request.query.url;
  if (!videoUrl) {
    return response.status(400).send('The url parameter is required');
  }

  // Set CORS headers
  response.setHeader('Access-Control-Allow-Origin', 'http://localhost:5173');
  response.setHeader('Access-Control-Allow-Methods', 'GET');
  response.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  const parsedUrl = new URL(videoUrl);

  const requestOptions = {
    method: 'GET',
    hostname: parsedUrl.hostname,
    port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
    path: parsedUrl.pathname + parsedUrl.search,
    timeout: 10000, // Adjust the timeout value as needed
  };

  const httpModule = parsedUrl.protocol === 'https:' ? https : http;

  const req = httpModule.request(requestOptions, (res) => {
    const contentType = res.headers['content-type'];
    if (
      contentType === 'application/vnd.apple.mpegurl' ||
      contentType === 'application/x-mpegURL'
    ) {
      response.setHeader('Content-Type', contentType);

      const transformer = new stream.Transform({
        transform(chunk, encoding, callback) {
          const baseUrl = videoUrl.slice(0, videoUrl.lastIndexOf('/') + 1);
          const lines = chunk.toString().split('\n');
          const modifiedLines = lines.map((line) => {
            line = line.trim();
            if (line.endsWith('.ts') || line.endsWith('.m3u8')) {
              const path = line;
              const modifiedUrl = `/m3u8-proxy?url=${encodeURIComponent(baseUrl + path)}`;
              console.log('Modified URL:', modifiedUrl);
              return modifiedUrl;
            }
            return line;
          });
          const modifiedChunk = modifiedLines.join('\n');
          callback(null, modifiedChunk);
        },
      });

      res.pipe(transformer).pipe(response);
    } else {
      res.pipe(response);
    }
  });

  req.on('error', (error) => {
    console.error('Error during request:', error);
    response.status(500).send('An error occurred while fetching the video from the server');
  });

  req.end();
};

module.exports = handler;
