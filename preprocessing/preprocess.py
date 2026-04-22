import pandas as pd
import json
import re
from collections import Counter

# Load data
df = pd.read_csv('./preprocessing/got_scripts.csv')
df['Text'] = df['Text'].fillna('')

# Cleaning for analysis
df['CleanText'] = df['Text'].str.replace(r'\(.*?\)|\[.*?\]', '', regex=True)
df['CleanText'] = df['CleanText'].str.replace(r'[^\w\s]', '', regex=True).str.lower()

# List of common words to ignore (Stopwords)
STOPWORDS = set([
    'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', "you're", 
    "you've", "you'll", "you'd", 'your', 'yours', 'yourself', 'yourselves', 'he', 
    'him', 'his', 'himself', 'she', "she's", 'her', 'hers', 'herself', 'it', 
    "it's", 'its', 'itself', 'they', 'them', 'their', 'theirs', 'themselves', 
    'what', 'which', 'who', 'whom', 'this', 'that', "that'll", 'these', 'those', 
    'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 
    'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and', 
    'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 
    'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 
    'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 
    'on', 'off', 'over', 'under', 'again', 'further', 'then', 'once', 'here', 
    'there', 'when', 'where', 'why', 'how', 'all', 'any', 'both', 'each', 'few', 
    'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 
    'same', 'so', 'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 
    "don't", 'should', "should've", 'now', 'd', 'll', 'm', 'o', 're', 've', 'y'
])

def get_top_content(text_series, clean_series, n=5):
    # Words
    words = [w for w in ' '.join(clean_series).split() if w not in STOPWORDS and len(w) > 2]
    
    # Phrases (Bigrams)
    words_list = ' '.join(clean_series).split()
    phrases = [" ".join(pair) for pair in zip(words_list, words_list[1:]) 
               if pair[0] not in STOPWORDS and pair[1] not in STOPWORDS]
    
    # Get top 5 most frequent
    combined_counts = Counter(words + phrases).most_common(n)
    
    content_data = []
    for item, count in combined_counts:
        safe_item = re.escape(item)
        matches = text_series[text_series.str.contains(rf'\b{safe_item}\b', case=False, na=False)]
        sample = matches.iloc[0] if not matches.empty else "N/A"
        content_data.append({
            "term": item, 
            "count": int(count), 
            "sample": sample
        })
    return content_data

nodes = []

# Group by Character for the main Node list
for char_name, group in df.groupby('Character'):
    node = {
        "id": char_name,
        "total_episodes_count": int(group['EpisodeName'].nunique()),
        "total_word_count": int(group['Text'].apply(lambda x: len(str(x).split())).sum()), # Word count across series
        "top_content_overall": get_top_content(group['Text'], group['CleanText']),
        "seasons": {}
    }
    
    # Level 1: Breakdown by Season
    for season_num, s_group in group.groupby('Season'):
        episodes_in_season = []
        
        # Level 1: Breakdown by Episode Name AND Number
        for (ep_num, ep_name), e_group in s_group.groupby(['Episode', 'EpisodeName']):
            episodes_in_season.append({
                "episode_number": int(ep_num),
                "episode_name": ep_name,
                "word_count": int(e_group['Text'].apply(lambda x: len(str(x).split())).sum())
            })

        node["seasons"][int(season_num)] = {
            "season_word_count": int(s_group['Text'].apply(lambda x: len(str(x).split())).sum()),
            "episodes": episodes_in_season,
            "top_content": get_top_content(s_group['Text'], s_group['CleanText'])
        }
    nodes.append(node)

# Level 3: Interactions (Source -> Target)
df['NextCharacter'] = df.groupby(['Season', 'Episode'])['Character'].shift(-1)
interactions = df[df['Character'] != df['NextCharacter']].dropna(subset=['NextCharacter'])

# Grouping interactions by Season for D3 filtering
links_df = interactions.groupby(['Character', 'NextCharacter', 'Season']).size().reset_index(name='weight')
links = []
for _, r in links_df.iterrows():
    links.append({
        "source": r['Character'],
        "target": r['NextCharacter'],
        "season": int(r['Season']),
        "weight": int(r['weight'])
    })

# Final JSON Export
with open('./preprocessing/out/got_data.json', 'w') as f:
    json.dump({"nodes": nodes, "links": links}, f, indent=4)

print("Pre-processing complete. Every requirement is mapped into 'got_data.json'.")
