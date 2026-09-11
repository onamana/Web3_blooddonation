import "dotenv/config";
import { createApp } from "./app.js";

const port = process.env.PORT || 4000;
createApp().listen(port, process.env.HOST || '0.0.0.0', () => console.log(`backend listening on port ${port}`));
