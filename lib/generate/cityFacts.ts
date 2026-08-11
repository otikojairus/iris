// Built-in city facts for the generator's local landing pages. Population figures
// reflect the 2021 Statistics Canada census (approximations). Unknown cities get a
// deterministic fallback so every generated city page still has local texture.

export type CityFact = {
  population: string;
  landmark: string;
  climate: string;
  region: string;
  neighbourhood: string;
};

const DATA: Record<string, CityFact> = {
  Toronto: { population: "about 2.79 million residents", landmark: "the CN Tower and Lake Ontario", climate: "a humid continental climate with freeze-thaw swings and winter storms", region: "the City of Toronto", neighbourhood: "the downtown core and the Queen West corridor" },
  Ottawa: { population: "about 1.02 million residents", landmark: "Parliament Hill and the Rideau Canal", climate: "a cold continental climate with deep frost and heavy snow", region: "the National Capital Region", neighbourhood: "the ByWard Market and the downtown core" },
  Mississauga: { population: "about 718,000 residents", landmark: "the Absolute World towers and the Credit River", climate: "a lake-moderated climate with lake-effect snow squalls", region: "the Regional Municipality of Peel", neighbourhood: "Square One and Port Credit" },
  Brampton: { population: "about 656,000 residents", landmark: "the Rose Theatre and Gage Park", climate: "a humid continental climate with heavy lake-effect snow", region: "the Regional Municipality of Peel", neighbourhood: "the downtown core and the Queen Street corridor" },
  Hamilton: { population: "about 569,000 residents", landmark: "the Niagara Escarpment and Dundurn Castle", climate: "an escarpment climate with strong winds off the harbour", region: "the Hamilton area", neighbourhood: "the downtown core and the industrial bayfront" },
  London: { population: "about 422,000 residents", landmark: "Victoria Park and the forks of the Thames", climate: "a humid continental climate with severe storms and winter ice", region: "southwestern Ontario", neighbourhood: "Richmond Row and the Wellington corridor" },
  Markham: { population: "about 338,000 residents", landmark: "the Markham Museum and Rouge National Urban Park", climate: "a humid continental climate with freeze-thaw cycles", region: "York Region", neighbourhood: "the Highway 7 corridor and the historic core" },
  Vaughan: { population: "about 323,000 residents", landmark: "Canada's Wonderland and the Humber River", climate: "a humid continental climate with snow-heavy winters", region: "York Region", neighbourhood: "the Vaughan Mills area and Woodbridge core" },
  Kitchener: { population: "about 256,000 residents", landmark: "the Grand River and Victoria Park", climate: "a humid continental climate with heavy rain events", region: "Waterloo Region", neighbourhood: "the downtown core and Belmont Village" },
  Windsor: { population: "about 230,000 residents", landmark: "the Detroit River and Windsor Sculpture Park", climate: "a humid continental climate with warm, wet summers", region: "southwestern Ontario", neighbourhood: "the downtown riverfront and Walkerville" },
  Burlington: { population: "about 187,000 residents", landmark: "the Royal Botanical Gardens and Lake Ontario", climate: "a lake-influenced climate with lake-effect snow", region: "Halton Region", neighbourhood: "the downtown lakeshore and the Appleby corridor" },
  Oshawa: { population: "about 183,000 residents", landmark: "Lake Ontario and the Parkwood Estate", climate: "a humid continental climate with lake-effect storms", region: "Durham Region", neighbourhood: "the downtown core and the Oshawa Creek valley" },
  Barrie: { population: "about 155,000 residents", landmark: "Lake Simcoe and the Heritage Estates district", climate: "a snowbelt climate with heavy lake-effect snow", region: "Simcoe County", neighbourhood: "the waterfront and the downtown core" },
  Oakville: { population: "about 213,000 residents", landmark: "Lake Ontario and Oakville Harbour", climate: "a lake-moderated climate with freeze-thaw winters", region: "Halton Region", neighbourhood: "the downtown core and Kerr Village" },
  Guelph: { population: "about 144,000 residents", landmark: "the Speed River and the University of Guelph", climate: "a humid continental climate with winter ice and wet falls", region: "Wellington County", neighbourhood: "St. George's Square and the downtown core" },
  Brantford: { population: "about 104,000 residents", landmark: "the Grand River and the Bell Homestead", climate: "a humid continental climate with freeze-thaw swings", region: "Brant County", neighbourhood: "the downtown core and the Grand River corridor" },
  Calgary: { population: "about 1.31 million residents", landmark: "the Bow River and the Calgary Tower", climate: "a semi-arid climate with chinook swings and summer hail", region: "the Calgary region", neighbourhood: "the Beltline and the Inglewood corridor" },
  Edmonton: { population: "about 1.04 million residents", landmark: "the North Saskatchewan River valley", climate: "a cold prairie climate with deep freezes and spring thaws", region: "the Edmonton Capital Region", neighbourhood: "the downtown core and Old Strathcona" },
  "Red Deer": { population: "about 100,000 residents", landmark: "the Red Deer River and Bower Ponds", climate: "a prairie climate with cold winters and spring runoff", region: "central Alberta", neighbourhood: "the downtown core and Riverside Meadows" },
  Lethbridge: { population: "about 99,000 residents", landmark: "the High Level Bridge and the coulees", climate: "a semi-arid climate with chinooks and summer hail", region: "southern Alberta", neighbourhood: "the downtown core and the Southminster area" },
  Vancouver: { population: "about 663,000 residents", landmark: "Stanley Park and the Burrard Inlet", climate: "a wet coastal climate with long rainy seasons", region: "Metro Vancouver", neighbourhood: "the downtown peninsula and Mount Pleasant" },
  Surrey: { population: "about 568,000 residents", landmark: "the Fraser River and Crescent Beach", climate: "a wet coastal climate with heavy winter rain", region: "Metro Vancouver", neighbourhood: "Whalley–City Centre and the Guildford corridor" },
  Burnaby: { population: "about 250,000 residents", landmark: "Burnaby Mountain and Deer Lake", climate: "a wet coastal climate with damp winters", region: "Metro Vancouver", neighbourhood: "the Metrotown area and the Brentwood corridor" },
  Richmond: { population: "about 210,000 residents", landmark: "the Fraser River delta and Steveston Village", climate: "a wet coastal climate with tidal surges on low-lying land", region: "Metro Vancouver", neighbourhood: "the City Centre and Steveston" },
  "North Vancouver": { population: "about 90,000 residents", landmark: "Grouse Mountain and the Burrard Inlet", climate: "a wet coastal climate with heavy rain and wind", region: "Metro Vancouver", neighbourhood: "the Lonsdale Quay area" },
  Coquitlam: { population: "about 152,000 residents", landmark: "the Coquitlam River and Lafarge Lake", climate: "a wet coastal climate with heavy rain", region: "Metro Vancouver", neighbourhood: "the Burquitlam and Austin Heights corridors" },
  Delta: { population: "about 108,000 residents", landmark: "the Fraser River delta and Boundary Bay", climate: "a coastal climate with flood risk and wind storms", region: "Metro Vancouver", neighbourhood: "the Ladner and Tsawwassen areas" },
  Victoria: { population: "about 93,000 residents", landmark: "the Inner Harbour and the Royal BC Museum", climate: "a mild coastal climate with wet winters", region: "the Capital Regional District", neighbourhood: "the downtown core and Fernwood" },
  Abbotsford: { population: "about 162,000 residents", landmark: "Sumas Mountain and the Fraser Valley", climate: "a wet valley climate with atmospheric rivers", region: "the Fraser Valley", neighbourhood: "the downtown core and Sumas Prairie" },
  Kelowna: { population: "about 145,000 residents", landmark: "Okanagan Lake and Knox Mountain", climate: "a semi-arid lake climate with dry, hot summers", region: "the Okanagan", neighbourhood: "the downtown waterfront and Rutland" },
  Winnipeg: { population: "about 749,000 residents", landmark: "the Red and Assiniboine rivers", climate: "a cold prairie climate with deep frost and spring thaws", region: "the Winnipeg Capital Region", neighbourhood: "the Exchange District and St. Boniface" },
  Montreal: { population: "about 1.76 million residents", landmark: "Mount Royal and the St. Lawrence River", climate: "a humid continental climate with freeze-thaw cycles and heavy snow", region: "the Island of Montreal", neighbourhood: "the Plateau–Rosemont belt and the downtown core" },
  "Quebec City": { population: "about 550,000 residents", landmark: "Château Frontenac and the St. Lawrence River", climate: "a cold continental climate with heavy snow and ice-dam winters", region: "the Capitale-Nationale region", neighbourhood: "Old Quebec and the Sainte-Foy corridor" },
  Laval: { population: "about 438,000 residents", landmark: "Île Jésus and the Rivière des Prairies", climate: "a humid continental climate with heavy snow and spring thaws", region: "the Montreal metropolitan area", neighbourhood: "the downtown core and the Vimont–Duvernay belt" },
  Gatineau: { population: "about 293,000 residents", landmark: "the Ottawa River and the Canadian Museum of History", climate: "a cold continental climate with deep frost and heavy snow", region: "the Outaouais region", neighbourhood: "the downtown core and the Hull sector" },
  Longueuil: { population: "about 254,000 residents", landmark: "the St. Lawrence River and Place Charles-Le Moyne", climate: "a humid continental climate with freeze-thaw winters", region: "Montérégie", neighbourhood: "the Vieux-Longueuil core" },
  "Saint John": { population: "about 69,000 residents", landmark: "the Reversing Falls and the Bay of Fundy", climate: "a maritime climate with wet, stormy winters", region: "southern New Brunswick", neighbourhood: "the uptown core and the South End" },
  Moncton: { population: "about 79,000 residents", landmark: "the Petitcodiac River and Magnetic Hill", climate: "a maritime climate with heavy snow and wet springs", region: "southeastern New Brunswick", neighbourhood: "the downtown core and the north end" },
  Fredericton: { population: "about 64,000 residents", landmark: "the Saint John River and Odell Park", climate: "a continental-maritime climate with river-ice spring floods", region: "central New Brunswick", neighbourhood: "the downtown core and the Lincoln corridor" },
  "St. John's": { population: "about 110,000 residents", landmark: "Signal Hill and the Avalon Peninsula", climate: "a foggy maritime climate with nor'easters and heavy rain", region: "the Avalon Peninsula", neighbourhood: "the downtown core and Churchill Park" },
  Halifax: { population: "about 440,000 residents", landmark: "Halifax Harbour and Citadel Hill", climate: "a maritime climate with nor'easters and post-tropical storms", region: "the Halifax Regional Municipality", neighbourhood: "the downtown peninsula and Dartmouth core" },
  Charlottetown: { population: "about 39,000 residents", landmark: "the Confederation Centre and the Hillsborough River", climate: "a maritime climate with winter storms and post-tropical rains", region: "Queens County, PEI", neighbourhood: "the downtown core and the Brighton area" },
  Saskatoon: { population: "about 266,000 residents", landmark: "the South Saskatchewan River and the Bessborough Hotel", climate: "a cold prairie climate with deep frost and severe summer storms", region: "central Saskatchewan", neighbourhood: "the Broadway–Nutana corridor and the downtown core" },
  Regina: { population: "about 227,000 residents", landmark: "Wascana Lake and the Legislative Building", climate: "a cold prairie climate with long winters and severe summer storms", region: "southern Saskatchewan", neighbourhood: "the downtown core and the Cathedral area" },
};

