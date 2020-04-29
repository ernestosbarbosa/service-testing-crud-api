import * as express from 'express';
import { ResourceController } from './controllers';

const app: express.Application = express();
const port = process.env.PORT || 2345;

app.use('/', ResourceController);
app.enable('trust proxy');
app.disable('etag');

app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}/`);
}).setTimeout(10000);