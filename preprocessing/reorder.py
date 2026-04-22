import pandas as pd
import re

# 1. Load the files
# df_orig is the one with the stage directions and correct order
# df_clean is your current working file with cleaned names/text
df_orig = pd.read_csv('./preprocessing/data/ordered.csv')
df_clean = pd.read_csv('./preprocessing/data/cleaned.csv')

# 2. Normalize the Original Data to match your Cleaned Data format
def extract_number(text):
    # Finds the first number in a string (e.g., "e1-Winter" -> 1, "season-01" -> 1)
    match = re.search(r'\d+', str(text))
    return int(match.group()) if match else None

# Create temporary columns in the original data that look like the cleaned data
df_orig['norm_ep'] = df_orig['Episode'].apply(extract_number)
df_orig['norm_season'] = df_orig['Season'].apply(extract_number)

# 3. Prepare Chronological Map
df_orig['chron_order'] = range(len(df_orig))
df_orig['match_text'] = df_orig['Text'].str.strip()

# 4. Prepare Cleaned Data
df_clean['match_text'] = df_clean['Text'].str.strip()
# Ensure these are integers to match the normalized original columns
df_clean['Episode'] = df_clean['Episode'].astype(int)
df_clean['Season'] = df_clean['Season'].astype(int)

# 5. Perform the Merge
# We use our normalized columns to ensure e1 matches 1
df_synced = pd.merge(
    df_clean,
    df_orig[['match_text', 'norm_ep', 'norm_season', 'chron_order']],
    left_on=['match_text', 'Episode', 'Season'],
    right_on=['match_text', 'norm_ep', 'norm_season'],
    how='left'
)

# 6. Check for mismatches
missing = df_synced['chron_order'].isna().sum()
if missing > 0:
    print(f"Warning: {missing} lines could not be matched.")
    # Show a few examples of what failed to help us debug
    print(df_synced[df_synced['chron_order'].isna()][['Text', 'Episode', 'Season']].head())

# 7. Final Sort and Cleanup
df_final = df_synced.sort_values(by='chron_order').drop(columns=['match_text', 'norm_ep', 'norm_season', 'chron_order'])

# 8. Save
df_final.to_csv('./preprocessing/data/out/cleaned_ordered.csv', index=False)
print("Success! Your cleaned data is now chronologically ordered.")