const FALLBACKS: Array<Omit<CityFact, "population">> = [
  { landmark: "a mix of historic main street and newer commercial districts", climate: "a Canadian climate where seasonal swings keep local crews booked", region: "the surrounding region", neighbourhood: "the downtown core and the main commercial corridors" },
  { landmark: "the local waterfront and the main shopping district", climate: "a continental climate with real winters and busy storm seasons", region: "the surrounding region", neighbourhood: "the central business district and nearby neighbourhoods" },
  { landmark: "a growing downtown and well-travelled commercial strips", climate: "a four-season climate with freeze-thaw swings and summer storms", region: "the surrounding region", neighbourhood: "the core commercial area and the surrounding blocks" },
];

function hash(value: string, mod: number) {
  let h = 0;
  for (let i = 0; i < value.length; i += 1) h = (h * 31 + value.charCodeAt(i)) >>> 0;
  return h % mod;
}

/** Deterministic facts for a city, with a stable fallback for unknown cities. */
export function cityFacts(city: string): CityFact {
  const known = DATA[city];
  if (known) return known;
  const fallback = FALLBACKS[hash(city, FALLBACKS.length)];
  return {
    population: "home to tens of thousands of residents",
    ...fallback,
  };
}

export const KNOWN_CITIES = Object.keys(DATA);
