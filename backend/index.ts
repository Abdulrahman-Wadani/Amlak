// Import the express in typescript file
import express from 'express';
import { prisma } from './prisma';

// Initialize the express engine
const app: express.Application = express();

// Take a port 3000 for running server.
const port: number = 3000;
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        res.sendStatus(204);
        return;
    }
    next();
});

// Handling '/' Request
app.get('/', (req, res) => {
    prisma.user.findMany().then((users: Awaited<ReturnType<typeof prisma.user.findMany>>) => {
        res.json(users);
    });
});

// Server setup
app.listen(port, () => {
    console.log(`TypeScript with Express 
         http://localhost:${port}/`);
});