import "dotenv/config";
import { createApp } from "./app.js";
import { accessConfig } from './config/access.js';

const port = process.env.PORT || 4000;
createApp().listen(port, accessConfig().host, () => console.log(`backend listening on port ${port}`));
