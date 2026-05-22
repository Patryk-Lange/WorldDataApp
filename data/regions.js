/* Regions and supranational groups
   Source: UN, EU, G7/G20/BRICS+ official membership lists
*/
const REGIONS = {
  // Geographic regions
  "North America":         ["USA","CAN","MEX","GTM","BLZ","HND","SLV","NIC","CRI","PAN"],
  "Caribbean":             ["CUB","DOM","HTI","JAM","TTO","BHS","BRB","LCA","VCT","GRD","ATG","DMA"],
  "South America":         ["BRA","ARG","CHL","COL","PER","VEN","ECU","BOL","PRY","URY","GUY","SUR"],
  "Western Europe":        ["DEU","FRA","GBR","ITA","ESP","NLD","BEL","CHE","AUT","PRT","GRC","SWE","NOR","DNK","FIN","IRL","LUX","ISL"],
  "Eastern Europe":        ["RUS","POL","CZE","HUN","ROU","BGR","UKR","BLR","SRB","HRV","SVK","SVN","LVA","LTU","EST","MDA","MKD","MNE","BIH","ALB"],
  "Middle East":           ["SAU","ARE","IRN","IRQ","TUR","ISR","JOR","LBN","SYR","OMN","KWT","QAT","BHR","YEM"],
  "Central Asia":          ["KAZ","UZB","TKM","TJK","KGZ","AZE","GEO","ARM"],
  "South Asia":            ["IND","PAK","BGD","LKA","NPL","AFG","BTN","MDV"],
  "East Asia":             ["CHN","JPN","KOR","PRK","MNG","TWN"],
  "Southeast Asia":        ["IDN","THA","VNM","PHL","MYS","SGP","MMR","KHM","LAO","BRN"],
  "Oceania":               ["AUS","NZL","PNG","FJI","SLB","VUT","WSM","TON","FSM"],
  "North Africa":          ["EGY","DZA","MAR","TUN","LBY","SDN"],
  "Sub-Saharan Africa":    ["NGA","ZAF","ETH","KEN","TZA","UGA","GHA","CMR","AGO","MOZ","ZMB","ZWE","SEN","CIV","GAB","COG","BWA","NAM","RWA","BDI","MLI","NER","BFA","TGO","BEN","SLE","LBR","GIN","SOM","SSD","CAF","COD","MDG","MWI","LSO","SWZ","ERI","DJI","GNB","GMB","GNQ","CPV"],
  // Supranational groups
  "G7":    ["USA","CAN","GBR","DEU","FRA","ITA","JPN"],
  "G20":   ["USA","CAN","GBR","DEU","FRA","ITA","JPN","RUS","CHN","IND","BRA","ARG","AUS","KOR","MEX","IDN","SAU","TUR","ZAF","ARE"],
  "EU-27": ["DEU","FRA","ITA","ESP","POL","ROU","NLD","BEL","CZE","GRC","PRT","SWE","HUN","AUT","BGR","DNK","FIN","SVK","IRL","HRV","LTU","SVN","LVA","EST","CYP","LUX","MLT"],
  "BRICS+":["BRA","RUS","IND","CHN","ZAF","EGY","ETH","IRN","SAU","ARE"],
  "ASEAN": ["IDN","THA","VNM","PHL","MYS","SGP","MMR","KHM","LAO","BRN"],
  "NATO":  ["USA","CAN","GBR","DEU","FRA","ITA","ESP","POL","ROU","NLD","BEL","PRT","GRC","CZE","HUN","SVK","BGR","DNK","NOR","ISL","TUR","HRV","ALB","MNE","MKD","EST","LVA","LTU","LUX","SVN","FIN","SWE"],
  "OPEC+": ["SAU","ARE","IRQ","IRN","KWT","LBY","NGA","GAB","EQG","AGO","COG","RUS","OMN","KAZ","AZE","BHR","BRN","MYS","MEX","SDN"],
};

/* Map from A3 → geographic region name */
function getCountryRegion(a3) {
  const geoGroups = ["North America","Caribbean","South America","Western Europe",
    "Eastern Europe","Middle East","Central Asia","South Asia","East Asia",
    "Southeast Asia","Oceania","North Africa","Sub-Saharan Africa"];
  for (const g of geoGroups) {
    if (REGIONS[g] && REGIONS[g].includes(a3)) return g;
  }
  return null;
}
