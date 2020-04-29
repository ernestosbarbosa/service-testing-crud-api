import { Router, Request, Response, NextFunction } from 'express';
import { Mutex } from 'async-mutex';
import * as bodyParser from 'body-parser';
import * as cors from 'cors';
import * as delay from 'randelay'
import * as loki from 'lokijs';
import * as rateLimit from 'express-rate-limit'
import * as timeoutHandler from 'express-timeout-handler';

const MAX_CONNECTIONS = 500;
const TIMEOUT = 60000;

const db = new loki('db.json');
const mutex = new Mutex();
const router: Router = Router();

let uniqueId = 0;

router.use(cors());
router.use(bodyParser.json({ limit: '50mb' }));
router.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }));
router.use(rateLimit(
    {
        max: MAX_CONNECTIONS,
        windowMs: 1000,
        message: "Max connections",
        onLimitReached: function (req, res, options) {
            //console.log(req.rateLimit)
        }
    }
))
router.use(timeoutHandler.set(TIMEOUT));
router.use((req: Request, res: Response, next: NextFunction) => {
    delay(100, '5s').then(() => {
        next();
    })
})

router.get('/', (req: Request, res: Response) => {
    return res.status(501).send();
});

router.get('/:resource', (req: Request, res: Response) => {
    const resourceTable = db.addCollection(req.params.resource);
    let resource = resourceTable.find();
    if (!resource) {
        return res.status(404).send();
    }
    //console.log(`find ${req.params.resource}`)
    return res.status(200).send(resource);
});

router.get('/:resource/:id', (req: Request, res: Response) => {
    let resourceTable = db.addCollection(req.params.resource);
    let resource = resourceTable.findOne({ id: parseInt(req.params.id) });
    if (!resource) {
        return res.status(404).send();
    }
    //console.log(`find  ${req.params.resource}/${req.params.id}`)
    return res.status(200).send(resource);
});

router.post('/:resource', async (req: Request, res: Response) => {
    let resourceTable = db.addCollection(req.params.resource);
    const release = await mutex.acquire();
    try {
        let body = req.body;
        body.id = uniqueId++;
        resourceTable.insert(req.body);
        //console.log(`insert ${req.params.resource}/${uniqueId}`)
        return res.status(201).send(body);
    } finally {
        release();
    }
});

router.put('/:resource/:id', async (req: Request, res: Response) => {
    let resourceTable = db.addCollection(req.params.resource);
    let resource = resourceTable.findOne({ id: parseInt(req.body.id) });
    if (!resource) {
        return res.status(404).send();
    }
    const release = await mutex.acquire();
    try {
        resourceTable.update(resource);
        //console.log(`updated ${req.params.resource}/${uniqueId}`)
        return res.status(204).send();
    } finally {
        release();
    }
});

router.delete('/:resource/:id', async (req: Request, res: Response) => {
    let resourceTable = db.addCollection(req.params.resource);
    let resource = resourceTable.findOne({ id: parseInt(req.params.id) });
    if (!resource) {
        return res.status(404).send();
    }
    const release = await mutex.acquire();
    try {
        resourceTable.remove(resource);
        //console.log(`deleted ${req.params.resource}/${uniqueId}`)
        return res.status(200).send();
    } finally {
        release();
    }
});

export const ResourceController: Router = router;