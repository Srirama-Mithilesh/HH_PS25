# Higher output tokens - Uses gemini-2.5-flash (2048 tokens)

import google.generativeai as genai
import requests
import random

class CityDescriptionAgent:
    """
    Generates a description and image for a given city using:
    1. Gemini (for description)
    2. Pexels (preferred for landscape photos)
    3. Unsplash (fallback)
    4. Placeholder fallback image
    """

    def __init__(self, gemini_api_key, unsplash_api_key, pexels_api_key):
        self.gemini_api_key = gemini_api_key
        self.unsplash_api_key = unsplash_api_key
        self.pexels_api_key = pexels_api_key

        genai.configure(api_key=gemini_api_key)

    # ---------------------------------------------------
    # 1️⃣ DESCRIPTION GENERATION
    # ---------------------------------------------------
    def _generate_description(self, city: str):
        print("\n============================================================")
        print(f"📝 Attempting to generate description with Gemini for city: {city}")
        print("============================================================")

        try:
            model = genai.GenerativeModel("gemini-2.0-flash")

            prompt = (
                f"Write a warm, appealing, SEO-friendly travel description for the city '{city}'. "
                f"Include highlights, vibes, and what makes it unique. 2–4 sentences."
            )

            response = model.generate_content(prompt)

            if response and response.text:
                print("✓ Gemini description generated")
                return response.text.strip()

            print("⚠ Gemini returned empty response. Using generic description.")
            return f"{city} is a beautiful destination known for unique attractions and vibrant culture."

        except Exception as e:
            print("⚠ Gemini unavailable:", e)
            print("✓ Using generic description template")
            return f"{city} is a beautiful destination with popular attractions and welcoming atmosphere."

    # ---------------------------------------------------
    # 2️⃣ IMAGE GENERATION (Pexels → Unsplash → Placeholder)
    # ---------------------------------------------------
    def _get_image_for_city(self, city: str):
        """
        Fetch best possible landscape-oriented image for the city.
        Priority:
        1. Pexels
        2. Unsplash
        3. Placeholder fallback
        """

        print("\n📸 Trying Pexels API (landscape preferred)...")

        # ---------- 1️⃣ TRY PEXELS FIRST ----------
        try:
            query = f"{city} skyline, famous landmarks, scenic landscape, travel photography, cityscape, daytime, vibrant, high-resolution"

            pexels_url = (
                f"https://api.pexels.com/v1/search?query={query}&orientation=landscape&per_page=5"
            )

            headers = {"Authorization": self.pexels_api_key}

            resp = requests.get(pexels_url, headers=headers, timeout=20)

            if resp.status_code == 200:
                data = resp.json()
                photos = data.get("photos", [])

                if photos:
                    # Pick a random landscape photo to avoid repetition
                    choice = random.choice(photos)
                    image_url = choice["src"]["large"]

                    print("✓ Landscape image fetched from Pexels")
                    return {
                        "source": "pexels",
                        "image_url": image_url
                    }

            print("⚠ No suitable Pexels image found. Falling back to Unsplash...")

        except Exception as e:
            print("⚠ Pexels API failed:", e)
            print("→ Falling back to Unsplash...")

        # ---------- 2️⃣ TRY UNSPLASH SECOND ----------
        try:
            print("\n📸 Trying Unsplash API (landscape preferred)...")

            unsplash_url = (
                f"https://api.unsplash.com/search/photos?query={city}"
                f"&orientation=landscape&per_page=5"
            )
            headers = {"Authorization": f"Client-ID {self.unsplash_api_key}"}

            resp = requests.get(unsplash_url, headers=headers, timeout=5)

            if resp.status_code == 200:
                results = resp.json().get("results", [])
                if results:
                    choice = random.choice(results)
                    image_url = choice["urls"]["regular"]

                    print("✓ Landscape image fetched from Unsplash")
                    return {
                        "source": "unsplash",
                        "image_url": image_url
                    }

            print("⚠ No Unsplash image found. Using fallback image...")

        except Exception as e:
            print("⚠ Unsplash API failed:", e)

        # ---------- 3️⃣ FALLBACK IMAGE ----------
        print("\n📸 Using fallback placeholder image...")
        fallback_url = (
            "https://images.unsplash.com/photo-1503264116251-35a269479413?q=80"
        )

        return {
            "source": "fallback",
            "image_url": fallback_url
        }

    # ---------------------------------------------------
    # 3️⃣ MAIN PUBLIC FUNCTION
    # ---------------------------------------------------
    def generate_city_info(self, city: str):
        """
        Returns:
        {
          "city": ...,
          "description": ...,
          "image": { "source": ..., "image_url": ... }
        }
        """

        description = self._generate_description(city)
        image = self._get_image_for_city(city)

        return {
            "city": city,
            "description": description,
            "image": image
        }
