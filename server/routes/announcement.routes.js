import express from "express";
import { createAnnouncement, getAnnouncementHistory, getLatestAnnouncement, getAnnouncementStats, getSystemStatus } from "../controllers/announcement.controller.js";

const router = express.Router();

router.post("/", createAnnouncement);
router.get("/latest", getLatestAnnouncement);
router.get("/history", getAnnouncementHistory);
router.get("/stats", getAnnouncementStats);
router.get("/status", getSystemStatus);

export default router;
