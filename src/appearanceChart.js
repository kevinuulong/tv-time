export function buildCharacterDictionary(data, characterMap = null) {
  let maxWordCount = 0;

  const nodes = data.nodes || [];

  const allowedCodes = characterMap ? new Set(characterMap.keys()) : null;

  const filteredNodes = allowedCodes
    ? nodes.filter(n => allowedCodes.has(n.id))
    : nodes;

  // -------------------------
  // PASS 1: max word count
  // -------------------------
  filteredNodes.forEach(char => {
    if (!char.seasons) return;

    Object.values(char.seasons).forEach(season => {
      season.episodes.forEach(ep => {
        if (ep.word_count > maxWordCount) {
          maxWordCount = ep.word_count;
        }
      });
    });
  });

  // -------------------------
  // PASS 2: build dictionary
  // -------------------------
  const temp = [];

  const episodeMap = new Map();
  const episodeIndexMap = {};
  let idx = 0;

  for (let s = 1; s <= 8; s++) {
    const eps = [10,10,10,10,10,10,7,6][s-1];
    for (let e = 1; e <= eps; e++) {
      const key = `S${s}E${e}`;
      episodeMap.set(`${s}-${e}`, key);
      episodeIndexMap[key] = idx++;
    }
  }

  const episodeLabels = Object.keys(episodeIndexMap);

  const wordCountToColor = (wc) => {
    if (!wc) return "var(--level-1)";
    const norm = Math.log(wc + 1) / Math.log(maxWordCount + 1);
    return `hsl(30, 100%, ${95 - norm * 55}%)`;
  };

  filteredNodes.forEach(char => {
    const appearances = {};
    let firstAppearanceIndex = Infinity;

    episodeLabels.forEach(label => {
      appearances[label] = {
        color: "var(--level-1)",
        count: 0
      };
    });

    if (char.seasons) {
      Object.entries(char.seasons).forEach(([seasonNum, seasonData]) => {
        seasonData.episodes.forEach(ep => {
          const key = episodeMap.get(`${seasonNum}-${ep.episode_number}`);
          const idx = episodeIndexMap[key];

          if (idx !== undefined) {
            if (ep.word_count > 0 && idx < firstAppearanceIndex) {
              firstAppearanceIndex = idx;
            }

            appearances[key] = {
              color: wordCountToColor(ep.word_count),
              count: ep.word_count
            };
          }
        });
      });
    }

    temp.push({
      id: char.id,
      appearances,
      firstAppearanceIndex
    });
  });

  const result = {};
  temp.forEach(c => {
    result[c.id] = {
      appearances: c.appearances,
      firstAppearanceIndex: c.firstAppearanceIndex
    };
  });

  return {
    characterDict: result,
    maxWordCount
  };
}