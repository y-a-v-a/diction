// Vercel serverless entry point.
//
// An Express application instance is itself a valid (req, res) request handler,
// so exporting it as the default export lets Vercel's Node.js runtime route
// every incoming request through the full app — middleware, routes and all.
//
// All non-asset routes are rewritten to this function by vercel.json.
import app from '../app.js';

export default app;
