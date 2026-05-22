/* ============================================================
   World Data Explorer - i18n.js
   Locale management + translations + formatting helpers.
   ============================================================ */
(function () {
  'use strict';

  const STORAGE_KEY = 'wde_lang';
  const STORAGE_MANUAL_KEY = 'wde_lang_manual';
  const SUPPORTED_LOCALES = ['en', 'pl'];
  const FALLBACK_LOCALE = 'en';

  const RESOURCES = {
    en: {
      app: {
        title: 'World Data Explorer',
        description: 'Interactive world map comparing GDP, inflation, unemployment and more across 170+ countries.',
        skipToMain: 'Skip to main content',
      },
      languages: {
        en: 'English (EN)',
        pl: 'Polski (PL)',
      },
      header: {
        title: '🌐 World Data Explorer',
        indicatorsAria: 'Data indicator',
        hint: 'Click to select · click more countries to compare · / to search',
        currencyTitle: 'Display currency for monetary values',
        currencyAria: 'Display currency',
        languageLabel: '🌐',
        languageTitle: 'Display language',
        languageAria: 'Display language',
        correlateButton: '⊕ Correlate',
        correlateTitle: 'Correlation explorer',
        exportButton: '⬇ Export',
        exportTitle: 'Export data or map',
        exportMenuAria: 'Export options',
        exportCsv: '📄 Export CSV',
        exportPng: '🖼 Export PNG',
        shareButton: '🔗 Share',
        shareTitle: 'Share or embed this view',
        installButton: '⬇ Install App',
        installTitle: 'Install app for offline use',
      },
      mobile: {
        switchAria: 'Mobile view switch',
        map: '🗺 Map',
        data: '📊 Data',
      },
      map: {
        containerAria: 'Interactive world map. Use arrow keys to navigate countries, Enter to select.',
        svgAria: 'World map',
        resetView: '⌂ Reset view',
        resetViewTitle: 'Reset zoom to world view',
        tooltipNoData: '⊘ No data',
        unknownTerritory: 'Unknown territory',
        noDataAria: '{name}: no data',
        rankAria: '{name}: {value}, rank {rank}',
      },
      correlation: {
        regionAria: 'Correlation explorer',
        title: '⊕ Correlation Explorer',
        close: '✕ Close',
        xAxis: 'X Axis:',
        yAxis: 'Y Axis:',
        trendLine: 'Trend line',
        outliers: 'Highlight outliers',
        scatterAria: 'Scatter plot',
        statsR2: 'R² = {r2} · {count} countries',
        statsCount: '{count} countries',
      },
      sidebar: {
        aria: 'Country details and statistics',
      },
      search: {
        placeholder: 'Search countries… (or press /)',
        aria: 'Search countries',
        resultsAria: 'Search results',
        noResults: 'No matching countries',
      },
      group: {
        filterLabel: 'Filter:',
        filterAria: 'Filter by region or group',
      },
      filter: {
        panelAria: 'Value filters',
        toggle: '▾ Value Filters',
        valueRange: 'Value range',
        min: 'Min',
        max: 'Max',
        minAria: 'Minimum value',
        maxAria: 'Maximum value',
        reset: 'Reset filters',
        minChip: 'Min: {value}',
        maxChip: 'Max: {value}',
      },
      comparison: {
        aria: 'Country comparison',
        heading: 'Comparing {count} countries',
        clearAll: 'Clear all',
        removeTitle: 'Remove',
      },
      detail: {
        aria: 'Country details',
        rankHighest: 'highest',
        rankLowest: 'lowest',
        shareWorldTotal: '{share}% of world total',
        shareWorldAvg: '{share}% of world avg',
        yoyText: '{arrow} {pct}% vs prev year',
        dataSource: 'Source: {source} · {asOf}',
        noData: 'No {indicator} data available',
        bookmarkAddTitle: 'Bookmark this country',
        bookmarkRemoveTitle: 'Remove bookmark',
        deselect: '✕ Deselect',
        defaultHint: 'Click any country to compare its {indicator}.',
        defaultHintSub: 'Click more countries to compare up to 5',
        outliersTitle: 'Notable outliers',
        sparkTitle: '10-Year Trend',
        expand: 'Expand ↗',
        sparkAria: 'Historical trend for {country}',
        similarTitle: 'Similar economies',
      },
      legend: {
        aria: 'Map colour legend',
        title: 'Map Key',
        thresholdButton: '⚙ Thresholds',
        selectedCountry: 'Selected country',
        betterHigher: 'Higher {indicator} than selected',
        worseHigher: 'Lower {indicator} than selected',
        betterLower: 'Lower {indicator} than selected',
        worseLower: 'Higher {indicator} than selected',
        higherValue: 'Higher value',
        lowerValue: 'Lower value',
        noData: 'No data / unselected',
        thresholdsTitle: 'Comparison thresholds',
        relative: 'Relative (%)',
        absolute: 'Absolute',
        threshold: 'Threshold:',
        resetDefaults: 'Reset to defaults',
      },
      top: {
        heading: 'Top 10',
        aria: 'Top 10 countries by selected indicator',
      },
      watchlist: {
        aria: 'Bookmarked countries',
        toggle: '★ My Watchlist',
        empty: 'Click ☆ on any country to bookmark it.',
        removeTitle: 'Remove bookmark',
        clearAll: 'Clear all',
        clearConfirm: 'Click Clear all again to confirm.',
        cleared: 'Watchlist cleared.',
      },
      status: {
        loading: 'Loading…',
        offline: '⚠ Offline – cached data',
        summary: '{indicator} · {source} · {asOf} · {count} countries',
      },
      history: {
        title: 'Historical Trend',
        closeAria: 'Close history modal',
        zoom3: '3 yr',
        zoom5: '5 yr',
        zoom10: '10 yr',
        worldAvg: 'World avg',
        regionAvg: 'Region avg',
        chartAria: 'Historical trend chart',
        subtitle: '{indicator} · {asOf}',
        noData: 'No historical data available for this indicator',
        worldAvgLabel: 'World avg',
        regionAvgLabel: '{region} avg',
      },
      share: {
        title: 'Share this view',
        closeAria: 'Close share modal',
        urlAria: 'Share URL',
        copy: 'Copy',
        copied: 'Copied!',
        copyFailed: 'Could not copy link. Please copy it manually.',
        embedLabel: 'Embed code',
      },
      welcome: {
        openButton: 'ℹ Welcome',
        openTitle: 'Open welcome guide',
        title: 'Welcome to World Data Explorer',
        closeAria: 'Close welcome dialog',
        intro: 'World Data Explorer helps you compare economic, social, and environmental indicators across 170+ countries on an interactive world map.',
        purposeTitle: 'Goal',
        purposeText: 'Use one map to quickly spot patterns, compare countries, and move from global rankings to country-level details.',
        whatYouCanDoTitle: 'What you can do',
        what1: 'Switch across GDP, inflation, unemployment, population, life expectancy, inequality, CO2/capita, trade balance, and debt/GDP.',
        what2: 'Select countries on the map or search, then compare up to 5 countries side by side.',
        what3: 'Filter by region and value, save bookmarks, and review historical trends where available.',
        dataSourcesTitle: 'Data sources',
        dataSourcesText: 'Indicator snapshots come from World Bank, Trading Economics, UN, WHO, IEA, WTO, and IMF datasets bundled with this app. Map geometry comes from world-atlas (TopoJSON).',
        gettingStartedTitle: 'Getting started',
        step1: 'Choose an indicator from the top tabs.',
        step2: 'Click a country (or press / to search), then click additional countries to compare up to 5.',
        step3: 'Use Correlate, Export, and Share in the header for deeper analysis and reporting.',
        notesTitle: 'Important notes',
        notesText: 'Values are curated snapshots (not real-time), coverage differs by country, and currency conversion uses fixed reference rates for display.',
        dontShowAgain: "Don't show again",
        cta: 'Get Started',
      },
      errors: {
        mapLoad: 'Failed to load map data. Check your connection.',
        retryLoad: 'Retry loading',
        storageWrite: 'Could not save changes in this browser session.',
      },
      pwa: {
        installing: 'Installing app...',
        installed: 'App installed successfully.',
        notAvailable: 'Install option is not available yet.',
        installFailed: 'Could not launch installation prompt.',
      },
      bookmarks: {
        maxLimit: 'Max {max} bookmarks reached. Remove one from your watchlist first.',
      },
      export: {
        csvHeader: 'ISO-Alpha3,Country,{indicator},Rank,Region',
        pngOverlay: 'World {indicator} Explorer',
        csvFailed: 'Could not export CSV. Please try again.',
        pngFailed: 'Could not export PNG. Please try again.',
      },
      groups: {
        allCountries: 'All Countries',
        separator: '— Groups —',
        northAmerica: 'North America',
        caribbean: 'Caribbean',
        southAmerica: 'South America',
        westernEurope: 'Western Europe',
        easternEurope: 'Eastern Europe',
        middleEast: 'Middle East',
        centralAsia: 'Central Asia',
        southAsia: 'South Asia',
        eastAsia: 'East Asia',
        southeastAsia: 'Southeast Asia',
        oceania: 'Oceania',
        northAfrica: 'North Africa',
        subSaharanAfrica: 'Sub-Saharan Africa',
        g7: 'G7',
        g20: 'G20',
        eu27: 'EU-27',
        bricsPlus: 'BRICS+',
        asean: 'ASEAN',
        nato: 'NATO',
        opecPlus: 'OPEC+',
      },
      indicatorGroups: {
        economy: 'Economy',
        society: 'Society',
        environment: 'Environment',
      },
      currencies: {
        USD: 'US Dollar',
        EUR: 'Euro',
        GBP: 'British Pound',
        JPY: 'Japanese Yen',
        CNY: 'Chinese Yuan',
        INR: 'Indian Rupee',
        BRL: 'Brazilian Real',
        CAD: 'Canadian Dollar',
        AUD: 'Australian Dollar',
        CHF: 'Swiss Franc',
        KRW: 'South Korean Won',
        MXN: 'Mexican Peso',
        SGD: 'Singapore Dollar',
        SAR: 'Saudi Riyal',
        PLN: 'Polish Zloty',
      },
      units: {
        trillion: 'T',
        billion: 'B',
        million: 'M',
        tonnes: 't',
        years: 'yrs',
      },
      indicators: {
        gdp: {
          label: '💰 GDP',
          plainLabel: 'GDP',
          topLabel: 'Top 10 by GDP',
          source: 'World Bank',
          asOf: 'April 2026',
          unit: 'USD',
        },
        gdp_per_capita: {
          label: '👤 GDP / Capita',
          plainLabel: 'GDP / Capita',
          topLabel: 'Top 10 GDP per Capita',
          source: 'World Bank',
          asOf: 'April 2026',
          unit: 'USD',
        },
        inflation: {
          label: '📈 Inflation',
          plainLabel: 'Inflation',
          topLabel: 'Top 10 Highest Inflation',
          source: 'Trading Economics',
          asOf: 'April 2026',
          unit: '%',
        },
        unemployment: {
          label: '👥 Unemployment',
          plainLabel: 'Unemployment',
          topLabel: 'Top 10 Lowest Unemployment',
          source: 'Trading Economics',
          asOf: 'April 2026',
          unit: '%',
        },
        population: {
          label: '🌍 Population',
          plainLabel: 'Population',
          topLabel: 'Top 10 by Population',
          source: 'UN 2026',
          asOf: 'January 2026',
          unit: 'M',
        },
        life_expectancy: {
          label: '❤️ Life Expectancy',
          plainLabel: 'Life Expectancy',
          topLabel: 'Top 10 Life Expectancy',
          source: 'WHO',
          asOf: '2024',
          unit: 'yrs',
        },
        gini: {
          label: '⚖️ Gini Index',
          plainLabel: 'Gini Index',
          topLabel: 'Top 10 Lowest Inequality',
          source: 'World Bank',
          asOf: '2025',
          unit: '',
        },
        co2: {
          label: '🌱 CO₂/Capita',
          plainLabel: 'CO₂/Capita',
          topLabel: 'Top 10 Cleanest (CO₂)',
          source: 'IEA',
          asOf: '2024',
          unit: 'tonnes',
        },
        trade_balance: {
          label: '🔄 Trade Balance',
          plainLabel: 'Trade Balance',
          topLabel: 'Top 10 Trade Surplus',
          source: 'WTO',
          asOf: '2025',
          unit: 'USD B',
        },
        debt_to_gdp: {
          label: '🏦 Debt/GDP',
          plainLabel: 'Debt/GDP',
          topLabel: 'Top 10 Lowest Debt',
          source: 'IMF',
          asOf: '2025',
          unit: '%',
        },
      },
    },
    pl: {
      app: {
        title: 'Swiatowy Eksplorator Danych',
        description: 'Interaktywna mapa swiata porownujaca PKB, inflacje, bezrobocie i inne wskazniki dla ponad 170 krajow.',
        skipToMain: 'Przejdz do glownej tresci',
      },
      languages: {
        en: 'English (EN)',
        pl: 'Polski (PL)',
      },
      header: {
        title: '🌐 Swiatowy Eksplorator Danych',
        indicatorsAria: 'Wskaznik danych',
        hint: 'Kliknij, aby wybrac · kliknij kolejne kraje, aby porownac · / aby szukac',
        currencyTitle: 'Waluta wyswietlania dla wartosci pienieznych',
        currencyAria: 'Waluta wyswietlania',
        languageLabel: '🌐',
        languageTitle: 'Jezyk interfejsu',
        languageAria: 'Jezyk interfejsu',
        correlateButton: '⊕ Korelacje',
        correlateTitle: 'Eksplorator korelacji',
        exportButton: '⬇ Eksport',
        exportTitle: 'Eksport danych lub mapy',
        exportMenuAria: 'Opcje eksportu',
        exportCsv: '📄 Eksport CSV',
        exportPng: '🖼 Eksport PNG',
        shareButton: '🔗 Udostepnij',
        shareTitle: 'Udostepnij lub osadz ten widok',
        installButton: '⬇ Zainstaluj aplikacje',
        installTitle: 'Zainstaluj aplikacje do pracy offline',
      },
      mobile: {
        switchAria: 'Przelacznik widoku mobilnego',
        map: '🗺 Mapa',
        data: '📊 Dane',
      },
      map: {
        containerAria: 'Interaktywna mapa swiata. Uzyj strzalek, aby poruszac sie po krajach, Enter aby wybrac.',
        svgAria: 'Mapa swiata',
        resetView: '⌂ Resetuj widok',
        resetViewTitle: 'Resetuj przyblizenie do widoku swiata',
        tooltipNoData: '⊘ Brak danych',
        unknownTerritory: 'Nieznane terytorium',
        noDataAria: '{name}: brak danych',
        rankAria: '{name}: {value}, pozycja {rank}',
      },
      correlation: {
        regionAria: 'Eksplorator korelacji',
        title: '⊕ Eksplorator korelacji',
        close: '✕ Zamknij',
        xAxis: 'Os X:',
        yAxis: 'Os Y:',
        trendLine: 'Linia trendu',
        outliers: 'Wyroznij odstajace',
        scatterAria: 'Wykres punktowy',
        statsR2: 'R² = {r2} · {count} krajow',
        statsCount: '{count} krajow',
      },
      sidebar: {
        aria: 'Szczegoly kraju i statystyki',
      },
      search: {
        placeholder: 'Szukaj krajow… (lub nacisnij /)',
        aria: 'Szukaj krajow',
        resultsAria: 'Wyniki wyszukiwania',
        noResults: 'Brak pasujacych krajow',
      },
      group: {
        filterLabel: 'Filtr:',
        filterAria: 'Filtruj wedlug regionu lub grupy',
      },
      filter: {
        panelAria: 'Filtry wartosci',
        toggle: '▾ Filtry wartosci',
        valueRange: 'Zakres wartosci',
        min: 'Min',
        max: 'Max',
        minAria: 'Minimalna wartosc',
        maxAria: 'Maksymalna wartosc',
        reset: 'Resetuj filtry',
        minChip: 'Min: {value}',
        maxChip: 'Max: {value}',
      },
      comparison: {
        aria: 'Porownanie krajow',
        heading: 'Porownanie: {count} krajow',
        clearAll: 'Wyczysc wszystko',
        removeTitle: 'Usun',
      },
      detail: {
        aria: 'Szczegoly kraju',
        rankHighest: 'najwyzsza',
        rankLowest: 'najnizsza',
        shareWorldTotal: '{share}% swiatowej sumy',
        shareWorldAvg: '{share}% sredniej swiatowej',
        yoyText: '{arrow} {pct}% vs poprzedni rok',
        dataSource: 'Zrodlo: {source} · {asOf}',
        noData: 'Brak danych: {indicator}',
        bookmarkAddTitle: 'Dodaj kraj do obserwowanych',
        bookmarkRemoveTitle: 'Usun z obserwowanych',
        deselect: '✕ Odznacz',
        defaultHint: 'Kliknij kraj, aby porownac jego {indicator}.',
        defaultHintSub: 'Kliknij kolejne kraje, aby porownac do 5',
        outliersTitle: 'Warte uwagi wartosci odstajace',
        sparkTitle: 'Trend 10-letni',
        expand: 'Rozwin ↗',
        sparkAria: 'Trend historyczny dla {country}',
        similarTitle: 'Podobne gospodarki',
      },
      legend: {
        aria: 'Legenda kolorow mapy',
        title: 'Legenda mapy',
        thresholdButton: '⚙ Progi',
        selectedCountry: 'Wybrany kraj',
        betterHigher: 'Wyzsze {indicator} niz wybrany',
        worseHigher: 'Nizsze {indicator} niz wybrany',
        betterLower: 'Nizsze {indicator} niz wybrany',
        worseLower: 'Wyzsze {indicator} niz wybrany',
        higherValue: 'Wyzsza wartosc',
        lowerValue: 'Nizsza wartosc',
        noData: 'Brak danych / niewybrany',
        thresholdsTitle: 'Progi porownania',
        relative: 'Wzgledny (%)',
        absolute: 'Bezwzgledny',
        threshold: 'Prog:',
        resetDefaults: 'Przywroc domyslne',
      },
      top: {
        heading: 'Top 10',
        aria: 'Top 10 krajow wedlug wybranego wskaznika',
      },
      watchlist: {
        aria: 'Obserwowane kraje',
        toggle: '★ Moja lista',
        empty: 'Kliknij ☆ przy kraju, aby dodac go do listy.',
        removeTitle: 'Usun z obserwowanych',
        clearAll: 'Wyczysc wszystko',
        clearConfirm: 'Kliknij "Wyczysc wszystko" ponownie, aby potwierdzic.',
        cleared: 'Lista obserwowanych zostala wyczyszczona.',
      },
      status: {
        loading: 'Ladowanie…',
        offline: '⚠ Offline – dane z cache',
        summary: '{indicator} · {source} · {asOf} · {count} krajow',
      },
      history: {
        title: 'Trend historyczny',
        closeAria: 'Zamknij okno historii',
        zoom3: '3 l.',
        zoom5: '5 l.',
        zoom10: '10 l.',
        worldAvg: 'Srednia swiatowa',
        regionAvg: 'Srednia regionu',
        chartAria: 'Wykres trendu historycznego',
        subtitle: '{indicator} · {asOf}',
        noData: 'Brak danych historycznych dla tego wskaznika',
        worldAvgLabel: 'Srednia swiatowa',
        regionAvgLabel: 'Srednia: {region}',
      },
      share: {
        title: 'Udostepnij ten widok',
        closeAria: 'Zamknij okno udostepniania',
        urlAria: 'Adres URL do udostepnienia',
        copy: 'Kopiuj',
        copied: 'Skopiowano!',
        copyFailed: 'Nie udalo sie skopiowac linku. Skopiuj go recznie.',
        embedLabel: 'Kod osadzenia',
      },
      welcome: {
        openButton: 'ℹ Powitanie',
        openTitle: 'Otworz przewodnik startowy',
        title: 'Witamy w Swiatowym Eksploratorze Danych',
        closeAria: 'Zamknij okno powitania',
        intro: 'Swiatowy Eksplorator Danych pomaga porownywac wskazniki gospodarcze, spoleczne i srodowiskowe dla ponad 170 krajow na interaktywnej mapie.',
        purposeTitle: 'Cel',
        purposeText: 'Korzystaj z jednej mapy, aby szybko znajdowac wzorce, porownywac kraje i przechodzic od rankingow globalnych do szczegolow kraju.',
        whatYouCanDoTitle: 'Co mozna zrobic',
        what1: 'Przelaczaj miedzy PKB, inflacja, bezrobociem, populacja, dlugoscia zycia, nierownoscia, CO2/mieszkanca, bilansem handlowym i dlugiem/PKB.',
        what2: 'Wybieraj kraje na mapie lub przez wyszukiwarke i porownuj do 5 krajow obok siebie.',
        what3: 'Filtruj po regionie i wartosci, zapisuj zakladki oraz przegladaj trendy historyczne tam, gdzie sa dostepne.',
        dataSourcesTitle: 'Zrodla danych',
        dataSourcesText: 'Migawki wskaznikow pochodza z zestawow World Bank, Trading Economics, ONZ, WHO, IEA, WTO i MFW dolaczonych do aplikacji. Geometria mapy pochodzi z world-atlas (TopoJSON).',
        gettingStartedTitle: 'Jak zaczac',
        step1: 'Wybierz wskaznik z gornych zakladek.',
        step2: 'Kliknij kraj (lub nacisnij /, aby szukac), a potem kliknij kolejne kraje, aby porownac do 5.',
        step3: 'Uzyj Korelacje, Eksport i Udostepnij w naglowku do glebszej analizy i raportowania.',
        notesTitle: 'Wazne uwagi',
        notesText: 'Wartosci to przygotowane migawki (nie dane czasu rzeczywistego), zakres pokrycia rozni sie miedzy krajami, a konwersja walut opiera sie na stalych kursach referencyjnych.',
        dontShowAgain: 'Nie pokazuj ponownie',
        cta: 'Rozpocznij',
      },
      errors: {
        mapLoad: 'Nie udalo sie zaladowac danych mapy. Sprawdz polaczenie.',
        retryLoad: 'Sprobuj ponownie',
        storageWrite: 'Nie udalo sie zapisac zmian w tej sesji przegladarki.',
      },
      pwa: {
        installing: 'Instalowanie aplikacji...',
        installed: 'Aplikacja zostala zainstalowana.',
        notAvailable: 'Opcja instalacji nie jest jeszcze dostepna.',
        installFailed: 'Nie udalo sie uruchomic instalacji.',
      },
      bookmarks: {
        maxLimit: 'Osiagnieto limit {max} zakladek. Najpierw usun jedna z listy obserwowanych.',
      },
      export: {
        csvHeader: 'ISO-Alpha3,Kraj,{indicator},Pozycja,Region',
        pngOverlay: 'Swiatowy eksplorator: {indicator}',
        csvFailed: 'Nie udalo sie wyeksportowac CSV. Sprobuj ponownie.',
        pngFailed: 'Nie udalo sie wyeksportowac PNG. Sprobuj ponownie.',
      },
      groups: {
        allCountries: 'Wszystkie kraje',
        separator: '— Grupy —',
        northAmerica: 'Ameryka Polnocna',
        caribbean: 'Karaiby',
        southAmerica: 'Ameryka Poludniowa',
        westernEurope: 'Europa Zachodnia',
        easternEurope: 'Europa Wschodnia',
        middleEast: 'Bliski Wschod',
        centralAsia: 'Azja Centralna',
        southAsia: 'Azja Poludniowa',
        eastAsia: 'Azja Wschodnia',
        southeastAsia: 'Azja Poludniowo-Wschodnia',
        oceania: 'Oceania',
        northAfrica: 'Afryka Polnocna',
        subSaharanAfrica: 'Afryka Subsaharyjska',
        g7: 'G7',
        g20: 'G20',
        eu27: 'UE-27',
        bricsPlus: 'BRICS+',
        asean: 'ASEAN',
        nato: 'NATO',
        opecPlus: 'OPEC+',
      },
      indicatorGroups: {
        economy: 'Gospodarka',
        society: 'Spoleczenstwo',
        environment: 'Srodowisko',
      },
      currencies: {
        USD: 'Dolar amerykanski',
        EUR: 'Euro',
        GBP: 'Funt brytyjski',
        JPY: 'Jen japonski',
        CNY: 'Juan chinski',
        INR: 'Rupia indyjska',
        BRL: 'Real brazylijski',
        CAD: 'Dolar kanadyjski',
        AUD: 'Dolar australijski',
        CHF: 'Frank szwajcarski',
        KRW: 'Won poludniowokoreanski',
        MXN: 'Peso meksykanskie',
        SGD: 'Dolar singapurski',
        SAR: 'Rial saudyjski',
        PLN: 'Polski zloty',
      },
      units: {
        trillion: 'bln',
        billion: 'mld',
        million: 'mln',
        tonnes: 't',
        years: 'lata',
      },
      indicators: {
        gdp: {
          label: '💰 PKB',
          plainLabel: 'PKB',
          topLabel: 'Top 10 wedlug PKB',
          source: 'Bank Swiatowy',
          asOf: 'Kwiecien 2026',
          unit: 'USD',
        },
        gdp_per_capita: {
          label: '👤 PKB / mieszkanca',
          plainLabel: 'PKB / mieszkanca',
          topLabel: 'Top 10 PKB per capita',
          source: 'Bank Swiatowy',
          asOf: 'Kwiecien 2026',
          unit: 'USD',
        },
        inflation: {
          label: '📈 Inflacja',
          plainLabel: 'Inflacja',
          topLabel: 'Top 10 najwyzsza inflacja',
          source: 'Trading Economics',
          asOf: 'Kwiecien 2026',
          unit: '%',
        },
        unemployment: {
          label: '👥 Bezrobocie',
          plainLabel: 'Bezrobocie',
          topLabel: 'Top 10 najnizsze bezrobocie',
          source: 'Trading Economics',
          asOf: 'Kwiecien 2026',
          unit: '%',
        },
        population: {
          label: '🌍 Populacja',
          plainLabel: 'Populacja',
          topLabel: 'Top 10 wedlug populacji',
          source: 'ONZ 2026',
          asOf: 'Styczen 2026',
          unit: 'M',
        },
        life_expectancy: {
          label: '❤️ Dlugosc zycia',
          plainLabel: 'Dlugosc zycia',
          topLabel: 'Top 10 dlugosc zycia',
          source: 'WHO',
          asOf: '2024',
          unit: 'lata',
        },
        gini: {
          label: '⚖️ Wskaznik Giniego',
          plainLabel: 'Wskaznik Giniego',
          topLabel: 'Top 10 najmniejsza nierownosc',
          source: 'Bank Swiatowy',
          asOf: '2025',
          unit: '',
        },
        co2: {
          label: '🌱 CO₂/mieszkanca',
          plainLabel: 'CO₂/mieszkanca',
          topLabel: 'Top 10 najczystsze (CO₂)',
          source: 'IEA',
          asOf: '2024',
          unit: 'tony',
        },
        trade_balance: {
          label: '🔄 Bilans handlowy',
          plainLabel: 'Bilans handlowy',
          topLabel: 'Top 10 nadwyzka handlowa',
          source: 'WTO',
          asOf: '2025',
          unit: 'USD B',
        },
        debt_to_gdp: {
          label: '🏦 Dlug/PKB',
          plainLabel: 'Dlug/PKB',
          topLabel: 'Top 10 najnizszy dlug',
          source: 'MFW',
          asOf: '2025',
          unit: '%',
        },
      },
    },
  };

  function normalizeLocale(raw) {
    if (!raw || typeof raw !== 'string') return null;
    const canonical = raw.trim().toLowerCase();
    if (!canonical) return null;
    if (canonical.startsWith('pl')) return 'pl';
    if (canonical.startsWith('en')) return 'en';
    return SUPPORTED_LOCALES.includes(canonical) ? canonical : null;
  }

  function readStorage(key) {
    try {
      return localStorage.getItem(key);
    } catch (err) {
      return null;
    }
  }

  function writeStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err) {
      return false;
    }
  }

  function localeSuggestsPoland(localeTag) {
    if (!localeTag || typeof localeTag !== 'string') return false;
    return /(^|[-_])pl($|[-_])/i.test(localeTag.trim());
  }

  function detectLocale() {
    try {
      const browserLocales = Array.isArray(navigator.languages) && navigator.languages.length
        ? navigator.languages
        : [navigator.language || ''];
      if (browserLocales.some(localeSuggestsPoland)) return 'pl';
    } catch (err) {
      // no-op
    }

    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (String(tz).toLowerCase() === 'europe/warsaw') return 'pl';
    } catch (err) {
      // no-op
    }

    return 'en';
  }

  function resolveInitialLocale() {
    const saved = normalizeLocale(readStorage(STORAGE_KEY));
    const manualRaw = readStorage(STORAGE_MANUAL_KEY);
    const hasManual = manualRaw === '1';

    // Backward compatibility: if a locale was saved by earlier versions,
    // treat it as a manual preference when manual marker is missing.
    if (saved && (hasManual || manualRaw === null)) return saved;

    return detectLocale() || FALLBACK_LOCALE;
  }

  let activeLocale = resolveInitialLocale();
  const listeners = new Set();

  function getIntlLocale(locale) {
    const normalized = normalizeLocale(locale) || activeLocale || FALLBACK_LOCALE;
    return normalized === 'pl' ? 'pl-PL' : 'en-US';
  }

  function getFromResource(locale, keyPath) {
    const lang = normalizeLocale(locale) || FALLBACK_LOCALE;
    const source = RESOURCES[lang] || RESOURCES[FALLBACK_LOCALE];
    return String(keyPath || '')
      .split('.')
      .reduce((obj, seg) => (obj && Object.prototype.hasOwnProperty.call(obj, seg) ? obj[seg] : undefined), source);
  }

  function interpolate(template, params) {
    if (typeof template !== 'string') return template;
    return template.replace(/\{\s*([\w.]+)\s*\}/g, (full, token) => {
      if (!params || !Object.prototype.hasOwnProperty.call(params, token)) return full;
      const value = params[token];
      return value === null || value === undefined ? '' : String(value);
    });
  }

  function t(key, params, fallback) {
    const localized = getFromResource(activeLocale, key);
    if (typeof localized === 'string') return interpolate(localized, params || {});

    const fallbackText = getFromResource(FALLBACK_LOCALE, key);
    if (typeof fallbackText === 'string') return interpolate(fallbackText, params || {});

    if (typeof fallback === 'string') return interpolate(fallback, params || {});
    return String(key || '');
  }

  function formatNumber(value, options) {
    const num = Number(value);
    if (!Number.isFinite(num)) return String(value);
    return new Intl.NumberFormat(getIntlLocale(activeLocale), options || {}).format(num);
  }

  function formatDate(value, options) {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat(getIntlLocale(activeLocale), options || {}).format(date);
  }

  function syncDocumentLocale() {
    if (!document || !document.documentElement) return;
    document.documentElement.lang = activeLocale;
    document.documentElement.setAttribute('data-locale', activeLocale);
  }

  function applyTranslations(root) {
    const scope = root || document;
    if (!scope || !scope.querySelectorAll) return;

    scope.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      const fallback = el.getAttribute('data-i18n-fallback') || el.textContent || '';
      el.textContent = t(key, {}, fallback);
    });

    scope.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      const fallback = el.getAttribute('title') || '';
      el.setAttribute('title', t(key, {}, fallback));
    });

    scope.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const key = el.getAttribute('data-i18n-aria-label');
      const fallback = el.getAttribute('aria-label') || '';
      el.setAttribute('aria-label', t(key, {}, fallback));
    });

    scope.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      const fallback = el.getAttribute('placeholder') || '';
      el.setAttribute('placeholder', t(key, {}, fallback));
    });

    scope.querySelectorAll('[data-i18n-content]').forEach(el => {
      const key = el.getAttribute('data-i18n-content');
      const fallback = el.getAttribute('content') || '';
      el.setAttribute('content', t(key, {}, fallback));
    });

    syncDocumentLocale();
  }

  function setLocale(nextLocale, options) {
    const opts = Object.assign({ manual: true, persist: true }, options || {});
    const normalized = normalizeLocale(nextLocale) || FALLBACK_LOCALE;
    const changed = normalized !== activeLocale;

    activeLocale = normalized;

    if (opts.persist) {
      writeStorage(STORAGE_KEY, normalized);
      writeStorage(STORAGE_MANUAL_KEY, opts.manual ? '1' : '0');
    }

    applyTranslations(document);

    listeners.forEach(listener => {
      try {
        listener(activeLocale, { changed, manual: !!opts.manual });
      } catch (err) {
        console.error('Locale listener failed', err);
      }
    });

    return activeLocale;
  }

  function onLocaleChange(listener) {
    if (typeof listener !== 'function') return function noop() {};
    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  function getLocale() {
    return activeLocale;
  }

  function getSupportedLocales() {
    return SUPPORTED_LOCALES.slice();
  }

  function hasManualLocaleSelection() {
    return readStorage(STORAGE_MANUAL_KEY) === '1';
  }

  window.WDE_I18N = {
    t,
    setLocale,
    getLocale,
    getIntlLocale,
    getSupportedLocales,
    hasManualLocaleSelection,
    detectLocale,
    formatNumber,
    formatDate,
    applyTranslations,
  };

  syncDocumentLocale();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => applyTranslations(document), { once: true });
  } else {
    applyTranslations(document);
  }
})();
