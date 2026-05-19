import { serverCache } from "@middlewares/cache";
import controller from "@otakudesu/controllers/otakudesuController";
import express from "express";
import { getAnimeSearch } from "@otakudesu/search"; // ⬅️ tambahin ini

const otakudesuRoute = express.Router();

otakudesuRoute
  .get("/", controller.getMainView)
  .get("/view-data", serverCache(), controller.getMainViewData)
  .get("/home", serverCache(10), controller.getHome)
  .get("/schedule", serverCache(10), controller.getSchedule)
  .get("/anime", serverCache(10), controller.getAllAnimes)
  .get("/genres", serverCache(), controller.getAllGenres)
  .get("/ongoing", serverCache(10), controller.getOngoingAnimes)
  .get("/completed", serverCache(10), controller.getCompletedAnimes)

  // 🆕 REPLACE: search bawaan diganti ke search baru yang langsung tembak otakudesu.cloud
  .get("/search", serverCache(5), async (req, res) => {
    const query = req.query.q as string;
    if (!query) {
      return res.status(400).json({ ok: false, message: "Query kosong" });
    }

    try {
      const data = await getAnimeSearch(query);
      res.json({
        ok: true,
        statusCode: 200,
        statusMessage: "Success",
        data,
      });
    } catch (err: any) {
      console.error("Error:", err.message);
      res.status(500).json({
        ok: false,
        statusCode: 500,
        message: err.message,
        data: null,
      });
    }
  })

  .get("/genres/:genreId", serverCache(10), controller.getGenreAnimes)
  .get("/anime/:animeId", serverCache(30), controller.getAnimeDetails)
  .get("/episode/:episodeId", serverCache(30), controller.getAnimeEpisode)
  .get("/server/:serverId", serverCache(3), controller.getServerUrl)
  .post("/server/:serverId", serverCache(3), controller.getServerUrl)
  .get("/batch/:batchId", serverCache(30), controller.getAnimeBatch);

export default otakudesuRoute;
