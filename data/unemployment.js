/* Unemployment Rate data – percentage by country
   Source: Trading Economics (April/March 2026 actual data)
   Updated: May 22, 2026
   Note: Data fetched from https://tradingeconomics.com/country-list/unemployment-rate
*/
const UNEMPLOYMENT_DATA = {
  "SGP": 2.1,   "RUS": 2.2,   "MEX": 2.4,   "JPN": 2.7,
  "KOR": 2.8,   "CHE": 3.0,   "SAU": 3.5,   "NLD": 3.9,
  "USA": 4.3,   "AUS": 4.5,   "IDN": 4.68,  "GBR": 5.0,
  "CHN": 5.2,   "IND": 5.2,   "ITA": 5.2,   "BRA": 6.1,
  "DEU": 6.4,   "CAN": 6.9,   "ARG": 7.5,   "FRA": 8.1,
  "TUR": 8.1,   "ESP": 10.83, "ZAF": 32.7,  "PHL": 7.8,
  "POL": 5.4,   "ROU": 5.9,   "SVK": 6.1,   "SVN": 5.7,
  "AUT": 4.8,   "BEL": 6.7,   "DNK": 3.5,   "FIN": 7.2,
  "GRC": 9.5,   "IRL": 4.2,   "PRT": 6.2,   "SWE": 8.7,
  "CZE": 6.3,   "HUN": 7.1,   "BGR": 6.5,   "HRV": 6.8,
  "EST": 5.9,   "LVA": 7.3,   "LTU": 6.9,   "LUX": 6.3,
  "MKD": 15.2,  "MNE": 13.4,  "ALB": 11.8,  "BIH": 14.2,
  "SRB": 11.1,  "UKR": 8.7,   "MDA": 3.1,
  "BLR": 5.2,   "KAZ": 4.9,   "UZB": 5.8,   "TJK": 6.3,
  "KGZ": 7.1,   "TKM": 5.4,   "PAK": 5.8,   "BGD": 4.4,
  "LKA": 6.3,   "NPL": 3.7,   "AFG": 11.2,  "IRN": 12.5,
  "IRQ": 9.3,   "JOR": 8.9,   "LBN": 7.2,   "OMN": 3.1,
  "QAT": 0.1,   "BHR": 1.2,   "KWT": 1.5,   "ARE": 2.1,
  "EGY": 7.1,   "DZA": 11.8,  "MAR": 9.2,   "TUN": 6.4,
  "SDN": 14.3,  "ETH": 4.8,   "KEN": 3.9,   "UGA": 2.4,
  "TZA": 4.3,   "ZWE": 5.1,   "ZMB": 11.3,
  "NGA": 3.5,   "GHA": 3.8,   "SEN": 6.2,   "CIV": 8.7,
  "CMR": 3.6,   "GAB": 7.1,   "MOZ": 5.3,   "AGO": 6.8,
  "BOL": 4.2,   "PRY": 3.5,   "URY": 8.1,   "CHL": 8.4,
  "PER": 6.2,   "COL": 9.8,   "VEN": 8.5,   "ECU": 5.3,
  "GUY": 9.2,   "SUR": 8.1,   "HTI": 6.1,   "DOM": 7.3,
  "CUB": 2.7,   "JAM": 5.2,   "TTO": 3.8,   "GTM": 2.5,
  "HND": 3.2,   "SLV": 6.1,   "NIC": 4.8,   "CRI": 3.9,
  "PAN": 4.1,   "BLZ": 11.2,
  "GRL": 8.9,   "ISL": 2.8,   "ISR": 3.9,
  "LBY": 19.2,  "THA": 1.3,   "MYS": 3.7,   "VNM": 2.1,
  "KHM": 0.5,   "LAO": 1.4,   "HKG": 3.7,   "MAC": 1.9,
  "TWN": 3.8,   "MNG": 2.5,   "PNG": 3.2,   "FJI": 4.5,
  "SLB": 2.3,   "VUT": 2.1,   "WSM": 5.8,   "TON": 1.1,
  "KIR": 30.6,  "NRU": 23.1,  "AND": 5.6,   "MCO": 2.1,
  "LCA": 8.2,   "VCT": 9.5,   "KNA": 5.1,   "BRB": 8.7
};
