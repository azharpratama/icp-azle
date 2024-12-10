// cannister code goes here
import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic } from "azle";
import express from "express";

export default Server(() => {
    /**
        This type represents a message that can be listed on a board.
    */
    class Message {
        id: string;
        title: string;
        body: string;
        attachmentURL: string;
        createdAt: Date;
        updatedAt: Date | null
    }

    const messagesStorage = StableBTreeMap<string, Message>(0);

    const app = express();
    app.use(express.json());

    function handleMessageUpdateOrDelete(req, res, action) {
        const messageId = req.params.id;
        const messageOpt = messagesStorage.get(messageId);
        if (!messageOpt) {
            return res.status(400).send(`Message with id=${messageId} not found`);
        }
        const message = messageOpt.Some;

        if (action === 'update') {
            const updatedMessage = { ...message, ...req.body, updatedAt: getCurrentDate() };
            messagesStorage.insert(message.id, updatedMessage);
            res.json(updatedMessage);
        } else if (action === 'delete') {
            const deletedMessage = messagesStorage.remove(messageId);
            res.json(deletedMessage.Some);
        }
    }

    app.post("/messages", (req, res) => {
        const { title, body, attachmentURL } = req.body;

        // Validate required fields
        if (!title || !body) {
            return res.status(400).send('Title and Body are required');
        }

        const message: Message = { id: uuidv4(), createdAt: getCurrentDate(), ...req.body };
        messagesStorage.insert(message.id, message);
        res.json(message);
    });

    app.get("/messages", (req, res) => {
        res.json(messagesStorage.values());
    });

    app.get("/messages/:id", (req, res) => {
        const messageId = req.params.id;
        const messageOpt = messagesStorage.get(messageId);
        if (!messageOpt) {
            res.status(404).send(`the message with id=${messageId} not found`);
        } else {
            res.json(messageOpt.Some);
        }
    });

    app.put("/messages/:id", (req, res) => {
        const messageId = req.params.id;
        const messageOpt = messagesStorage.get(messageId);
        if (!messageOpt) {
            res.status(400).send(`couldn't update a message with id=${messageId}. message not found`);
        } else {
            const message = messageOpt.Some;
            const updatedMessage = { ...message, ...req.body, updatedAt: getCurrentDate() };
            messagesStorage.insert(message!.id, updatedMessage);
            res.json(updatedMessage);
        }
    });

    app.delete("/messages/:id", (req, res) => {
        const messageId = req.params.id;
        const deletedMessage = messagesStorage.remove(messageId);
        if (!deletedMessage) {
            res.status(400).send(`couldn't delete a message with id=${messageId}. message not found`);
        } else {
            res.json(deletedMessage.Some);
        }
    });

    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).send('Something went wrong!');
    });
    

    function getCurrentDate() {
        const timestamp = new Number(ic.time());
        return new Date(timestamp.valueOf() / 1000_000);
    }

    return app.listen();
});