import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim();
  const limit = Number(searchParams.get("limit") ?? "20");
  const offset = Number(searchParams.get("offset") ?? "0");

  const apiKey = process.env.GIPHY_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Missing GIPHY_API_KEY" }, { status: 500 });
  }

  if (!q) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  const url = new URL("https://api.giphy.com/v1/gifs/search");
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("q", q);
  url.searchParams.set("limit", String(Math.min(limit, 30)));
  url.searchParams.set("offset", String(offset));
  url.searchParams.set("rating", "g");
  url.searchParams.set("lang", "en");

  const res = await fetch(url.toString(), {
    cache: "no-store",
  });

  if (!res.ok) {
    return NextResponse.json(
      { error: `Giphy request failed with status ${res.status}` },
      { status: res.status }
    );
  }

  const data = await res.json();

  const gifs = (data.data ?? []).map((g: any) => ({
    id: g.id,
    title: g.title,
    url: g.images?.fixed_height?.url ?? g.images?.original?.url ?? "",
    preview: g.images?.fixed_height_small?.url ?? g.images?.fixed_height?.url ?? "",
    width: Number(g.images?.fixed_height?.width ?? 200),
    height: Number(g.images?.fixed_height?.height ?? 150),
  }));

  return NextResponse.json({ gifs });
}