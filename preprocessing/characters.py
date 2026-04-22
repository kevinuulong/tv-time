import csv

FILE = "./preprocessing/data/characters.csv"
OUTPUT = ".preprocessing/data/out/characters_parsed.csv"

reader = None
with open(FILE, "r", newline="") as f:
    reader = csv.DictReader(f, fieldnames=["character", "code", "image"])

    with open(OUTPUT, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["character", "code", "image"])
        writer.writeheader()
        for i, line in enumerate(reader):
            if i != 0:
                line["code"] = line["code"].upper()
                writer.writerow(line)