import google.generativeai as genai
import requests
import random
import re

# -----------------------------------------------
# CITY LANDMARKS DATABASE (expand as needed)
# -----------------------------------------------
CITY_LANDMARKS = {
    "guntur": [
        "Amaravathi Stupa",
        "Kondaveedu Fort",
        "Uppalapadu Bird Sanctuary",
        "Kotappakonda Temple",
        "Bhavani Island"
    ],
    "dhanbad": [
        "Maithon Dam",
        "Topchanchi Lake",
        "Birsa Munda Park",
        "Bhatinda Falls"
    ],
    "ranchi": [
        "Rock Garden Ranchi",
        "Hundru Falls",
        "Dassam Falls",
        "Tagore Hill",
        "Patratu Valley"
    ]
}


def normalize(text: str):
    """Normalize text for relevance matching."""
    return re.sub(r"[^a-z0-9 ]", "", text.lower())


class CityDescriptionAgent:
    """
    Generates:
    - Gemini description
    - Image using strict relevance rules
    """

    def __init__(self, gemini_api_key, unsplash_api_key, pexels_api_key):
        genai.configure(api_key=gemini_api_key)
        self.unsplash_api_key = unsplash_api_key
        self.pexels_api_key = pexels_api_key

    # ---------------------------------------------------
    # GEMINI DESCRIPTION
    # ---------------------------------------------------
    def _generate_description(self, city: str):
        try:
            model = genai.GenerativeModel("gemini-2.0-flash")
            prompt = (
                f"Write a warm, appealing, SEO-friendly travel description for '{city}'. "
                f"Highlight attractions, culture, vibes, and unique features. 2–4 sentences."
            )
            response = model.generate_content(prompt)

            if response and response.text:
                return response.text.strip()
        except:
            pass

        return f"{city} is a culturally rich destination with unique attractions."

    # ---------------------------------------------------
    # STRICT RELEVANCE CHECK
    # ---------------------------------------------------
    def _is_relevant(self, alt_text: str, city: str, landmark: str = None):
        if not alt_text:
            return False

        alt = normalize(alt_text)
        city = normalize(city)

        if city in alt:
            return True

        if landmark:
            landmark = normalize(landmark)
            if landmark in alt:
                return True

        return False

    # ---------------------------------------------------
    # PEXELS STRICT SEARCH
    # ---------------------------------------------------
    def _pexels_search(self, query: str, city: str, landmark: str = None):
        print(f"\n🔍 Pexels: {query}")

        try:
            url = (
                f"https://api.pexels.com/v1/search?"
                f"query={query}&orientation=landscape&per_page=10"
            )
            headers = {"Authorization": self.pexels_api_key}
            resp = requests.get(url, headers=headers, timeout=12)

            if resp.status_code != 200:
                return None

            photos = resp.json().get("photos", [])

            for p in photos:
                alt = p.get("alt", "")
                if self._is_relevant(alt, city, landmark):
                    print("✓ Relevant Pexels match:", alt)
                    return p["src"]["large"]

            print("❌ No relevant Pexels match.")
            return None

        except Exception as e:
            print("PEXELS ERROR:", e)
            return None

    # ---------------------------------------------------
    # UNSPLASH STRICT SEARCH
    # ---------------------------------------------------
    def _unsplash_search(self, query: str, city: str, landmark: str = None):
        print(f"\n🔍 Unsplash: {query}")

        try:
            url = (
                f"https://api.unsplash.com/search/photos?"
                f"query={query}&orientation=landscape&per_page=10"
            )
            headers = {"Authorization": f"Client-ID {self.unsplash_api_key}"}
            resp = requests.get(url, headers=headers, timeout=10)

            if resp.status_code != 200:
                return None

            results = resp.json().get("results", [])

            for r in results:
                alt = r.get("alt_description", "")
                if self._is_relevant(alt, city, landmark):
                    print("✓ Relevant Unsplash match:", alt)
                    return r["urls"]["regular"]

            print("❌ No relevant Unsplash match.")
            return None

        except Exception as e:
            print("UNSPLASH ERROR:", e)
            return None

    # ---------------------------------------------------
    # LANDMARK FALLBACK SEARCH
    # ---------------------------------------------------
    def _search_landmarks(self, city: str):
        print("\n🔁 City not found → Trying landmarks...")

        landmarks = CITY_LANDMARKS.get(city.lower(), [])

        for landmark in landmarks:
            print(f"🔍 Landmark search: {landmark}")

            img = self._pexels_search(landmark, city, landmark)
            if img:
                return {"source": "pexels-landmark", "image_url": img}

            img = self._unsplash_search(landmark, city, landmark)
            if img:
                return {"source": "unsplash-landmark", "image_url": img}

        return None

    # ---------------------------------------------------
    # FULL IMAGE FETCH PIPELINE
    # ---------------------------------------------------
    def _get_image_for_city(self, city: str):
        queries = [
            f"{city} skyline",
            f"{city} landmarks",
            f"{city} cityscape",
            city
        ]

        # 1️⃣ Try direct city images
        for q in queries:
            img = self._pexels_search(q, city)
            if img:
                return {"source": "pexels", "image_url": img}

            img = self._unsplash_search(q, city)
            if img:
                return {"source": "unsplash", "image_url": img}

        # 2️⃣ Try landmarks
        img = self._search_landmarks(city)
        if img:
            return img

        # 3️⃣ Fallback
        print("\n📸 Fallback image used.")
        return {
            "source": "fallback",
            "image_url": "https://images.unsplash.com/photo-1503264116251-35a269479413?q=80"
        }

    # ---------------------------------------------------
    # FINAL OUTPUT
    # ---------------------------------------------------
    def generate_city_info(self, city: str):
        return {
            "city": city,
            "description": self._generate_description(city),
            "image": self._get_image_for_city(city)
        }
