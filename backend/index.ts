// Import the express in typescript file
import express from 'express';
import { prisma } from './prisma';
// Initialize the express engine
const app: express.Application = express();

// Take a port 3000 for running server.
const port: number = 3000;

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