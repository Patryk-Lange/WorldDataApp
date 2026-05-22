/* CO2 per Capita data – tonnes of CO2 per person per year
   Source: IEA Global Energy Review 2024
*/
const CO2_DATA = {
  "QAT": 31.7, "KWT": 24.6, "BHR": 22.5, "ARE": 20.6, "OMN": 17.5,
  "AUS": 14.4, "SAU": 14.0, "USA": 13.7, "KAZ": 13.0, "CAN": 12.8,
  "TKM": 12.5, "RUS": 11.6, "ZAF": 9.8,  "KOR": 11.1, "CHN": 9.0,
  "DEU": 7.3,  "NLD": 7.3,  "JPN": 8.0,  "POL": 8.3,  "CZE": 9.4,
  "BEL": 7.5,  "AUT": 6.9,  "GBR": 4.7,  "ITA": 5.2,  "FRA": 4.3,
  "DNK": 5.0,  "GRC": 5.2,  "ESP": 4.9,  "PRT": 3.9,  "NOR": 7.1,
  "FIN": 7.4,  "SWE": 3.3,  "SVK": 6.7,  "HUN": 4.9,  "ROU": 4.2,
  "CHE": 3.8,  "LUX": 12.1, "IRL": 7.5,  "ISR": 7.0,  "CYP": 5.8,
  "MEX": 3.7,  "BRA": 2.3,  "ARG": 4.5,  "CHL": 4.8,  "VEN": 4.5,
  "COL": 1.9,  "PER": 1.8,  "ECU": 2.4,  "BOL": 2.0,  "TUR": 5.3,
  "IRN": 9.8,  "IRQ": 6.5,  "UKR": 5.2,  "UZB": 3.5,  "AZE": 4.8,
  "GEO": 2.5,  "BLR": 5.9,  "IND": 2.5,  "IDN": 2.4,  "THA": 4.7,
  "MYS": 9.0,  "VNM": 3.8,  "PHL": 1.4,  "PAK": 0.9,  "BGD": 0.8,
  "LKA": 1.1,  "MMR": 0.6,  "KHM": 0.7,  "NPL": 0.6,  "AFG": 0.3,
  "SGP": 7.5,  "HKG": 3.9,  "NGA": 0.6,  "KEN": 0.4,  "ETH": 0.2,
  "EGY": 3.4,  "DZA": 4.1,  "MAR": 2.1,  "TUN": 2.7,  "GHA": 0.7,
  "AGO": 0.7,  "TZA": 0.2,  "UGA": 0.1,  "SEN": 0.5,  "CMR": 0.3,
  "MOZ": 0.2,  "NZL": 6.1,  "SDN": 0.5,  "LBY": 8.0,  "SYR": 1.8,
  "JOR": 2.8,  "LBN": 4.5,  "YEM": 0.5,  "CUB": 1.5,  "DOM": 2.3,
  "HND": 1.5,  "GTM": 1.2,  "PAN": 2.1,  "CRI": 1.8,  "JAM": 2.4,
  "TTO": 3.9,  "ARM": 1.6,  "FJI": 0.7,  "PNG": 0.3,  "SVN": 6.2,
};
