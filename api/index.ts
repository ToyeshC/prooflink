import { getRequestListener } from '@hono/node-server';
import { app } from '../src/api/oracle.js';

export default getRequestListener(app.fetch);
