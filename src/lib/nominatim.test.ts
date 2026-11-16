import { afterEach, describe, expect, it, vi } from "vitest";
import {
  METRO_CEBU,
  NOMINATIM_HEADERS,
  RENTAL_PLACE_SEARCH,
  buildPlaceSearchUrl,
  searchPlaces,
  shortPlaceName,
} from "./nominatim";

// Stands in for Nominatim: every fetch answers with `body` and `status`.
function stubNominatim(body: unknown, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("buildPlaceSearchUrl", () => {
  it("asks for at most 5 places as JSON, from anywhere by default", () => {
    const url = new URL(buildPlaceSearchUrl("IT Park"));
    expect(url.origin + url.pathname).toBe(
      "https://nominatim.openstreetmap.org/search",
    );
    expect(url.searchParams.get("format")).toBe("json");
    expect(url.searchParams.get("q")).toBe("IT Park");
    expect(url.searchParams.get("limit")).toBe("5");
    expect(url.searchParams.has("countrycodes")).toBe(false);
    expect(url.searchParams.has("viewbox")).toBe(false);
  });

  it("ranks an area first without leaving the rest out", () => {
    const url = new URL(
      buildPlaceSearchUrl("IT Park", { preferArea: METRO_CEBU }),
    );
    // west,north,east,south
    expect(url.searchParams.get("viewbox")).toBe("123.75,10.45,124.05,10.2");
    expect(url.searchParams.get("bounded")).toBe("0");
  });

  it("searches the Philippines for renters, Metro Cebu first", () => {
    const url = new URL(
      buildPlaceSearchUrl("IT Park", { ...RENTAL_PLACE_SEARCH, limit: 1 }),
    );
    expect(url.searchParams.get("countrycodes")).toBe("ph");
    expect(url.searchParams.get("viewbox")).toBe("123.75,10.45,124.05,10.2");
    expect(url.searchParams.get("bounded")).toBe("0");
    expect(url.searchParams.get("limit")).toBe("1");
  });

  it("limits the search to the given countries", () => {
    const url = new URL(
      buildPlaceSearchUrl("USC", { countryCodes: ["ph"], limit: 3 }),
    );
    expect(url.searchParams.get("countrycodes")).toBe("ph");
    expect(url.searchParams.get("limit")).toBe("3");
  });

  it("trims the query and encodes it", () => {
    const url = buildPlaceSearchUrl("  Gorordo Ave & Lahug  ");
    expect(new URL(url).searchParams.get("q")).toBe("Gorordo Ave & Lahug");
    expect(url).not.toContain(" ");
    expect(url).toContain("Gorordo+Ave+%26+Lahug");
  });
});

describe("shortPlaceName", () => {
  it("keeps the first part of the full name", () => {
    expect(
      shortPlaceName(
        "University of San Carlos, Nasipit Road, Talamban, Cebu City, Central Visayas, 6000, Philippines",
      ),
    ).toBe("University of San Carlos");
  });

  it("keeps the street with a house number", () => {
    expect(shortPlaceName("12, Gorordo Avenue, Lahug, Cebu City")).toBe(
      "12 Gorordo Avenue",
    );
  });

  it("copes with a name without commas", () => {
    expect(shortPlaceName("  Cebu City ")).toBe("Cebu City");
  });
});

describe("searchPlaces", () => {
  it("returns the places with their coordinates as numbers", async () => {
    stubNominatim([
      {
        place_id: 101,
        display_name: "IT Park, Apas, Cebu City, Philippines",
        lat: "10.3302",
        lon: "123.9060",
      },
    ]);
    await expect(searchPlaces("IT Park")).resolves.toEqual([
      {
        id: 101,
        name: "IT Park, Apas, Cebu City, Philippines",
        shortName: "IT Park",
        lat: 10.3302,
        lng: 123.906,
      },
    ]);
  });

  it("drops places without a name or usable coordinates", async () => {
    stubNominatim([
      { place_id: 1, display_name: "No latitude", lon: "123.9" },
      { place_id: 2, display_name: "Empty latitude", lat: "", lon: "123.9" },
      { place_id: 3, display_name: "Bad longitude", lat: "10.3", lon: "east" },
      { place_id: 4, lat: "10.3", lon: "123.9" },
      {
        place_id: 5,
        display_name: "Lahug, Cebu City",
        lat: "10.32",
        lon: "123.9",
      },
    ]);
    const places = await searchPlaces("Lahug");
    expect(places.map((place) => place.id)).toEqual([5]);
  });

  it("returns an empty list when nothing matches", async () => {
    stubNominatim([]);
    await expect(searchPlaces("Nowhere at all")).resolves.toEqual([]);
  });

  it("doesn't call Nominatim for a blank query", async () => {
    const fetchMock = stubNominatim([]);
    await expect(searchPlaces("   ")).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends the search address and the identifying headers", async () => {
    const fetchMock = stubNominatim([]);
    await searchPlaces("USC", { countryCodes: ["ph"] });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(buildPlaceSearchUrl("USC", { countryCodes: ["ph"] }));
    expect(init).toEqual({ headers: NOMINATIM_HEADERS });
  });

  it("throws when Nominatim answers with an error", async () => {
    stubNominatim({ error: "Too many requests" }, 429);
    await expect(searchPlaces("USC")).rejects.toThrow("HTTP 429");
  });

  it("throws when Nominatim can't be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new TypeError("Failed to fetch")),
    );
    await expect(searchPlaces("USC")).rejects.toThrow("Failed to fetch");
  });
});
