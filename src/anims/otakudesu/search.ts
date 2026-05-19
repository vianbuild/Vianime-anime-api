import animeConfig from "@configs/animeConfig";
import { wajikFetch } from "@services/dataFetcher";

export async function getAnimeSearch(query: string) {
  const baseUrl = animeConfig.baseUrl.otakudesu;
  const url = `${baseUrl}/?s=${encodeURIComponent(query)}&post_type=anime`;

  return wajikFetch(url, baseUrl, {
    method: "GET",
    responseType: "text",
    timeout: 15000,
  });
}
