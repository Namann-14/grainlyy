import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL,
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({
  extended: true,
  limit: "50kb",
}));
app.use(cookieParser());

// Import routes
import deliveryRiderRoutes from "./routes/deliveryRider.routes.js";

app.use("/api/delivery", deliveryRiderRoutes);

export default app;