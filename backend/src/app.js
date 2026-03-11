const express = require("express");
const helmet = require("helmet");
const cors = require("cors");
const morgan = require("morgan");

const requestContext = require("./middleware/requestContext");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");

const app = express();

app.use(helmet());
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(requestContext);
app.use(morgan("combined"));

app.get("/health", (_req, res) => {
  res.status(200).json({ ok: true, service: "ai-interview-copilot-backend" });
});

app.use("/v1", routes);
app.use(notFound);
app.use(errorHandler);

module.exports = app;
